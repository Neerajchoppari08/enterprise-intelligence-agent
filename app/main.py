
"""FastAPI service.

NOTE: X-User-Id / X-Role headers are a DEMO stand-in for real auth.
Use JWT/SSO in production.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .agent import run_agent
from .db import connect, init_db
from .tools import PermissionDenied, User, execute

ROLES = {"employee", "hr", "finance"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Enterprise Intelligence Agent",
    lifespan=lifespan,
)

# Allow the local Next.js frontend to communicate with FastAPI.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ask")
def ask(
    req: AskRequest,
    x_user_id: str = Header(...),
    x_role: str = Header("employee"),
):
    if x_role not in ROLES:
        raise HTTPException(400, "unknown role")

    result = run_agent(req.question, x_user_id, x_role)

    return {
        "answer": result.get("answer"),
        "status": result.get("status"),
        "sources": [
            {"n": i, "source": chunk["source"]}
            for i, chunk in enumerate(result.get("ctx", []), 1)
        ],
        "pending_id": result.get("pending_id"),
        "metrics": result.get("metrics"),
    }


@app.post("/approvals/{pid}")
def decide(
    pid: int,
    approve: bool,
    x_user_id: str = Header(...),
    x_role: str = Header("employee"),
):
    with connect() as connection:
        row = connection.execute(
            """
            SELECT user_id, role, tool, args, status
            FROM pending_actions
            WHERE id = %s
            """,
            (pid,),
        ).fetchone()

        if not row or row[4] != "pending":
            raise HTTPException(
                status_code=404,
                detail="no pending action with that id",
            )

        owner, owner_role, tool, args, _ = row

        if owner != x_user_id and x_role != "hr":
            raise HTTPException(
                status_code=403,
                detail="only the requester or HR may decide",
            )

        if not approve:
            connection.execute(
                "UPDATE pending_actions SET status='rejected' WHERE id=%s",
                (pid,),
            )
            return {"status": "rejected"}

        try:
            result = execute(User(owner, owner_role), tool, args)
        except PermissionDenied as error:
            raise HTTPException(status_code=403, detail=str(error))

        connection.execute(
            "UPDATE pending_actions SET status='approved' WHERE id=%s",
            (pid,),
        )

    return {"status": "approved", "result": result}
