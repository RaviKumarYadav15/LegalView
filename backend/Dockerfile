
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency resolution
RUN pip install uv

# Install CPU-only PyTorch first to save disk space
RUN uv pip install --system torch --index-url https://download.pytorch.org/whl/cpu

COPY pyproject.toml ./
RUN uv pip install --system -r pyproject.toml

COPY . .

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

