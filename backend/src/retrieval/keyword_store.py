from rank_bm25 import BM25Okapi
import pickle
import os
from src.core.config import settings

_bm25_cache = None
_documents_cache = None

def load_bm25_index():
    global _bm25_cache, _documents_cache
    if _bm25_cache is not None:
        return _bm25_cache, _documents_cache
        
    path = os.path.join(settings.chroma_persist_dir, "bm25_index.pkl")
    if not os.path.exists(path):
        return None, None
        
    with open(path, "rb") as f:
        data = pickle.load(f)
        _bm25_cache = data["bm25"]
        _documents_cache = data["documents"]
        return _bm25_cache, _documents_cache
