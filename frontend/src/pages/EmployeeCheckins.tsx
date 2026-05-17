import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckinModal } from "@/components/modals/CheckinModal";
import { useMyCheckinGoals, useLogCheckin } from "@/hooks/useCheckins";
import type { CheckInCreate, CheckInGoalRead } from "@/types";

export function EmployeeCheckins() {
  const { data: goals, isLoading } = useMyCheckinGoals();
  const logCheckin = useLogCheckin();

  const [activeGoal, setActiveGoal] = useState<CheckInGoalRead | null>(null);

  const handleCheckinSubmit = (payload: CheckInCreate) => {
    if (!activeGoal) return;
    logCheckin.mutate(
      { goalId: activeGoal.goal_id, payload },
      {
        onSuccess: () => setActiveGoal(null),
      }
    );
  };

  const formatTarget = (goal: CheckInGoalRead) => {
    switch (goal.uom_type) {
      case "percentage":
        return `${goal.direction === "min" ? "< " : "> "}${goal.target_value}%`;
      case "numeric":
        return `${goal.direction === "min" ? "Min" : "Max"} ${goal.target_value}`;
      case "timeline":
        return `By ${goal.target_date}`;
      case "zero":
        return "Yes/No";
      default:
        return "N/A";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[250px] w-full" />
          <Skeleton className="h-[250px] w-full" />
        </div>
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Check-ins</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Active Goals Found</h2>
            <p className="text-muted-foreground">
              You don't have any approved goals available for check-in during this cycle.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Quarterly Check-ins</h1>
      <p className="text-muted-foreground">Update your progress for Q{goals[0]?.quarter} {goals[0]?.year}.</p>

      <div className="grid gap-6 md:grid-cols-2">
        {goals.map((goal) => (
          <Card key={goal.goal_id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{goal.thrust_area}</p>
                  <CardTitle className="text-lg leading-tight">{goal.goal_title}</CardTitle>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                  ${goal.checkin_status === 'completed' ? 'bg-green-100 text-green-800' : 
                    goal.checkin_status === 'on_track' ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-800'}`}
                >
                  {goal.checkin_status.replace('_', ' ')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm font-medium">Target</span>
                  <span className="text-sm font-semibold">{formatTarget(goal)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm font-medium">Current Actual</span>
                  <span className="text-sm font-semibold">
                    {goal.current_actual ?? "Not updated"} {goal.uom_type === 'percentage' && goal.current_actual !== null ? '%' : ''}
                  </span>
                </div>
                {goal.manager_comment && (
                  <div className="bg-muted/50 p-3 rounded-md mt-4">
                    <p className="text-xs font-semibold mb-1">Manager's Comment:</p>
                    <p className="text-sm text-muted-foreground">{goal.manager_comment}</p>
                  </div>
                )}
              </div>
              <Button onClick={() => setActiveGoal(goal)} className="w-full mt-auto">
                Update Progress
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <CheckinModal
        isOpen={!!activeGoal}
        onClose={() => setActiveGoal(null)}
        goal={activeGoal}
        onSubmit={handleCheckinSubmit}
        isSubmitting={logCheckin.isPending}
      />
    </div>
  );
}
