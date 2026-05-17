import math

import pytest
from pydantic import ValidationError

from app.config import Settings
from app.schemas.auth import LoginRequest, RegisterRequest, TokenPair
from app.schemas.common import ApiResponse, ErrorResponse, PaginatedResponse, PaginationMeta
from app.schemas.item import ItemCreate, ItemRead


def test_api_response_success():
    payload = ApiResponse(data={"ok": True}, request_id="req-1")
    assert payload.success is True
    assert payload.data == {"ok": True}
    assert payload.request_id == "req-1"


def test_error_response_shape():
    payload = ErrorResponse(
        error={"code": "NOT_FOUND", "message": "Missing"},
        request_id="req-2",
    )
    assert payload.success is False
    assert payload.error.code == "NOT_FOUND"


def test_pagination_total_pages():
    meta = PaginationMeta(page=1, page_size=20, total=41)
    assert meta.total_pages == math.ceil(41 / 20)


def test_pagination_zero_total():
    meta = PaginationMeta(page=1, page_size=20, total=0)
    assert meta.total_pages == 0


def test_register_password_min_length():
    with pytest.raises(ValidationError):
        RegisterRequest(email="a@b.com", password="short", full_name="Test")


def test_item_create_defaults():
    item = ItemCreate(title="Hello")
    assert item.status == "draft"


def test_settings_ai_provider_validation():
    settings = Settings(ai_provider="mock")
    assert settings.ai_provider == "mock"

    with pytest.raises(ValidationError):
        Settings(ai_provider="invalid")  # type: ignore[arg-type]


def test_token_pair_literal():
    tokens = TokenPair(access_token="a", refresh_token="b")
    assert tokens.token_type == "bearer"


def test_login_request_valid():
    req = LoginRequest(email="user@example.com", password="secret")
    assert req.email == "user@example.com"


def test_paginated_response_generic():
    page = PaginatedResponse[ItemRead](
        data=[],
        meta=PaginationMeta(page=2, page_size=10, total=5),
    )
    assert page.meta.page == 2
    assert page.meta.total_pages == 1
