from fastapi import APIRouter, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.helpers import ok, paginated
from app.core.deps import CurrentUser, DbSession
from app.core.errors import ErrorCode
from app.core.exceptions import AppException
from app.db.models import Item
from app.schemas.common import ApiResponse, DeleteData, PaginatedResponse
from app.schemas.item import ItemCreate, ItemRead, ItemStatus, ItemUpdate

router = APIRouter(prefix="/items", tags=["items"])


@router.get("", response_model=PaginatedResponse[ItemRead])
async def list_items(
    request: Request,
    db: DbSession,
    user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: ItemStatus | None = None,
) -> PaginatedResponse[ItemRead]:
    filters = [Item.owner_id == user.id]
    if status is not None:
        filters.append(Item.status == status)

    total_result = await db.execute(select(func.count()).select_from(Item).where(*filters))
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Item).where(*filters).order_by(Item.created_at.desc()).offset(offset).limit(page_size)
    )
    items = result.scalars().all()
    return paginated(
        request,
        [ItemRead.model_validate(item) for item in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.post("", response_model=ApiResponse[ItemRead], status_code=201)
async def create_item(
    request: Request,
    body: ItemCreate,
    db: DbSession,
    user: CurrentUser,
) -> ApiResponse[ItemRead]:
    item = Item(
        title=body.title,
        description=body.description,
        status=body.status,
        owner_id=user.id,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return ok(request, ItemRead.model_validate(item))


@router.get("/{item_id}", response_model=ApiResponse[ItemRead])
async def get_item(
    request: Request,
    item_id: str,
    db: DbSession,
    user: CurrentUser,
) -> ApiResponse[ItemRead]:
    item = await _get_owned_item(db, user.id, item_id)
    return ok(request, ItemRead.model_validate(item))


@router.patch("/{item_id}", response_model=ApiResponse[ItemRead])
async def update_item(
    request: Request,
    item_id: str,
    body: ItemUpdate,
    db: DbSession,
    user: CurrentUser,
) -> ApiResponse[ItemRead]:
    item = await _get_owned_item(db, user.id, item_id)
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    await db.flush()
    await db.refresh(item)
    return ok(request, ItemRead.model_validate(item))


@router.delete("/{item_id}", response_model=ApiResponse[DeleteData])
async def delete_item(
    request: Request,
    item_id: str,
    db: DbSession,
    user: CurrentUser,
) -> ApiResponse[DeleteData]:
    item = await _get_owned_item(db, user.id, item_id)
    await db.delete(item)
    return ok(request, DeleteData())


async def _get_owned_item(db: AsyncSession, owner_id: str, item_id: str) -> Item:
    result = await db.execute(select(Item).where(Item.id == item_id, Item.owner_id == owner_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise AppException(ErrorCode.NOT_FOUND, "Item not found")
    return item
