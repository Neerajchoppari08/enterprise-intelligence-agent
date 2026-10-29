"""Pure helpers (no heavy imports) so they are easy to unit test."""


def chunk_text(text: str, size: int = 800, overlap: int = 120) -> list[str]:
    """Paragraph-aware chunking with character overlap."""
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks, cur = [], ""
    for p in paras:
        if cur and len(cur) + len(p) + 2 > size:
            chunks.append(cur)
            cur = (cur[-overlap:] + "\n\n" + p) if overlap else p
        else:
            cur = f"{cur}\n\n{p}" if cur else p
    if cur:
        chunks.append(cur)
    return chunks


def rrf(rankings: list[list[int]], k: int = 60) -> list[int]:
    """Reciprocal Rank Fusion over several ranked id lists."""
    scores: dict[int, float] = {}
    for ranking in rankings:
        for rank, item in enumerate(ranking):
            scores[item] = scores.get(item, 0.0) + 1.0 / (k + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)


def recall_at_k(ranked_sources: list[str], gold: list[str], k: int) -> float:
    return float(any(s in gold for s in ranked_sources[:k]))


def reciprocal_rank(ranked_sources: list[str], gold: list[str]) -> float:
    for i, s in enumerate(ranked_sources):
        if s in gold:
            return 1.0 / (i + 1)
    return 0.0


def percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    xs = sorted(values)
    return xs[min(len(xs) - 1, int(q * (len(xs) - 1) + 0.5))]
