from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
import os

# Why: RecursiveCharacterTextSplitter is the industry standard.
# Instead of hard-cutting at exactly 1000 characters (which might cut a word in half),
# it tries to split at paragraphs (\n\n), then sentences (\n), then words.
# This keeps semantic meaning intact.
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, 
    chunk_overlap=200, # Overlap prevents context loss at the edges of chunks
    length_function=len
)

import re

def ingest_pdf(file_path: str):
    # 1. Load the PDF
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    
    # 2. Chunk the documents
    chunks = text_splitter.split_documents(documents)
    
    # 3. Enhance metadata with persistent legal context (Chapters and Sections)
    current_chapter = None
    current_section = None
    
    for chunk in chunks:
        text = chunk.page_content
        
        # Look for Chapter X in this chunk
        chapter_match = re.search(r'(?i)\b(Chapter\s+[IVXLCDM\d]+)\b', text)
        if chapter_match:
            current_chapter = chapter_match.group(1).title()
            
        # Look for Section Y in this chunk
        section_match = re.search(r'(?i)\b(Section\s+\d+[A-Z]?(?:\(\d+\))?(?:\([a-z]\))?)\b', text)
        if section_match:
            current_section = section_match.group(1).title()
            
        # Compile the legal meta based on what we have tracked so far
        parts = []
        if current_chapter:
            parts.append(current_chapter)
        if current_section:
            parts.append(current_section)
            
        legal_meta = " | ".join(parts) if parts else None
        
        # Attach to chunk metadata
        chunk.metadata["legal_meta"] = legal_meta
        
    return chunks
