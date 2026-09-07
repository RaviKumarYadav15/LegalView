def compute_rrf(dense_ranks, sparse_ranks, k=60):
    # Why RRF? Dense search (ChromaDB) and Sparse search (BM25) output completely different score scales.
    # RRF ignores the raw scores and only looks at the RANK (1st, 2nd, 3rd...).
    # Formula: Score = 1 / (k + Rank)
    
    rrf_scores = {}
    
    # Map documents to their RRF score
    for rank, doc in enumerate(dense_ranks):
        # We use doc.page_content as a unique key for simplicity
        content = doc.page_content
        if content not in rrf_scores:
            rrf_scores[content] = {'doc': doc, 'score': 0}
        rrf_scores[content]['score'] += 1 / (k + rank + 1)
        
    for rank, doc in enumerate(sparse_ranks):
        content = doc.page_content
        if content not in rrf_scores:
            rrf_scores[content] = {'doc': doc, 'score': 0}
        rrf_scores[content]['score'] += 1 / (k + rank + 1)
        
    # Sort documents by their combined RRF score in descending order
    sorted_docs = sorted(list(rrf_scores.values()), key=lambda x: x['score'], reverse=True)
    
    # Return just the document objects
    return [item['doc'] for item in sorted_docs]
