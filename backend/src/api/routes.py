from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from src.retrieval.hybrid import hybrid_search
from src.generation.chains import generate_answer, rewrite_query
from src.api.auth import get_current_user, db
from fastapi_limiter.depends import RateLimiter
from src.core.config import settings
import redis
import json
import hashlib
import re

router = APIRouter()

# Synchronous Redis client for caching and chat history
redis_client = redis.Redis.from_url(settings.redis_url, decode_responses=True)

class QueryRequest(BaseModel):
    query: str
    session_id: str = "default_session"



# Rate Limit: Max 10 queries per minute per user/IP
@router.post("/query", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def handle_query(request: QueryRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["user_id"]
        is_guest = current_user["is_guest"]
        
        # Namespace keys by user_id for security
        history_key = f"chat_history:{user_id}:{request.session_id}"
        
        # Fetch conversation history from Redis
        raw_history = redis_client.lrange(history_key, 0, -1)
        # Parse history JSON strings into objects
        chat_history = [json.loads(msg) for msg in raw_history]

        # 0. Rewrite the query based on chat history so vector search can understand it
        standalone_query = rewrite_query(request.query, chat_history)
        print(f"Original Query: {request.query}")
        print(f"Rewritten Query: {standalone_query}")

        if standalone_query == "[GREETING]":
            answer = "Hello! I am LegalView, your AI legal assistant. How can I help you today?"
            chunks_data = []
            
        elif standalone_query == "[OFF_TOPIC]":
            answer = "I am specialized strictly in answering legal questions based on your provided documents. Please ask a legal-related query!"
            chunks_data = []
            
        else:
            # 1. Retrieve the top context chunks using RRF + Cross-Encoder
            top_chunks = hybrid_search(standalone_query)
            
            # Build string of chunks to format output and for hashing
            chunks_data = [
                {
                    "id": idx, 
                    "text": chunk.page_content, 
                    "score": chunk.metadata.get("rerank_score", 0.0),
                    "source": chunk.metadata.get("source", "Unknown Document").split("\\")[-1].split("/")[-1],
                    "page": chunk.metadata.get("page", 0) + 1,
                    "legal_meta": chunk.metadata.get("legal_meta")
                } 
                for idx, chunk in enumerate(top_chunks)
            ]

            # 2. Check Semantic / Exact Cache
            cache_content_string = request.query + json.dumps(chat_history) + json.dumps(chunks_data)
            query_hash = hashlib.md5(cache_content_string.encode('utf-8')).hexdigest()
            cache_key = f"llm_cache:{query_hash}"
            
            cached_answer = redis_client.get(cache_key)
            
            if cached_answer:
                answer = cached_answer
            else:
                answer = generate_answer(request.query, top_chunks, chat_history)
                redis_client.setex(cache_key, 86400, answer)

        # 3. Save this interaction to Redis Chat History (Expire after 1 hour)
        user_msg_dict = {"role": "user", "content": request.query}
        ai_msg_dict = {"role": "ai", "content": answer, "sources": chunks_data}
        
        redis_client.rpush(history_key, json.dumps(user_msg_dict))
        redis_client.rpush(history_key, json.dumps(ai_msg_dict))
        redis_client.expire(history_key, 3600)

        # 4. WRITE-THROUGH DB LOGIC: If not a guest, save permanently to Firestore
        if not is_guest and db is not None:
            doc_ref = db.collection('users').document(user_id).collection('sessions').document(request.session_id)
            # Add to messages subcollection
            messages_ref = doc_ref.collection('messages')
            
            # Use timestamp to maintain order
            import time
            timestamp = int(time.time() * 1000)
            
            messages_ref.add({
                **user_msg_dict,
                "timestamp": timestamp
            })
            messages_ref.add({
                **ai_msg_dict,
                "timestamp": timestamp + 1
            })

            # Save the session metadata
            session_metadata = {
                "updated_at": timestamp
            }
            # Set the title only if this is the first exchange
            if redis_client.llen(history_key) <= 2:
                session_metadata["title"] = request.query[:40] + ("..." if len(request.query) > 40 else "")

            doc_ref.set(session_metadata, merge=True)

        return {
            "answer": answer,
            "chunks": chunks_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def get_sessions(current_user: dict = Depends(get_current_user)):
    """Returns a list of all active chat sessions."""
    try:
        user_id = current_user["user_id"]
        is_guest = current_user["is_guest"]
        
        sessions = []
        
        if is_guest or db is None:
            # Guests only read from Redis
            keys = redis_client.keys(f"chat_history:{user_id}:*")
            for key in keys:
                session_id = key.split(f"chat_history:{user_id}:")[1]
                custom_title = redis_client.get(f"chat_title:{user_id}:{session_id}")
                
                title = custom_title if custom_title else "New Chat"
                if not custom_title:
                    first_msg_raw = redis_client.lindex(key, 0)
                    if first_msg_raw:
                        first_msg = json.loads(first_msg_raw)
                        title = first_msg.get("content", "New Chat")[:40] + "..."
                        
                sessions.append({"id": session_id, "title": title})
        else:
            # Permanent Users: Read from Firestore
            sessions_ref = db.collection('users').document(user_id).collection('sessions').order_by('updated_at', direction='DESCENDING')
            docs = sessions_ref.stream()
            
            for doc in docs:
                session_id = doc.id
                data = doc.to_dict()
                
                # Check redis first for custom title for speed, fallback to DB
                custom_title = redis_client.get(f"chat_title:{user_id}:{session_id}")
                title = custom_title if custom_title else data.get("title")
                
                # If STILL no title (from older sessions), fallback
                if not title:
                    title = "New Chat"
                
                sessions.append({"id": session_id, "title": title})
                
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}")
async def get_session_history(session_id: str, current_user: dict = Depends(get_current_user)):
    """Returns the full chat history (Cache-Aside Pattern)."""
    try:
        user_id = current_user["user_id"]
        is_guest = current_user["is_guest"]
        history_key = f"chat_history:{user_id}:{session_id}"
        
        # 1. Try to read from fast Redis cache first
        raw_history = redis_client.lrange(history_key, 0, -1)
        
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
                
                for idx, doc in enumerate(docs):
                    msg = doc.to_dict()
                    formatted_history.append({
                        "id": idx + 1,
                        "role": msg.get("role"),
                        "content": msg.get("content"),
                        "sources": msg.get("sources", [])
                    })
                    
                    # Rehydrate the cache by pushing back to Redis so next read is fast
                    redis_client.rpush(history_key, json.dumps(msg))
                    redis_client.expire(history_key, 3600)
                    
        return {"messages": formatted_history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RenameRequest(BaseModel):
    title: str

@router.put("/sessions/{session_id}/title")
async def rename_session(session_id: str, request: RenameRequest, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["user_id"]
        # Save title to fast Redis
        redis_client.set(f"chat_title:{user_id}:{session_id}", request.title)
        
        # Save permanently to Firestore
        if not current_user["is_guest"] and db is not None:
            db.collection('users').document(user_id).collection('sessions').document(session_id).set({
                "title": request.title
            }, merge=True)
            
        return {"status": "success", "title": request.title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, current_user: dict = Depends(get_current_user)):
    try:
        user_id = current_user["user_id"]
        # Delete from Redis
        redis_client.delete(f"chat_history:{user_id}:{session_id}")
        redis_client.delete(f"chat_title:{user_id}:{session_id}")
        
        # Delete from Firestore
        if not current_user["is_guest"] and db is not None:
            # Note: Deleting a document does not delete its subcollections in Firestore.
            db.collection('users').document(user_id).collection('sessions').document(session_id).delete()
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
