
"""Provider-agnostic chat via LiteLLM."""

import json
import re
import time

from .config import settings


def chat(messages: list[dict]) -> tuple[str, dict]:
    """Return model text and usage metrics."""
    import litellm

    start = time.perf_counter()

    resp = litellm.completion(
        model=settings.llm_model,
        messages=messages,
        temperature=0,
        max_tokens=256,
        timeout=60,
        extra_body={
            "keep_alive": "30m",
            "options": {
                "num_ctx": 4096,
            },
        },
    )

    latency = time.perf_counter() - start

    try:
        cost = litellm.completion_cost(completion_response=resp) or 0.0
    except Exception:
        cost = 0.0

    usage = getattr(resp, "usage", None)
    tokens = getattr(usage, "total_tokens", 0) or 0

    text = resp.choices[0].message.content or ""

    print(
        f"LLM model={settings.llm_model} "
        f"latency={latency:.2f}s tokens={tokens}"
    )

    return text, {
        "latency": latency,
        "cost": cost,
        "tokens": tokens,
    }


def parse_json(text: str) -> dict | None:
    """Parse a JSON object from a model response."""
    text = text.strip()

    # First, try parsing the entire response.
    try:
        result = json.loads(text)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    # Then try extracting a JSON object from surrounding text or Markdown.
    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        return None

    try:
        result = json.loads(match.group(0))
        return result if isinstance(result, dict) else None
    except json.JSONDecodeError:
        return None
