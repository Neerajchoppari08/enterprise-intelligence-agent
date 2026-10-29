"""Layered guardrails. Regex screening is a cheap FIRST layer, not a complete defense:
the real protections are access control in retrieval, tool authorization in code,
context isolation in the prompt, and the output filter."""
import re
from dataclasses import dataclass

INJECTION_PATTERNS = [
    r"ignore (all |any |the |your )?(previous|prior|above|earlier) (instructions|rules|prompts?)",
    r"disregard .{0,40}(instructions|rules|system prompt)",
    r"(reveal|show|print|repeat|output|display) .{0,30}(system prompt|hidden instructions|your instructions|internal reference)",
    r"you are now (in )?(developer|dan|jailbreak|unrestricted)",
    r"(act|pretend) as .{0,40}(without|no) (restrictions|rules|filters)",
    r"do anything now",
    r"<\s*/?\s*(system|assistant|context)\s*>",
    r"(bypass|override|disable) .{0,30}(guardrails?|safety|security|access control|approval)",
]
_COMPILED = [re.compile(p, re.I | re.S) for p in INJECTION_PATTERNS]


@dataclass
class GuardResult:
    allowed: bool
    reason: str = ""


def detect_injection(text: str) -> list[str]:
    return [p.pattern for p in _COMPILED if p.search(text)]


def screen_input(text: str) -> GuardResult:
    if detect_injection(text):
        return GuardResult(False, "possible prompt injection")
    return GuardResult(True)


def sanitize_chunks(chunks: list[dict]) -> tuple[list[dict], int]:
    """Indirect-injection defense: remove only the sentences that address the model, keep the rest
    of the chunk (dropping whole chunks would let an attacker delete legitimate content).
    Returns (cleaned_chunks, number_of_sentences_removed)."""
    cleaned, removed = [], 0
    for c in chunks:
        sentences = [s for s in re.split(r"(?<=[.!?])\s+|\n+", c["content"]) if s.strip()]
        kept = [s for s in sentences if not detect_injection(s)]
        removed += len(sentences) - len(kept)
        if kept:
            cleaned.append({**c, "content": " ".join(kept)})
    return cleaned, removed


def wrap_context(chunks: list[dict]) -> str:
    parts = [f'<doc id="{i}" source="{c["source"]}">\n{c["content"]}\n</doc>' for i, c in enumerate(chunks, 1)]
    return "<context>\n" + "\n".join(parts) + "\n</context>"


def citations_valid(answer: str, n_sources: int) -> bool:
    cited = {int(m) for m in re.findall(r"\[(\d+)\]", answer)}
    return bool(cited) and all(1 <= c <= n_sources for c in cited)


def leaked_secret(answer: str, secrets: list[str]) -> bool:
    return any(s and s in answer for s in secrets)
