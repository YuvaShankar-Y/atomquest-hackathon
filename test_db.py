import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.db.models import GoalSheet

async def test():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(GoalSheet))
        sheets = result.scalars().all()
        print(f"Found {len(sheets)} sheets.")

asyncio.run(test())
