import json
import uuid
import struct
from src.retrieval.vector_store import embeddings
from redis.commands.search.field import VectorField, TextField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query
from src.core.config import settings
import redis.asyncio as aioredis

# We create an independent Redis connection for the semantic cache 
# to avoid circular imports and keep things decoupled.
redis_cache_client = aioredis.from_url(settings.redis_url, decode_responses=False)

INDEX_NAME = "idx:semantic_cache"
PREFIX = "semantic_cache:"

async def init_redis_semantic_index():
    try:
        await redis_cache_client.ft(INDEX_NAME).info()
    except Exception:
        # Index does not exist, let's create it
        dim = len(embeddings.embed_query("test"))
        
        schema = (
            TextField("query"),
            TextField("answer"),
            VectorField(
                "vector",
                "FLAT",
                {
                    "TYPE": "FLOAT32",
                    "DIM": dim,
                    "DISTANCE_METRIC": "COSINE"
                }
            )
        )
        
        definition = IndexDefinition(prefix=[PREFIX], index_type=IndexType.HASH)
        
        try:
            await redis_cache_client.ft(INDEX_NAME).create_index(fields=schema, definition=definition)
        except Exception as e:
            print(f"Error creating Semantic Cache index: {e}")

async def check_semantic_cache(query: str, threshold: float = 0.15):
    """
    Search for a semantically similar query in Redis.
    Cosine distance threshold: 0.05 means >= 95% similarity.
    """
    try:
        query_vector = embeddings.embed_query(query)
        # Convert floats to bytes natively without numpy
        vector_bytes = b"".join([struct.pack("f", val) for val in query_vector])
        
        q = (
            Query("*=>[KNN 1 @vector $vec_param AS vector_score]")
            .sort_by("vector_score")
            .return_fields("query", "answer", "vector_score")
            .paging(0, 1)
            .dialect(2)
        )
        
        results = await redis_cache_client.ft(INDEX_NAME).search(
            q, query_params={"vec_param": vector_bytes}
        )
        
        if results.docs:
            doc = results.docs[0]
            score = float(doc.vector_score)
            print(f'[SEMANTIC CACHE] Closest match distance: {score} (Threshold: {threshold})', flush=True)
            if score <= threshold:
                print(f'[SEMANTIC CACHE] HIT! Bypassing LLM.', flush=True)
                answer = doc.answer
                if isinstance(answer, bytes):
                    return answer.decode('utf-8')
                return answer
    except Exception as e:
        print(f"Semantic Cache check error: {e}")
        
    return None

async def save_to_semantic_cache(query: str, answer: str, ttl_seconds: int = 2592000):
    """
    Saves a query and its answer into Redis with a TTL of 30 days.
    """
    try:
        query_vector = embeddings.embed_query(query)
        vector_bytes = b"".join([struct.pack("f", val) for val in query_vector])
        
        doc_id = f"{PREFIX}{uuid.uuid4()}"
        
        mapping = {
            "query": query.encode('utf-8'),
            "answer": answer.encode('utf-8'),
            "vector": vector_bytes
        }
        
        await redis_cache_client.hset(doc_id, mapping=mapping)
        await redis_cache_client.expire(doc_id, ttl_seconds)
    except Exception as e:
        print(f"Semantic Cache save error: {e}")
