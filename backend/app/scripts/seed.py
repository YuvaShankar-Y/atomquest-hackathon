"""Seed demo data: admin, managers, employees, items, and AI logs."""

import asyncio
import logging
from datetime import date

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.models import AILog, GoalCycle, Item, User
from app.db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

DEMO_PASSWORD = "demo123"

DEMO_USERS = [
    {
        "key": "admin",
        "email": "admin@hackathon.dev",
        "full_name": "Admin User",
        "role": "admin",
        "manager_key": None,
    },
    {
        "key": "manager_1",
        "email": "manager1@hackathon.dev",
        "full_name": "Manager One",
        "role": "manager",
        "manager_key": None,
    },
    {
        "key": "manager_2",
        "email": "manager2@hackathon.dev",
        "full_name": "Manager Two",
        "role": "manager",
        "manager_key": None,
    },
    {
        "key": "employee_1",
        "email": "employee1@hackathon.dev",
        "full_name": "Employee One",
        "role": "employee",
        "manager_key": "manager_1",
    },
    {
        "key": "employee_2",
        "email": "employee2@hackathon.dev",
        "full_name": "Employee Two",
        "role": "employee",
        "manager_key": "manager_1",
    },
    {
        "key": "employee_3",
        "email": "employee3@hackathon.dev",
        "full_name": "Employee Three",
        "role": "employee",
        "manager_key": "manager_2",
    },
    {
        "key": "employee_4",
        "email": "employee4@hackathon.dev",
        "full_name": "Employee Four",
        "role": "employee",
        "manager_key": "manager_2",
    },
]

ITEM_STATUSES = ["draft", "active", "archived"]
AI_PROVIDERS = ["mock", "openai", "groq", "anthropic"]

GOAL_CYCLES = [
    {
        "name": "Goal Setting 2025",
        "phase": "goal_setting",
        "start_date": date(2025, 5, 1),
        "end_date": date(2025, 5, 31),
        "is_active": True,
    },
    {
        "name": "Q1 2025",
        "phase": "q1_checkin",
        "start_date": date(2025, 7, 1),
        "end_date": date(2025, 7, 31),
        "is_active": True,
    },
    {
        "name": "Q2 2025",
        "phase": "q2_checkin",
        "start_date": date(2025, 10, 1),
        "end_date": date(2025, 10, 31),
        "is_active": True,
    },
    {
        "name": "Q3 2025",
        "phase": "q3_checkin",
        "start_date": date(2026, 1, 1),
        "end_date": date(2026, 1, 31),
        "is_active": True,
    },
    {
        "name": "Q4 2025",
        "phase": "q4_checkin",
        "start_date": date(2026, 3, 1),
        "end_date": date(2026, 4, 30),
        "is_active": True,
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        existing_users = await session.scalar(select(func.count()).select_from(User)) or 0
        existing_cycles = await session.scalar(select(func.count()).select_from(GoalCycle)) or 0

        users_seeded = 0
        cycles_seeded = 0

        if existing_users == 0:
            users_by_key: dict[str, User] = {}
            users: list[User] = []
            for demo_user in DEMO_USERS:
                user = User(
                    email=demo_user["email"],
                    full_name=demo_user["full_name"],
                    role=demo_user["role"],
                    hashed_password=hash_password(DEMO_PASSWORD),
                    is_active=True,
                )
                session.add(user)
                users.append(user)
                users_by_key[demo_user["key"]] = user

            await session.flush()

            for demo_user in DEMO_USERS:
                manager_key = demo_user["manager_key"]
                if manager_key is None:
                    continue
                users_by_key[demo_user["key"]].manager_id = users_by_key[manager_key].id

            for index in range(1, 21):
                owner = users[(index - 1) % len(users)]
                session.add(
                    Item(
                        title=f"Demo Item {index}",
                        description=f"Seeded description for item {index}",
                        status=ITEM_STATUSES[index % len(ITEM_STATUSES)],
                        owner_id=owner.id,
                    )
                )

            for index in range(1, 11):
                owner = users[(index - 1) % len(users)]
                session.add(
                    AILog(
                        user_id=owner.id,
                        provider=AI_PROVIDERS[index % len(AI_PROVIDERS)],
                        model="gpt-4o-mini" if index % 2 == 0 else "llama-3.1-70b",
                        prompt_tokens=80 + index * 5,
                        completion_tokens=120 + index * 3,
                        latency_ms=200 + index * 15,
                    )
                )

            users_seeded = len(DEMO_USERS)
        else:
            logger.info("Users already seeded (%s users). Skipping user/item/log seed.", existing_users)

        if existing_cycles == 0:
            for cycle in GOAL_CYCLES:
                session.add(GoalCycle(**cycle))
            cycles_seeded = len(GOAL_CYCLES)
        else:
            logger.info("Goal cycles already seeded (%s cycles). Skipping cycle seed.", existing_cycles)

        if users_seeded == 0 and cycles_seeded == 0:
            logger.info("No seed changes were needed.")
            return

        await session.commit()
        logger.info(
            "Seeded %s users, %s cycles, 20 items, 10 AI logs. Login password: %s",
            users_seeded,
            cycles_seeded,
            DEMO_PASSWORD,
        )


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())


if __name__ == "__main__":
    main()
