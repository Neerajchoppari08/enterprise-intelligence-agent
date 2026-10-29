"""Faithfulness (LLM-as-judge), latency and cost. Usage: python -m eval.faithfulness_eval eval/qa.jsonl
Spot-check ~20 judge verdicts by hand and say so in your README."""
import json
import sys
from pathlib import Path

from app.agent import run_agent
from app.llm import chat, parse_json
from app.utils import percentile

JUDGE = """You are a strict grader. Split ANSWER into factual claims and count how many are fully
supported by CONTEXT. Reply with JSON only: {"total": <int>, "supported": <int>}"""


def main(path: str = "eval/qa.jsonl") -> None:
    rows = [json.loads(l) for l in Path(path).read_text().splitlines() if l.strip()]
    rows = [r for r in rows if r.get("gold_docs")]
    sup = tot = 0
    lat, cost, detail = [], [], []
    for r in rows:
        res = run_agent(r["question"], r.get("user_id", "E001"), r.get("role", "employee"))
        ctx = "\n".join(c["content"] for c in res.get("ctx", []))
        text, _ = chat([{"role": "system", "content": JUDGE},
                        {"role": "user", "content": f"CONTEXT:\n{ctx}\n\nANSWER:\n{res.get('answer', '')}"}])
        v = parse_json(text) or {"total": 0, "supported": 0}
        sup += v.get("supported", 0)
        tot += v.get("total", 0)
        m = res.get("metrics", {})
        lat.append(m.get("latency", 0.0))
        cost.append(m.get("cost", 0.0))
        detail.append({"q": r["question"], "answer": res.get("answer"), "verdict": v})
    out = {
        "faithfulness": round(sup / tot, 3) if tot else None,
        "p50_latency_s": round(percentile(lat, 0.5), 2),
        "p95_latency_s": round(percentile(lat, 0.95), 2),
        "avg_cost_per_query_usd": round(sum(cost) / len(cost), 5) if cost else 0,
        "n": len(rows),
    }
    print(json.dumps(out, indent=2))
    Path("eval/results/faithfulness.json").write_text(json.dumps({"summary": out, "detail": detail}, indent=2))


if __name__ == "__main__":
    main(*sys.argv[1:])
