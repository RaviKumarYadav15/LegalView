from sentence_transformers import CrossEncoder

# Why a Cross-Encoder? Standard embeddings (Bi-Encoders) process the query and document separately.
# A Cross-Encoder processes them TOGETHER, which is much more accurate but very slow.
# Strategy: Use fast Bi-Encoders/BM25 to get top 100 docs, then use Cross-Encoder to re-rank just those 100.
reranker_model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

import math

def rerank_documents(query: str, documents: list, top_k: int = 5):
    if not documents:
        return []
        
    # Prepare pairs of (query, document_text)
    pairs = [[query, doc.page_content] for doc in documents]
    
    # Predict similarity scores
    scores = reranker_model.predict(pairs)
    
    # Attach scores to documents and sort
    doc_score_pairs = list(zip(documents, scores))
    doc_score_pairs.sort(key=lambda x: x[1], reverse=True)
    
    # The MS-MARCO CrossEncoder outputs raw logits (e.g. -5 to 5).
    # Apply a sigmoid function to convert the logit into a 0.0 -> 1.0 probability score.
    top_docs = []
    for doc, score in doc_score_pairs[:top_k]:
        prob = 1 / (1 + math.exp(-score))
        doc.metadata["rerank_score"] = float(prob)
        top_docs.append(doc)
        
    return top_docs
