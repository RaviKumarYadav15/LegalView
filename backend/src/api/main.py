from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
from contextlib import asynccontextmanager
from src.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Redis connection for Rate Limiting
    redis_connection = redis.from_url(settings.redis_url, encoding="utf-8")
    await FastAPILimiter.init(redis_connection)
    yield
    await redis_connection.close()

app = FastAPI(title="Standard RAG API", lifespan=lifespan)

# Allow the React frontend to talk to the FastAPI backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
