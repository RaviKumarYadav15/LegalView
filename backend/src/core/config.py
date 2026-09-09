from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openrouter_api_key: str = "dummy-key"
    chroma_persist_dir: str = "./data/chroma_db"
    raw_pdf_dir: str = "./data/raw_pdfs"
    embedding_model: str = "all-MiniLM-L6-v2"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    redis_url: str = "redis://localhost:6379"
    firebase_service_account_json: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()
