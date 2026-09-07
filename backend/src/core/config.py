import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "dummy-key")
    chroma_persist_dir: str = "./data/chroma_db"
    raw_pdf_dir: str = "./data/raw_pdfs"
    embedding_model: str = "all-MiniLM-L6-v2"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    class Config:
        env_file = ".env"

settings = Settings()

