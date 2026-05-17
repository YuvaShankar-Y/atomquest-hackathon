import json

from fastapi import APIRouter, Query, Request
from sqlalchemy import func, select
from sse_starlette.sse import EventSourceResponse

from app.api.helpers import ok, paginated
from app.core.deps import CurrentUser, DbSession, OptionalUser
from app.db.models import AILog
from app.schemas.ai import AILogRead, AIProviderName, ChatRequest, ChatResponse, StreamChunk
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat", response_model=ApiResponse[ChatResponse])
async def chat(
    request: Request,
    body: ChatRequest,
    db: DbSession,
    user: OptionalUser,
) -> ApiResponse[ChatResponse]:
    service = AIService(db, user_id=user.id if user else None)
    result = await service.chat(body)
    return ok(request, result)


@router.post("/chat/stream")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    db: DbSession,
    user: OptionalUser,
) -> EventSourceResponse:
    service = AIService(db, user_id=user.id if user else None)
    request_id = getattr(request.state, "request_id", None)

    async def event_generator():
        try:
            async for delta in service.chat_stream(body):
                chunk = StreamChunk(delta=delta, done=False)
                yield {
                    "event": "message",
                    "data": json.dumps(chunk.model_dump()),
                }
            final = StreamChunk(delta="", done=True)
            yield {
                "event": "message",
                "data": json.dumps(final.model_dump()),
            }
        except Exception as exc:
            from app.core.exceptions import AppException

            if isinstance(exc, AppException):
                error_payload = {
                    "success": False,
                    "error": {
                        "code": exc.code.value,
                        "message": exc.message,
                        "details": exc.details,
                    },
                    "request_id": request_id,
                }
                yield {
                    "event": "error",
                    "data": json.dumps(error_payload),
                }
                return
            raise

    return EventSourceResponse(event_generator())


@router.get("/logs", response_model=PaginatedResponse[AILogRead])
async def list_ai_logs(
    request: Request,
    db: DbSession,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    provider: AIProviderName | None = None,
) -> PaginatedResponse[AILogRead]:
    filters = [AILog.user_id == user.id]
    if provider is not None:
        filters.append(AILog.provider == provider)

    total_result = await db.execute(select(func.count()).select_from(AILog).where(*filters))
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(AILog)
        .where(*filters)
        .order_by(AILog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    logs = result.scalars().all()
    return paginated(
        request,
        [AILogRead.model_validate(log) for log in logs],
        page=page,
        page_size=page_size,
        total=total,
    )
