'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// [STEP 1 EXERCISE] Model typed contracts shared with backend.
type AllocationRow = { amount: number; lockedBy: string | null };
type Presence = { participantId: string; name: string; focusedRow: string | null };

type Snapshot = {
  seq: number;
  allocations: Record<string, AllocationRow>;
  presence: Record<string, Presence>;
  hold: { reason: string; active: boolean } | null;
};

type RoomEvent = {
  seq: number;
  type: 'allocation.updated' | 'allocation.locked' | 'presence.updated' | 'compliance.hold';
  payload: Record<string, unknown>;
};

type ServerMessage =
  | { kind: 'snapshot'; snapshot: Snapshot }
  | { kind: 'event'; event: RoomEvent }
  | { kind: 'replay'; events: RoomEvent[] };

export default function DealRoomExercise() {
  const wsRef = useRef<WebSocket | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [lastSeq, setLastSeq] = useState(0);

  const participantId = useMemo(
    () => `user-${Math.random().toString(36).slice(2, 7)}`,
    []
  );

  // [STEP 2 EXERCISE] Open socket, handle snapshot/event/replay, cleanup.
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4010/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'presence',
          payload: { participantId, name: `Trader ${participantId.slice(-3)}`, focusedRow: null },
        })
      );
      ws.send(JSON.stringify({ type: 'resync', payload: { since: lastSeq } }));
    };

    ws.onmessage = (raw) => {
      const message = JSON.parse(raw.data) as ServerMessage;
      if (message.kind === 'snapshot') {
        setSnapshot(message.snapshot);
        setLastSeq(message.snapshot.seq);
      } else if (message.kind === 'event') {
        setLastSeq((prev) => Math.max(prev, message.event.seq));
      } else if (message.kind === 'replay') {
        const replayMax = message.events.reduce((max, evt) => Math.max(max, evt.seq), lastSeq);
        setLastSeq(replayMax);
      }
    };

    return () => ws.close();
  }, [participantId, lastSeq]);

  // [STEP 3 EXERCISE] Implement typed command helper and wire UI actions.
  function sendAction(message: {
    type: 'allocation-edit' | 'lock-toggle' | 'presence' | 'hold';
    payload: Record<string, unknown>;
  }) {
    wsRef.current?.send(JSON.stringify(message));
  }

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h1>Deal Room (Next.js + TypeScript scaffold)</h1>
      <p>Last sequence: {lastSeq}</p>

      <button
        onClick={() =>
          sendAction({
            type: 'hold',
            payload: { reason: 'MNPI review in progress', active: true },
          })
        }
      >
        Raise compliance hold
      </button>

      <pre>{JSON.stringify(snapshot, null, 2)}</pre>
    </main>
  );
}
