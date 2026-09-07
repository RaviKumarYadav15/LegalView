# RAG Project Architecture & Strategy

This document outlines the architecture, standard folder structure, and ingestion strategies for your new RAG (Retrieval-Augmented Generation) project.

## 1. Tech Stack
*   **Frameworks:** FastAPI (API), LangChain (Orchestration)
*   **Database (Vector):** ChromaDB (for dense embeddings and semantic search)
*   **Database (Keyword):** BM25 / Rank-BM25 (for sparse/keyword search)
*   **Retrieval Strategy:** Hybrid Search using **RRF (Reciprocal Rank Fusion)** to combine ChromaDB + BM25 scores
*   **Reranking:** Cross-Encoder (e.g., `sentence-transformers/all-MiniLM-L6-v2` or BGE-Reranker) for precision sorting of RRF results
*   **Chunking:** LangChain `RecursiveCharacterTextSplitter`
*   **Containerization:** Docker & Docker Compose
*   **Dependency Management:** `uv` or `Poetry`

---

## 2. Standard Folder Structure

A standard, production-ready Python layout separating the core logic (`src`), data, APIs, and infrastructure.

```text
my-rag-project/
├── data/                      # Local storage (ignored in git)
│   ├── raw_pdfs/              # PDFs waiting to be ingested
│   └── chroma_db/             # Local ChromaDB persistence
├── src/                       # Core application code
│   ├── api/                   # FastAPI endpoints (routes)
│   │   ├── main.py            # FastAPI application instance
│   │   └── routes.py          # /upload, /query endpoints
│   ├── core/                  # Configuration & singletons
│   │   └── config.py          # Environment variables & settings
│   ├── ingestion/             # PDF loading and standard chunking
│   │   ├── loader.py          # PyPDFLoader or Unstructured integration
│   │   └── chunker.py         # RecursiveCharacterTextSplitter setup
│   ├── retrieval/             # Search logic
│   │   ├── vector_store.py    # ChromaDB initialization & queries
│   │   ├── keyword_store.py   # BM25 index management
│   │   ├── rrf.py             # Reciprocal Rank Fusion implementation
│   │   ├── reranker.py        # Cross-Encoder model integration
│   │   └── hybrid.py          # Master retrieval pipeline tying it all together
│   └── generation/            # LLM interaction
│       └── chains.py          # LangChain QA chains & prompts
├── tests/                     # Unit and integration tests
├── .env.example               # Example environment variables
├── .gitignore                 # Git ignore file
├── docker-compose.yml         # Multi-container orchestration (App + Optional DBs)
├── Dockerfile                 # Image definition for the FastAPI app
├── pyproject.toml             # Python dependencies (uv/poetry)
└── README.md                  # Project documentation
```

---

## 3. Simplified Ingestion & Chunking

Instead of building custom Regex rules, we will use industry-standard chunking based on character size and overlap. This is highly effective for general-purpose RAG.

**Standard Approach:**
1.  **Loader:** `PyPDFLoader` or `PyMuPDFLoader` (extracts text page by page).
2.  **Chunker:** `RecursiveCharacterTextSplitter`. It splits by paragraphs (`\n\n`), then sentences (`\n`), then words, ensuring that semantic boundaries are respected without needing custom regex.
    *   *Recommended Settings:* `chunk_size=1000`, `chunk_overlap=200`.
3.  **Indexing:** 
    *   Embed the chunks and store them in **ChromaDB**.
    *   Tokenize the chunks and update the **BM25** index.

---

## 3.5. Advanced Retrieval Pipeline (RRF & Cross-Encoder)

To maximize the accuracy of the retrieved context for the LLM, the retrieval pipeline will execute the following steps:

1.  **Parallel Search:** Query both ChromaDB (Semantic) and BM25 (Keyword) simultaneously, retrieving the top `K` candidates from each.
2.  **Reciprocal Rank Fusion (RRF):** Combine the two lists. RRF assigns a score to each document based on its rank in both lists: `score = 1 / (k + rank)`. This robustly merges sparse and dense search results without needing calibrated confidence scores.
3.  **Cross-Encoder Reranking:** Take the top `N` documents from the RRF output and pass them through a Cross-Encoder (like a HuggingFace `BGE-Reranker`). A Cross-Encoder processes the *(query, document)* pair together, outputting a highly accurate similarity score. We sort by this score to pick the absolute best context chunks.
4.  **Generation:** Feed the final, reranked top `X` chunks into the LLM.

---

## 4. PDF Ingestion Strategies

Here are different strategies for adding PDFs to your system, ordered from simplest to most advanced:

### A. CLI / Batch Script (Simplest)
*   **How it works:** You place PDFs in `data/raw_pdfs/`. You run a script like `python src/ingestion/run_batch.py`.
*   **Pros:** Very easy to build, great for static datasets or initial bootstrapping.
*   **Cons:** Requires developer intervention to add new files.

### B. API Upload Endpoint (Standard)
*   **How it works:** Create a FastAPI endpoint (`POST /api/v1/upload`). A frontend UI or script sends the PDF via a multipart form-data request. The API saves the file temporarily, chunk it, and indexes it.
*   **Pros:** Allows users to dynamically add files via a web UI.
*   **Cons:** Ingesting large PDFs synchronously might cause API timeouts.

### C. Background Worker / Queue (Production Ready)
*   **How it works:** The user uploads a PDF via the API. The API saves it and sends a task to a message queue (like Celery/Redis). A background worker picks up the PDF, processes it, and updates the database.
*   **Pros:** Highly scalable, no API timeouts, allows for progress tracking (e.g., "Indexing... 50%").
*   **Cons:** Requires extra infrastructure (Redis, Celery).

### D. Folder Watcher (Automated Local)
*   **How it works:** A lightweight background script uses a library like `watchdog` to monitor `data/raw_pdfs/`. As soon as you drag and drop a PDF into the folder, the script automatically ingests it.
*   **Pros:** Zero-click ingestion for local environments or shared network drives.
*   **Cons:** Harder to deploy in cloud environments compared to an API.

---

## 5. MCP Server Ideas (For Later)

An **MCP (Model Context Protocol) Server** allows standard AI Assistants (like Claude Desktop or Gemini) to securely interact with your local tools and data.

Once this RAG system is built, you could wrap it in an MCP server to give AI agents access to your documents.

**Potential MCP Tools you could expose:**
1.  `search_documents(query)`: The agent can pass a query and get back the most relevant hybrid-search chunks from your PDFs.
2.  `ingest_pdf(filepath)`: The agent can command your system to index a new PDF on your hard drive.
3.  `list_indexed_documents()`: The agent can see what PDFs are currently in the ChromaDB knowledge base.
4.  `get_document_summary(doc_id)`: Uses your RAG system to generate and return a high-level summary of a specific ingested document.

By building the MCP server, you turn your standalone RAG app into a reusable "brain" that any MCP-compatible AI can plug into!
