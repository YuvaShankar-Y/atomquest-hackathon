from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any
import uuid

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from app.core.middleware import get_current_user_id
from app.db.models import AuditLog, CheckIn, Goal, GoalSheet


def register_audit_listeners() -> None:
    @event.listens_for(Session, "before_flush")
    def before_flush(session: Session, _flush_context, _instances) -> None:
        changed_by = get_current_user_id()

        for obj in list(session.new):
            if isinstance(obj, CheckIn):
                if obj.id is None:
                    obj.id = str(uuid.uuid4())
                session.add(
                    AuditLog(
                        entity_type="check_in",
                        entity_id=obj.id,
                        action="create",
                        old_value=None,
                        new_value=_serialize_payload(_extract_values(obj)),
                        changed_by=changed_by,
                    )
                )

        for obj in list(session.dirty):
            if isinstance(obj, GoalSheet):
                change = _build_change_payload(obj)
                if change is not None:
                    session.add(
                        AuditLog(
                            entity_type="goal_sheet",
                            entity_id=obj.id,
                            action="update",
                            old_value=change["old_value"],
                            new_value=change["new_value"],
                            changed_by=changed_by,
                        )
                    )
            elif isinstance(obj, Goal):
                if _goal_is_auditable(obj):
                    change = _build_change_payload(obj)
                    if change is not None:
                        session.add(
                            AuditLog(
                                entity_type="goal",
                                entity_id=obj.id,
                                action="update",
                                old_value=change["old_value"],
                                new_value=change["new_value"],
                                changed_by=changed_by,
                            )
                        )
            elif isinstance(obj, CheckIn):
                change = _build_change_payload(obj)
                if change is not None:
                    session.add(
                        AuditLog(
                            entity_type="check_in",
                            entity_id=obj.id,
                            action="update",
                            old_value=change["old_value"],
                            new_value=change["new_value"],
                            changed_by=changed_by,
                        )
                    )


def _goal_is_auditable(goal: Goal) -> bool:
    sheet = goal.goal_sheet
    if sheet is None:
        return False
    return sheet.locked_at is not None or sheet.status == "approved"


def _build_change_payload(obj: Any) -> dict[str, dict] | None:
    state = inspect(obj)
    old_value: dict[str, Any] = {}
    new_value: dict[str, Any] = {}

    for attr in state.mapper.column_attrs:
        key = attr.key
        if key == "updated_at":
            continue
        history = state.attrs[key].history
        if not history.has_changes():
            continue
        old = history.deleted[0] if history.deleted else None
        new = history.added[0] if history.added else getattr(obj, key)
        old_value[key] = _serialize_value(old)
        new_value[key] = _serialize_value(new)

    if not old_value and not new_value:
        return None
    return {"old_value": old_value or None, "new_value": new_value or None}


def _extract_values(obj: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for attr in inspect(obj).mapper.column_attrs:
        if attr.key == "updated_at":
            continue
        payload[attr.key] = getattr(obj, attr.key)
    return payload


def _serialize_payload(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if payload is None:
        return None
    return {key: _serialize_value(value) for key, value in payload.items()}


def _serialize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _serialize_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    return value
