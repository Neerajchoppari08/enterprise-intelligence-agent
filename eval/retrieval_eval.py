"""Compare dense / BM25 / hybrid / hybrid+rerank. Usage: python -m eval.retrieval_eval eval/qa.jsonl
Each line: {"question", "gold_docs": [...], "role"}. Relevance is doc-level (any chunk of a gold doc counts)."""
import json
import sys
from pathlib import Path

from app.retrieval import Retriever
from app.utils import recall_at_k, reciprocal_rank

K = 5


def main(path: str = "eval/qa.jsonl") -> None:
    rows = [json.loads(l) for l in Path(path).read_text().splitlines() if l.strip()]
    rows = [r for r in rows if r.get("gold_docs")]
    ret = Retriever()
    out = {}
    for mode in Retriever.MODES:
        rec, rr = [], []
        for r in rows:
            hits = ret.search(r["question"], r.get("role", "employee"), mode=mode, k=K)
            srcs = [h["source"] for h in hits]
            rec.append(recall_at_k(srcs, r["gold_docs"], K))
            rr.append(reciprocal_rank(srcs, r["gold_docs"]))
        out[mode] = {f"recall@{K}": round(sum(rec) / len(rec), 3), f"mrr@{K}": round(sum(rr) / len(rr), 3), "n": len(rows)}
    print(f"{'mode':<15}{'Recall@5':>10}{'MRR@5':>10}")
    for m, v in out.items():
        print(f"{m:<15}{v['recall@5']:>10}{v['mrr@5']:>10}")
    Path("eval/results/retrieval.json").write_text(json.dumps(out, indent=2))


if __name__ == "__main__":
    main(*sys.argv[1:])
