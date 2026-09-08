# LegalView - AI Legal Assistant

LegalView is a Retrieval-Augmented Generation (RAG) system specifically designed for interacting with and querying complex Indian legal documents (e.g., BNS 2023, Consumer Protection Act). It features a strict citation and grounding system designed to completely eliminate hallucinations.

## 🚀 Key Features

*   **Zero-Hallucination Prompting:** The LLM is strictly instructed to explicitly cite Sections, Chapters, and Acts inline, and mentally verify all claims against the retrieved context before generating a response.
*   **Hybrid Retrieval Pipeline:** Combines semantic search (ChromaDB) with keyword search (BM25) using Reciprocal Rank Fusion (RRF) to ensure no context is missed.
*   **Cross-Encoder Reranking:** Re-evaluates and sorts the RRF results using a HuggingFace cross-encoder for absolute precision.
*   **Real-time Streaming:** AI responses are streamed directly to the frontend using Server-Sent Events (SSE).
*   **Firebase Authentication:** Secure user authentication and session management using Google Firebase.
*   **Rate Limiting:** Protects the backend with Redis-backed rate limiting (Fixed Window algorithm).
*   **Modern Frontend:** Built with React, Vite, and Tailwind CSS v4, supporting both Light and Dark modes.

## 🛠️ Tech Stack

*   **Frontend:** React, Vite, Tailwind CSS v4, Lucide React
*   **Backend:** Python 3.11, FastAPI, LangChain, Uvicorn
*   **AI/LLM:** OpenRouter (GPT-4o-mini)
*   **Vector Database:** ChromaDB (Local)
*   **Keyword Index:** Rank-BM25
*   **Infrastructure:** Docker, Docker Compose, Redis

## 📂 Repository Structure

```text
LegalView/
├── backend/
│   ├── src/
│   │   ├── api/          # FastAPI routes, Auth, and Rate Limiting
│   │   ├── core/         # Config and environment setup
│   │   ├── generation/   # LLM interaction, Chains, and strict RAG prompts
│   │   ├── ingestion/    # PDF loading and Chunking (RecursiveCharacter)
│   │   └── retrieval/    # Vector/Keyword stores, Hybrid search, Reranking
│   ├── data/             # Local database storage (ignored in git)
│   ├── Dockerfile
│   └── requirements / pyproject
└── frontend/
    ├── src/
    │   ├── components/   # React UI components (Sidebar, ChatArea, etc.)
    │   ├── utils/        # Helpers (e.g., SSE parsing)
    │   ├── App.jsx       # Main application layout
    │   ├── Login.jsx     # Firebase auth screen
    │   └── index.css     # Tailwind v4 configuration and CSS variables
    ├── Dockerfile
    └── package.json
```

## ⚙️ Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RaviKumarYadav15/LegalView.git
   cd LegalView
   ```

2. **Backend Configuration:**
   Create a `.env` file in the `backend/` directory:
   ```env
   OPENROUTER_API_KEY=your_api_key_here
   REDIS_URL=redis://redis:6379
   ```
   *Note: You must also place your Firebase service account JSON key (`legalview-*.json`) in the `backend/` directory.*

3. **Frontend Configuration:**
   Create a `.env` file in the `frontend/` directory:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_FIREBASE_API_KEY=your_firebase_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   ```

4. **Launch with Docker Compose:**
   ```bash
   docker compose up -d --build
   ```

5. **Access the App:**
   - Frontend: `http://localhost:5173`
   - Backend API Docs: `http://localhost:8000/docs`

## ☁️ Deployment (AWS EC2)

To deploy to production on an EC2 instance:
1. SSH into your instance.
2. Clone the repo and set up your `.env` files and `legalview-*.json` file.
3. Update the `VITE_API_URL` in `frontend/.env` to point to your EC2 public IP or domain.
4. Run `docker compose up -d --build`.
