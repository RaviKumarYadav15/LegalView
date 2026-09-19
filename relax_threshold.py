import os

# 1. Update routes.py
routes_path = r"d:\PROJECTS\WORKING\standard-rag-project\backend\src\api\routes.py"
with open(routes_path, "r", encoding="utf-8") as f:
    routes_content = f.read()

# Change threshold from 0.05 to 0.15
routes_content = routes_content.replace(
    "cached_answer = await check_semantic_cache(standalone_query, threshold=0.05)",
    "cached_answer = await check_semantic_cache(standalone_query, threshold=0.15)"
)

with open(routes_path, "w", encoding="utf-8") as f:
    f.write(routes_content)

# 2. Update semantic_cache.py to add print statements for debugging the score
cache_path = r"d:\PROJECTS\WORKING\standard-rag-project\backend\src\retrieval\semantic_cache.py"
with open(cache_path, "r", encoding="utf-8") as f:
    cache_content = f.read()

old_check = """        if results.docs:
            doc = results.docs[0]
            score = float(doc.vector_score)
            if score <= threshold:
                # doc.answer comes back as bytes because decode_responses=False
                return doc.answer.decode('utf-8')"""

new_check = """        if results.docs:
            doc = results.docs[0]
            score = float(doc.vector_score)
            
            # Log the distance score to the terminal so we can see how similar they were
            print(f"\\n--- SEMANTIC CACHE ---")
            print(f"Closest match score (Distance): {score:.4f} (Threshold: {threshold})")
            
            if score <= threshold:
                print(f"CACHE HIT! Bypassing LLM.\\n----------------------\\n")
                # doc.answer comes back as bytes because decode_responses=False
                return doc.answer.decode('utf-8')
            else:
                print(f"CACHE MISS! Similarity not high enough.\\n----------------------\\n")"""

cache_content = cache_content.replace(old_check, new_check)

with open(cache_path, "w", encoding="utf-8") as f:
    f.write(cache_content)

print("done")
