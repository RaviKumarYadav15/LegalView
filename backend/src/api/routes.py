from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from src.retrieval.hybrid import hybrid_search
from src.generation.chains import rewrite_query, generate_answer_stream
from src.api.auth import get_current_user, db
from fastapi_limiter.depends import RateLimiter
from src.core.config import settings
from src.core.utils import basename
import redis
import json
import hashlib
import re

router = APIRouter()

# Synchronous Redis client for caching and chat history
import redis.asyncio as aioredis
redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)

class QueryRequest(BaseModel):
    query: str
    session_id: str = "default_session"



# Rate Limit: Max 10 queries per minute per user/IP

async def load_history(user_id: str, session_id: str) -> list:
    history_key = f"chat_history:{user_id}:{session_id}"
    raw_history = await redis_client.lrange(history_key, 0, -1)
    chat_history = []
    for msg in raw_history:
        try:
            chat_history.append(json.loads(msg))
        except json.JSONDecodeError:
            pass
    return chat_history

def is_greeting(query: str) -> bool:
    return "[GREETING]" in query.upper()

def is_off_topic(query: str) -> bool:
    return "[OFF_TOPIC]" in query.upper()

def truncate_title(text: str, max_length: int = 40) -> str:
    """Truncates text to max_length for sidebar titles."""
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(' ', 1)[0] + "..."

async def canned_reply(text: str):
    yield f"event: sources\ndata: []\n\n"
    yield f"event: chunk\ndata: {json.dumps(text)}\n\n"

async def answer_from_documents(request: QueryRequest, standalone_query: str, chat_history: list, user_id: str, is_guest: bool):
    top_chunks = hybrid_search(standalone_query)
    
    chunks_data = [
        {
            "id": idx, 
            "text": chunk.page_content, 
            "score": chunk.metadata.get("rerank_score", 0.0),
            "source": basename(chunk.metadata.get("source", "Unknown Document")),
            "page": chunk.metadata.get("page", 0) + 1,
            "legal_meta": chunk.metadata.get("legal_meta")
        } 
        for idx, chunk in enumerate(top_chunks)
    ]
    
    yield f"event: sources\ndata: {json.dumps(chunks_data)}\n\n"
    
    full_answer = ""
    cache_content_string = request.query + json.dumps(chat_history) + json.dumps(chunks_data)
    query_hash = hashlib.md5(cache_content_string.encode('utf-8')).hexdigest()
    cache_key = f"llm_cache:{query_hash}"
    
    cached_answer = await redis_client.get(cache_key)
    
    if cached_answer:
        full_answer = cached_answer
        yield f"event: chunk\ndata: {json.dumps(full_answer)}\n\n"
    else:
        async for chunk in generate_answer_stream(request.query, top_chunks, chat_history):
            full_answer += chunk
            yield f"event: chunk\ndata: {json.dumps(chunk)}\n\n"
        
        await redis_client.setex(cache_key, 86400, full_answer)

    # 3. Save this interaction to Redis Chat History (Expire after 1 hour)
    history_key = f"chat_history:{user_id}:{request.session_id}"
    user_msg_dict = {"role": "user", "content": request.query}
    ai_msg_dict = {"role": "ai", "content": full_answer, "sources": chunks_data}
    
    await redis_client.rpush(history_key, json.dumps(user_msg_dict))
    await redis_client.rpush(history_key, json.dumps(ai_msg_dict))
    await redis_client.expire(history_key, 3600)

    # 4. WRITE-THROUGH DB LOGIC: If not a guest, save permanently to Firestore
    if not is_guest and db is not None:
        doc_ref = db.collection('users').document(user_id).collection('sessions').document(request.session_id)
        messages_ref = doc_ref.collection('messages')
        
        import time
        timestamp = int(time.time() * 1000)
        
        await messages_ref.add({**user_msg_dict, "timestamp": timestamp})
        await messages_ref.add({**ai_msg_dict, "timestamp": timestamp + 1})

        session_metadata = {"updated_at": timestamp}
        if await redis_client.llen(history_key) <= 2:
            session_metadata["title"] = truncate_title(request.query)

        await doc_ref.set(session_metadata, merge=True)

@router.post("/query", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def handle_query(request: QueryRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["user_id"]
        is_guest = current_user["is_guest"]
        
        history = await load_history(user_id, request.session_id)
        standalone_query = rewrite_query(request.query, history)

        async def event_generator():
            try:
                if is_greeting(standalone_query):
                    answer = "Hello! I am LegalView, your AI legal assistant. How can I help you today?"
                    async for evt in canned_reply(answer): yield evt
                elif is_off_topic(standalone_query):
                    answer = "I am specialized strictly in answering legal questions based on your provided documents. Please ask a legal-related query!"
                    async for evt in canned_reply(answer): yield evt
                else:
                    async for evt in answer_from_documents(request, standalone_query, history, user_id, is_guest):
                        yield evt
                yield "event: done\ndata: {}\n\n"
            except Exception as e:
                yield f"event: error\ndata: {json.dumps(str(e))}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=traceback.format_exc())

@router.get("/sessions")
async def get_sessions(current_user: dict = Depends(get_current_user)):
    """Returns a list of all active chat sessions."""
    try:
        user_id = current_user["user_id"]
        is_guest = current_user["is_guest"]
        
        sessions = []
        
        if is_guest or db is None:
            # Guests only read from Redis
            keys = await redis_client.keys(f"chat_history:{user_id}:*")
            for key in keys:
                session_id = key.split(f"chat_history:{user_id}:")[1]
                custom_title = await redis_client.get(f"chat_title:{user_id}:{session_id}")
                
                title = custom_title if custom_title else "New Chat"
                if not custom_title:
                    first_msg_raw = await redis_client.lindex(key, 0)
                    if first_msg_raw:
                        first_msg = json.loads(first_msg_raw)
                        title = truncate_title(first_msg.get("content", "New Chat"))
                        
                sessions.append({"id": session_id, "title": title})
        else:
            # Permanent Users: Read from Firestore
            sessions_ref = db.collection('users').document(user_id).collection('sessions').order_by('updated_at', direction='DESCENDING')
            docs = sessions_ref.stream()
            
            async for doc in docs:
                session_id = doc.id
                data = doc.to_dict()
                
                # Check redis first for custom title for speed, fallback to DB
                custom_title = await redis_client.get(f"chat_title:{user_id}:{session_id}")
                title = custom_title if custom_title else data.get("title")
                
                # If STILL no title (from older sessions), fallback
                if not title:
                    title = "New Chat"
                
                sessions.append({"id": session_id, "title": title})
                
        return {"sessions": sessions}
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=traceback.format_exc())

@router.get("/sessions/{session_id}")
async def get_session_history(session_id: str, current_user: dict = Depends(get_current_user)):
    """Returns the full chat history (Cache-Aside Pattern)."""
    try:
        user_id = current_user["user_id"]
        is_guest = current_user["is_guest"]
        history_key = f"chat_history:{user_id}:{session_id}"
        
        # 1. Try to read from fast Redis cache first
        raw_history = await redis_client.lrange(history_key, 0, -1)
        
        formatted_history = []
        if raw_history:
            # Cache hit!
            for idx, msg_raw in enumerate(raw_history):
                msg = json.loads(msg_raw)
                formatted_history.append({
                    "id": idx + 1,
                    "role": msg.get("role"),
                    "content": msg.get("content"),
                    "sources": msg.get("sources", []) 
                })
        else:
            # Cache Miss! Read from Firestore (if not guest)
            if not is_guest and db is not None:
                messages_ref = db.collection('users').document(user_id).collection('sessions').document(session_id).collection('messages').order_by('timestamp')
                docs = messages_ref.stream()
                
                idx = 0
                async for doc in docs:
                    idx += 1
                    msg = doc.to_dict()
                    formatted_history.append({
                        "id": idx,
                        "role": msg.get("role"),
                        "content": msg.get("content"),
                        "sources": msg.get("sources", [])
                    })
                    
                    # Rehydrate the cache by pushing back to Redis so next read is fast
                    await redis_client.rpush(history_key, json.dumps(msg))
                    await redis_client.expire(history_key, 3600)
                    
        return {"messages": formatted_history}
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=traceback.format_exc())

class RenameRequest(BaseModel):
    title: str

@router.put("/sessions/{session_id}/title")
async def rename_session(session_id: str, request: RenameRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["user_id"]
        # Save title to fast Redis
        await redis_client.set(f"chat_title:{user_id}:{session_id}", request.title)
        
        # Save permanently to Firestore
        if not current_user["is_guest"] and db is not None:
            await db.collection('users').document(user_id).collection('sessions').document(session_id).set({
                "title": request.title
            }, merge=True)
            
        return {"status": "success", "title": request.title}
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=traceback.format_exc())

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["user_id"]
        # Delete from Redis
        await redis_client.delete(f"chat_history:{user_id}:{session_id}")
        await redis_client.delete(f"chat_title:{user_id}:{session_id}")
        
        # Delete from Firestore
        if not current_user["is_guest"] and db is not None:
            # Note: Deleting a document does not delete its subcollections in Firestore.
            await db.collection('users').document(user_id).collection('sessions').document(session_id).delete()
            
        return {"status": "success"}
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=traceback.format_exc())
