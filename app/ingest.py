"""Load markdown docs -> chunk -> embed -> store in pgvector.
Usage: python -m app.ingest [docs_dir]
Front matter (optional) sets who may read the doc:
---
allowed_roles: employee,hr,finance
---
"""
import sys
from pathlib import Path

from sentence_transformers import SentenceTransformer

from .config import settings
from .db import connect, init_db
from .utils import chunk_text


def parse_doc(path: Path) -> tuple[list[str], str]:
    raw = path.read_text(encoding="utf-8")
    roles = ["employee"]
    if raw.startswith("---"):
        _, front, raw = raw.split("---", 2)
        for line in front.splitlines():
            if line.startswith("allowed_roles:"):
                roles = [r.strip() for r in line.split(":", 1)[1].split(",") if r.strip()]
    return roles, raw.strip()


def main(docs_dir: str = "data/docs") -> None:
    init_db()
    model = SentenceTransformer(settings.embed_model)
    n = 0
    with connect() as conn:
        conn.execute("TRUNCATE chunks RESTART IDENTITY")
        for path in sorted(Path(docs_dir).glob("*.md")):
            roles, body = parse_doc(path)
            chunks = chunk_text(body)
            embs = model.encode(chunks, normalize_embeddings=True)
            for i, (text, emb) in enumerate(zip(chunks, embs)):
                conn.execute(
                    "INSERT INTO chunks (source, chunk_index, content, allowed_roles, embedding)"
                    " VALUES (%s, %s, %s, %s, %s)",
                    (path.name, i, text, roles, emb),
                )
                n += 1
        conn.execute("""
            INSERT INTO leave_balances VALUES ('E001','Asha',12),('E002','Ravi',5),('H001','Meera',20)
            ON CONFLICT (employee_id) DO NOTHING""")
    print(f"Ingested {n} chunks from {docs_dir}")


if __name__ == "__main__":
    main(*sys.argv[1:])
