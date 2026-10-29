import psycopg
from pgvector.psycopg import register_vector

from .config import settings

SCHEMA = f"""
CREATE TABLE IF NOT EXISTS chunks (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  allowed_roles TEXT[] NOT NULL,
  embedding vector({settings.embed_dim})
);
CREATE INDEX IF NOT EXISTS chunks_emb_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE TABLE IF NOT EXISTS leave_balances (employee_id TEXT PRIMARY KEY, name TEXT, days_left INT);
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY, employee_id TEXT, title TEXT, description TEXT, status TEXT DEFAULT 'open');
CREATE TABLE IF NOT EXISTS pending_actions (
  id SERIAL PRIMARY KEY, user_id TEXT, role TEXT, tool TEXT, args JSONB, status TEXT DEFAULT 'pending');
"""


def init_db() -> None:
    with psycopg.connect(settings.database_url, autocommit=True) as c:
        c.execute("CREATE EXTENSION IF NOT EXISTS vector")
    with connect() as c:
        c.execute(SCHEMA)


def connect() -> psycopg.Connection:
    conn = psycopg.connect(settings.database_url, autocommit=True)
    register_vector(conn)
    return conn
