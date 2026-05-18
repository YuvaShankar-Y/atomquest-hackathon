import asyncio
import os
import sys
from datetime import datetime, timezone, date

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models import User, GoalCycle, GoalSheet, Goal, CheckIn

async def seed_demo():
    async with AsyncSessionLocal() as session:
        # Get users
        users_result = await session.execute(select(User))
        users = {u.email: u for u in users_result.scalars().all()}
        
        emp1 = users.get("employee1@hackathon.dev")
        emp2 = users.get("employee2@hackathon.dev")
        
        if not emp1 or not emp2:
            print("Users not found, please run the main seed script first.")
            return

        # Get Goal Setting Cycle
        cycles_result = await session.execute(select(GoalCycle))
        cycles = cycles_result.scalars().all()
        
        goal_cycle = next((c for c in cycles if c.phase == "goal_setting"), None)
        q1_cycle = next((c for c in cycles if c.phase == "q1_checkin"), None)
        
        if not goal_cycle or not q1_cycle:
            print("Cycles not found.")
            return
            
        # Create Goal Sheets
        for emp, sheet_id in [(emp1, "demo-sheet-1"), (emp2, "demo-sheet-2")]:
            # Check if sheet exists
            sheet_exists = await session.execute(select(GoalSheet).where(GoalSheet.user_id == emp.id))
            if sheet_exists.scalar_one_or_none():
                print(f"Goal sheet for {emp.email} already exists. Skipping.")
                continue
                
            sheet = GoalSheet(
                id=sheet_id,
                user_id=emp.id,
                cycle_id=goal_cycle.id,
                status="approved",
                submitted_at=datetime.now(timezone.utc),
                approved_at=datetime.now(timezone.utc),
                locked_at=datetime.now(timezone.utc),
            )
            session.add(sheet)
            
            # Create goals for sheet
            if emp == emp1:
                g1 = Goal(goal_sheet_id=sheet.id, thrust_area="Revenue", title="Increase Q3 Sales by 15%", uom_type="percentage", direction="max", target_value=15, weightage=60)
                g2 = Goal(goal_sheet_id=sheet.id, thrust_area="Operations", title="Reduce Support TAT", description="Reduce turnaround time for support tickets to under 2 hours", uom_type="numeric", direction="min", target_value=2, weightage=20)
                g3 = Goal(goal_sheet_id=sheet.id, thrust_area="Safety", title="Zero workplace incidents", uom_type="zero", weightage=20)
                session.add_all([g1, g2, g3])
                await session.flush()
                
                # Checkins for Q1
                c1 = CheckIn(goal_id=g1.id, quarter=1, year=2026, updated_by=emp.id, actual_value=10, status="on_track", manager_comment="Good progress, keep pushing the sales team.")
                c2 = CheckIn(goal_id=g2.id, quarter=1, year=2026, updated_by=emp.id, actual_value=2.5, status="not_started", manager_comment="Let's focus on this next month.")
                c3 = CheckIn(goal_id=g3.id, quarter=1, year=2026, updated_by=emp.id, actual_value=0, status="completed", manager_comment="Excellent safety record.")
                session.add_all([c1, c2, c3])

            elif emp == emp2:
                g1 = Goal(goal_sheet_id=sheet.id, thrust_area="Engineering", title="Complete Phase 2 API Migration", uom_type="timeline", target_date=date(2026, 8, 30), weightage=50)
                g2 = Goal(goal_sheet_id=sheet.id, thrust_area="Quality", title="Achieve 95% test coverage", uom_type="percentage", direction="max", target_value=95, weightage=50)
                session.add_all([g1, g2])
                await session.flush()
                
                # Checkins for Q1
                c1 = CheckIn(goal_id=g1.id, quarter=1, year=2026, updated_by=emp.id, status="on_track", actual_value=0, manager_comment="On track for August delivery.")
                session.add_all([c1])

        await session.commit()
        print("Successfully seeded demo data for judges!")

if __name__ == "__main__":
    asyncio.run(seed_demo())
