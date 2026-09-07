from src.retrieval.vector_store import get_vector_store
from src.retrieval.keyword_store import load_bm25_index
from src.retrieval.rrf import compute_rrf
from src.retrieval.reranker import rerank_documents
from langchain_core.documents import Document

def hybrid_search(query: str, k: int = 5):
    # 1. Vector Search
    vector_store = get_vector_store()
    dense_results = []
    if vector_store:
        dense_results = vector_store.similarity_search(query, k=20)
        
    # 2. BM25 Search
    bm25, documents = load_bm25_index()
    sparse_results = []
    if bm25 and documents:
        tokenized_query = query.lower().split()
        scores = bm25.get_scores(tokenized_query)
        # Get top 20
        top_n = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:20]
        sparse_results = [documents[i] for i in top_n]
        
    # If no data exists yet, return empty
    if not dense_results and not sparse_results:
        return []
        
    # 3. Reciprocal Rank Fusion
    fused_docs = compute_rrf(dense_results, sparse_results)
    
    # 4. Cross-Encoder Reranking
    final_docs = rerank_documents(query, fused_docs, top_k=k)
    
    return final_docs
