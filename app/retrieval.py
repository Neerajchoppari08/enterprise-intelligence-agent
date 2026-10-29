"""Dense (pgvector) + BM25 + RRF fusion + cross-encoder reranking.
Access control is enforced BEFORE ranking: a role never sees chunks it may not read."""
import re
from functools import lru_cache

from rank_bm25 import BM25Okapi

from .config import settings
from .db import connect
from .utils import rrf

QUERY_PREFIX = "Represent this sentence for searching relevant passages: "  # BGE query instruction


@lru_cache(maxsize=1)
def _embedder():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(settings.embed_model)


@lru_cache(maxsize=1)
def _reranker():
    from sentence_transformers import CrossEncoder
    return CrossEncoder(settings.rerank_model)


def _tok(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


class Retriever:
    MODES = ("dense", "bm25", "hybrid", "hybrid_rerank")

    def __init__(self) -> None:
        with connect() as conn:
            rows = conn.execute(
                "SELECT id, source, chunk_index, content, allowed_roles FROM chunks ORDER BY id"
            ).fetchall()
        self.rows = [dict(id=r[0], source=r[1], chunk_index=r[2], content=r[3], roles=r[4]) for r in rows]
        self.by_id = {r["id"]: r for r in self.rows}
        self.bm25 = BM25Okapi([_tok(r["content"]) for r in self.rows])

    def dense(self, query: str, role: str, k: int = 20) -> list[int]:
        q = _embedder().encode(QUERY_PREFIX + query, normalize_embeddings=True)
        with connect() as conn:
            rows = conn.execute(
                "SELECT id FROM chunks WHERE %s = ANY(allowed_roles) ORDER BY embedding <=> %s LIMIT %s",
                (role, q, k),
            ).fetchall()
        return [r[0] for r in rows]

    def keyword(self, query: str, role: str, k: int = 20) -> list[int]:
        scores = self.bm25.get_scores(_tok(query))
        ranked = sorted(
            ((s, r["id"]) for s, r in zip(scores, self.rows) if role in r["roles"] and s > 0),
            reverse=True,
        )
        return [i for _, i in ranked[:k]]

    def search(self, query: str, role: str, mode: str = "hybrid_rerank", k: int = 5, pool: int = 20) -> list[dict]:
        if mode == "dense":
            ids = self.dense(query, role, pool)
        elif mode == "bm25":
            ids = self.keyword(query, role, pool)
        else:
            ids = rrf([self.dense(query, role, pool), self.keyword(query, role, pool)])[:pool]
        if mode == "hybrid_rerank" and ids:
            scores = _reranker().predict([(query, self.by_id[i]["content"]) for i in ids])
            ids = [i for _, i in sorted(zip(scores, ids), reverse=True)]
        return [self.by_id[i] for i in ids[:k]]
