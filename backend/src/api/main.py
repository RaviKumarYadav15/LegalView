from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router
from src.retrieval.semantic_cache import init_redis_semantic_index
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Redis Semantic Cache index
    await init_redis_semantic_index()
    yield

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
