import os
import pickle
from rank_bm25 import BM25Okapi
from langchain_community.vectorstores import Chroma
from src.core.config import settings
from src.ingestion.chunker import ingest_pdf
from src.retrieval.vector_store import embeddings

def run_ingestion():
    raw_pdf_dir = settings.raw_pdf_dir
    if not os.path.exists(raw_pdf_dir):
        print(f"Directory {raw_pdf_dir} does not exist.")
        return
        
    all_chunks = []
    
    # 1. Process all PDFs
    for filename in os.listdir(raw_pdf_dir):
        if filename.endswith(".pdf"):
            file_path = os.path.join(raw_pdf_dir, filename)
            print(f"Ingesting {filename}...")
            chunks = ingest_pdf(file_path)
            all_chunks.extend(chunks)
            
    if not all_chunks:
        print("No PDFs found to ingest.")
        return
        
    print(f"Total chunks created: {len(all_chunks)}")
    
    # 2. Update ChromaDB
    print("Building ChromaDB vector index...")
    Chroma.from_documents(
        documents=all_chunks, 
        embedding=embeddings, 
        persist_directory=settings.chroma_persist_dir
    )
    
    # 3. Update BM25
    print("Building BM25 sparse index...")
    tokenized_corpus = [doc.page_content.lower().split() for doc in all_chunks]
    bm25 = BM25Okapi(tokenized_corpus)
    
    # Save BM25 to disk
    os.makedirs(settings.chroma_persist_dir, exist_ok=True)
    bm25_path = os.path.join(settings.chroma_persist_dir, "bm25_index.pkl")
    with open(bm25_path, "wb") as f:
        pickle.dump({"bm25": bm25, "documents": all_chunks}, f)
        
    print("Ingestion complete!")

if __name__ == "__main__":
    run_ingestion()

