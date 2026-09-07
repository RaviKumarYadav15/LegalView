from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from src.core.config import settings
import os

# Initialize the embedding model (runs locally)
embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model)

# Function to get the Chroma collection
def get_vector_store():
    # Only load if the directory exists and has files
    if not os.path.exists(settings.chroma_persist_dir) or not os.listdir(settings.chroma_persist_dir):
        return None
        
    return Chroma(
        persist_directory=settings.chroma_persist_dir,
        embedding_function=embeddings
    )
