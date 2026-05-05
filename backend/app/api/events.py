import asyncio
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

router = APIRouter(prefix="/events", tags=["events"])

# In-memory storage for active session signals (Redis would be better for production)
active_signals = {}

@router.get("/stream/{session_id}")
async def event_stream(request: Request, session_id: int):
    async def event_generator():
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            # Check if there's a signal for this session
            if session_id in active_signals:
                signal = active_signals.pop(session_id)
                yield {
                    "event": "signal",
                    "id": "message_id",
                    "retry": 15000,
                    "data": signal
                }
            
            await asyncio.sleep(2) # Poll every 2 seconds

    return EventSourceResponse(event_generator())

# Endpoint to trigger a signal (called by background tasks or analytics)
@router.post("/trigger/{session_id}")
async def trigger_signal(session_id: int, signal_type: str):
    active_signals[session_id] = signal_type
    return {"status": "triggered"}
