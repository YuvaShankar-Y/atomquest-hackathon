import asyncio
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])


class CounterBroadcaster:
    def __init__(self) -> None:
        self.count = 0
        self._connections: set[WebSocket] = set()
        self._task: asyncio.Task[None] | None = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._broadcast_loop())

    async def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
        await websocket.send_json(self._payload())

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections.discard(websocket)

    def _payload(self) -> dict[str, str | int]:
        return {
            "count": self.count,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    async def _broadcast_loop(self) -> None:
        while True:
            await asyncio.sleep(1)
            self.count += 1
            payload = self._payload()
            async with self._lock:
                connections = list(self._connections)

            stale: list[WebSocket] = []
            for connection in connections:
                try:
                    await connection.send_json(payload)
                except Exception:
                    stale.append(connection)

            if stale:
                async with self._lock:
                    for connection in stale:
                        self._connections.discard(connection)

    async def run_client_loop(self, websocket: WebSocket) -> None:
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            await self.disconnect(websocket)


counter_broadcaster = CounterBroadcaster()


@router.websocket("/counter")
async def counter_websocket(websocket: WebSocket) -> None:
    await counter_broadcaster.connect(websocket)
    try:
        await counter_broadcaster.run_client_loop(websocket)
    except WebSocketDisconnect:
        await counter_broadcaster.disconnect(websocket)
