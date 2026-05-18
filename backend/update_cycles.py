import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import select, update
from app.db.session import AsyncSessionLocal
from app.db.models import GoalCycle

async def update_cycles():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(GoalCycle))
        cycles = result.scalars().all()
        count = 0
        for cycle in cycles:
            if "2025" in cycle.name:
                cycle.name = cycle.name.replace("2025", "2026")
                cycle.start_date = cycle.start_date.replace(year=cycle.start_date.year + 1)
                cycle.end_date = cycle.end_date.replace(year=cycle.end_date.year + 1)
                count += 1
        await session.commit()
        print(f"Updated {count} cycles in database")

asyncio.run(update_cycles())
