import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load variables from the project's .env file
load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5433/eia"
    )
    embed_model: str = os.getenv(
        "EMBED_MODEL",
        "BAAI/bge-small-en-v1.5"
    )
    embed_dim: int = int(os.getenv("EMBED_DIM", "384"))
    rerank_model: str = os.getenv(
        "RERANK_MODEL",
        "cross-encoder/ms-marco-MiniLM-L-6-v2"
    )
    llm_model: str = os.getenv(
        "LLM_MODEL",
        "ollama/llama3.2:3b"
    )
    canary: str = os.getenv("CANARY", "CANARY-7f3a91")


settings = Settings()

