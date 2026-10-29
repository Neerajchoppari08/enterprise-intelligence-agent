"""Business tools. Authorization is enforced HERE, in code, never by the LLM."""
from dataclasses import dataclass
from typing import Callable

from .db import connect


@dataclass(frozen=True)
class User:
    id: str
    role: str


class PermissionDenied(Exception):
    pass


def get_leave_balance(user: User, args: dict) -> dict:
    target = args.get("target_employee_id") or user.id
    with connect() as c:
        row = c.execute("SELECT name, days_left FROM leave_balances WHERE employee_id=%s", (target,)).fetchone()
    return {"employee_id": target, "name": row[0], "days_left": row[1]} if row else {"error": "employee not found"}


def create_ticket(user: User, args: dict) -> dict:
    title = str(args.get("title", ""))[:200]
    desc = str(args.get("description", ""))[:2000]
    with connect() as c:
        tid = c.execute(
            "INSERT INTO tickets (employee_id, title, description) VALUES (%s,%s,%s) RETURNING id",
            (user.id, title, desc),
        ).fetchone()[0]
    return {"ticket_id": tid, "status": "open"}


@dataclass(frozen=True)
class ToolSpec:
    fn: Callable[[User, dict], dict]
    sensitive: bool          # sensitive tools never run without human approval
    roles: frozenset


TOOLS = {
    "get_leave_balance": ToolSpec(get_leave_balance, False, frozenset({"employee", "hr", "finance"})),
    "create_ticket": ToolSpec(create_ticket, True, frozenset({"employee", "hr", "finance"})),
}


def authorize(user: User, tool: str, args: dict) -> ToolSpec:
    spec = TOOLS.get(tool)
    if spec is None:
        raise PermissionDenied(f"unknown tool '{tool}'")
    if user.role not in spec.roles:
        raise PermissionDenied(f"role '{user.role}' may not use {tool}")
    if tool == "get_leave_balance":
        target = args.get("target_employee_id")
        if target and target != user.id and user.role != "hr":
            raise PermissionDenied("you may only view your own leave balance")
    return spec


def execute(user: User, tool: str, args: dict) -> dict:
    spec = authorize(user, tool, args)   # re-check at execution time
    return spec.fn(user, args)
