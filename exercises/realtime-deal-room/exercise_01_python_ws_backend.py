"""[STEP 0 CONTEXT]
Guided exercise: implement a small deal-room WebSocket backend in Python.

Run target (optional, after filling blanks):
  uvicorn exercise_01_python_ws_backend:app --reload --port 4010
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()


# [STEP 1 EXERCISE] Define core room state types.
# Goal:
# - Track a global sequence counter (`seq`)
# - Keep `allocations`, `presence`, optional `hold`, and append-only `log`
# - Keep active websocket clients in `connections`
@dataclass
class RoomState:
    seq: int = 0
    allocations: dict[str, dict[str, Any]] = field(
        default_factory=lambda: {
            "ALPHA_CAP": {"amount": 75_000_000, "lockedBy": None},
            "BRAVO_AM": {"amount": 50_000_000, "lockedBy": None},
        }
    )
    presence: dict[str, dict[str, Any]] = field(default_factory=dict)
    hold: dict[str, Any] | None = None
    log: list[dict[str, Any]] = field(default_factory=list)
    connections: set[WebSocket] = field(default_factory=set)


room = RoomState()


def append_event(event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    """[STEP 2 EXERCISE] Increment seq and append to log."""
    room.seq += 1
    event = {"seq": room.seq, "type": event_type, "payload": payload}
    room.log.append(event)
    return event


def snapshot() -> dict[str, Any]:
    """[STEP 3 EXERCISE] Return current materialized view."""
    return {
        "seq": room.seq,
        "allocations": room.allocations,
        "presence": room.presence,
        "hold": room.hold,
    }


async def broadcast(msg: dict[str, Any]) -> None:
    """[STEP 4 EXERCISE] Fan out a JSON message to all connected clients."""
    stale: list[WebSocket] = []
    for ws in room.connections:
        try:
            await ws.send_json(msg)
        except RuntimeError:
            stale.append(ws)
    for ws in stale:
        room.connections.discard(ws)


def apply_action(action: dict[str, Any]) -> dict[str, Any] | None:
    """[STEP 5 EXERCISE] Map typed client actions into room events.

    Supported action["type"]:
      - allocation-edit { investor, amount, participantId }
      - lock-toggle { investor, lock, participantId }
      - presence { participantId, name, focusedRow }
      - hold { reason, active }
    """
    kind = action.get("type")
    payload = action.get("payload", {})

    if kind == "allocation-edit":
        investor = payload["investor"]
        row = room.allocations.setdefault(investor, {"amount": 0, "lockedBy": None})
        row["amount"] = int(payload["amount"])
        return append_event("allocation.updated", payload)

    if kind == "lock-toggle":
        investor = payload["investor"]
        row = room.allocations.setdefault(investor, {"amount": 0, "lockedBy": None})
        row["lockedBy"] = payload["participantId"] if payload.get("lock") else None
        return append_event("allocation.locked", payload)

    if kind == "presence":
        participant = payload["participantId"]
        room.presence[participant] = payload
        return append_event("presence.updated", payload)

    if kind == "hold":
        room.hold = payload if payload.get("active") else None
        return append_event("compliance.hold", payload)

    return None


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    """[STEP 6 EXERCISE] Wire up connect/snapshot/replay/action loop.

    Protocol:
      - server -> client: { kind: "snapshot", snapshot: ... }
      - client -> server: { type: "resync", payload: { since: number } }
      - server -> client: { kind: "replay", events: [...] }
      - client -> server: action objects handled by apply_action
    """
    await ws.accept()
    room.connections.add(ws)
    await ws.send_json({"kind": "snapshot", "snapshot": snapshot()})

    try:
        while True:
            msg = await ws.receive_json()

            if msg.get("type") == "resync":
                since = int(msg.get("payload", {}).get("since", 0))
                missed = [evt for evt in room.log if evt["seq"] > since]
                await ws.send_json({"kind": "replay", "events": missed})
                continue

            event = apply_action(msg)
            if event is not None:
                await broadcast({"kind": "event", "event": event})
    except WebSocketDisconnect:
        room.connections.discard(ws)
