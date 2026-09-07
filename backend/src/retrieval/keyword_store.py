from rank_bm25 import BM25Okapi
import pickle
import os
from src.core.config import settings

def load_bm25_index():
    path = os.path.join(settings.chroma_persist_dir, "bm25_index.pkl")
    if not os.path.exists(path):
        return None, None
        
    with open(path, "rb") as f:
        data = pickle.load(f)
        return data["bm25"], data["documents"]
