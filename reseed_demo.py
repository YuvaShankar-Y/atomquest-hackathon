import asyncio
import os
import sys
from datetime import datetime, timezone, date

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, delete
from app.db.models import User, GoalCycle, GoalSheet, Goal, CheckIn

async def reseed_demo():
    async with AsyncSessionLocal() as session:
        print("Deleting existing goal sheets...")
        await session.execute(delete(GoalSheet))
        await session.commit()
        
        # Get users
        users_result = await session.execute(select(User))
        users = {u.email: u for u in users_result.scalars().all()}
        
        e2 = users.get("employee2@hackathon.dev")
        e3 = users.get("employee3@hackathon.dev")
        e4 = users.get("employee4@hackathon.dev")
        
        # Get Goal Setting Cycle
        cycles_result = await session.execute(select(GoalCycle))
        cycles = cycles_result.scalars().all()
        goal_cycle = next((c for c in cycles if c.phase == "goal_setting"), None)
        q1_cycle = next((c for c in cycles if c.phase == "q1_checkin"), None)
        
        # 1. Employee 2: SUBMITTED sheet (for Manager 1 to approve)
        s2 = GoalSheet(
            user_id=e2.id, cycle_id=goal_cycle.id, status="submitted", 
            submitted_at=datetime.now(timezone.utc)
        )
        session.add(s2)
        await session.flush()
        
        g2_1 = Goal(goal_sheet_id=s2.id, thrust_area="Engineering", title="Complete Phase 2 API Migration", uom_type="timeline", target_date=date(2026, 8, 30), weightage=50)
        g2_2 = Goal(goal_sheet_id=s2.id, thrust_area="Quality", title="Achieve 95% test coverage", uom_type="percentage", direction="max", target_value=95, weightage=50)
        session.add_all([g2_1, g2_2])
        
        # 2. Employee 3: APPROVED sheet with CHECKINS (for Manager 2 to review)
        s3 = GoalSheet(
            user_id=e3.id, cycle_id=goal_cycle.id, status="approved",
            submitted_at=datetime.now(timezone.utc), approved_at=datetime.now(timezone.utc), locked_at=datetime.now(timezone.utc)
        )
        session.add(s3)
        await session.flush()
        
        g3_1 = Goal(goal_sheet_id=s3.id, thrust_area="Revenue", title="Increase Q3 Sales by 15%", uom_type="percentage", direction="max", target_value=15, weightage=60)
        g3_2 = Goal(goal_sheet_id=s3.id, thrust_area="Operations", title="Reduce Support TAT", description="Reduce turnaround time for support tickets to under 2 hours", uom_type="numeric", direction="min", target_value=2, weightage=20)
        g3_3 = Goal(goal_sheet_id=s3.id, thrust_area="Safety", title="Zero workplace incidents", uom_type="zero", weightage=20)
        session.add_all([g3_1, g3_2, g3_3])
        await session.flush()
        
        c3_1 = CheckIn(goal_id=g3_1.id, quarter=1, year=2026, updated_by=e3.id, actual_value=10, status="on_track", manager_comment="Good progress, keep pushing the sales team.")
        c3_2 = CheckIn(goal_id=g3_2.id, quarter=1, year=2026, updated_by=e3.id, actual_value=2.5, status="not_started", manager_comment="Let's focus on this next month.")
        c3_3 = CheckIn(goal_id=g3_3.id, quarter=1, year=2026, updated_by=e3.id, actual_value=0, status="completed", manager_comment="Excellent safety record.")
        session.add_all([c3_1, c3_2, c3_3])

        # 3. Employee 4: APPROVED sheet with NO checkins (to show incomplete checkins in Admin dashboard)
        s4 = GoalSheet(
            user_id=e4.id, cycle_id=goal_cycle.id, status="approved",
            submitted_at=datetime.now(timezone.utc), approved_at=datetime.now(timezone.utc), locked_at=datetime.now(timezone.utc)
        )
        session.add(s4)
        await session.flush()
        
        g4_1 = Goal(goal_sheet_id=s4.id, thrust_area="HR", title="Hire 5 new engineers", uom_type="numeric", direction="max", target_value=5, weightage=100)
        session.add_all([g4_1])
        
        await session.commit()
        print("Successfully re-seeded perfect demo scenarios!")

if __name__ == "__main__":
    asyncio.run(reseed_demo())
