import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ManagerCommentModal } from "@/components/modals/ManagerCommentModal";
import { useTeamCheckinGoals, useManagerComment } from "@/hooks/useCheckins";
import type { ManagerCommentCreate, CheckInGoalRead } from "@/types";

export function ManagerCheckins() {
  const { data: goals, isLoading } = useTeamCheckinGoals();
  const submitComment = useManagerComment();

  const [activeGoal, setActiveGoal] = useState<CheckInGoalRead | null>(null);

  const handleCommentSubmit = (payload: ManagerCommentCreate) => {
    if (!activeGoal) return;
    submitComment.mutate(
      { goalId: activeGoal.goal_id, payload },
      {
        onSuccess: () => setActiveGoal(null),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
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
        <h1 className="text-3xl font-bold tracking-tight">Team Check-ins</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Team Goals Found</h2>
            <p className="text-muted-foreground">
              Your team hasn't been assigned any approved goals for the current check-in cycle yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group goals by employee
  const goalsByEmployee = goals.reduce((acc, goal) => {
    if (!acc[goal.owner_id]) {
      acc[goal.owner_id] = [];
    }
    acc[goal.owner_id].push(goal);
    return acc;
  }, {} as Record<string, CheckInGoalRead[]>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Check-ins</h1>
        <p className="text-muted-foreground">Review your team's progress and provide feedback.</p>
      </div>

      {Object.entries(goalsByEmployee).map(([employeeId, employeeGoals]) => (
        <div key={employeeId} className="space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">Employee: {employeeId}</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {employeeGoals.map((goal) => (
              <Card key={goal.goal_id} className="flex flex-col border-t-4 border-t-primary">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">{goal.thrust_area}</p>
                      <CardTitle className="text-base leading-tight">{goal.goal_title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3 mb-4 text-sm">
                    <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize
                        ${goal.checkin_status === 'completed' ? 'bg-green-100 text-green-700' : 
                          goal.checkin_status === 'on_track' ? 'bg-blue-100 text-blue-700' : 
                          'bg-gray-200 text-gray-700'}`}
                      >
                        {goal.checkin_status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-muted-foreground">Target:</span>
                      <span className="font-medium">{goal.target_value ?? "N/A"} {goal.uom_type === 'percentage' && goal.target_value !== null ? '%' : ''}</span>
                    </div>
                    <div className="flex justify-between px-1">
                      <span className="text-muted-foreground">Actual:</span>
                      <span className="font-medium">{goal.current_actual ?? "Not updated"} {goal.uom_type === 'percentage' && goal.current_actual !== null ? '%' : ''}</span>
                    </div>
                    
                    {goal.manager_comment && (
                      <div className="mt-4 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Your Comment
                        </p>
                        <p className="text-sm italic text-foreground/80 line-clamp-3">"{goal.manager_comment}"</p>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-auto"
                    onClick={() => setActiveGoal(goal)}
                  >
                    {goal.manager_comment ? "Edit Comment" : "Add Comment"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <ManagerCommentModal
        isOpen={!!activeGoal}
        onClose={() => setActiveGoal(null)}
        goal={activeGoal}
        onSubmit={handleCommentSubmit}
        isSubmitting={submitComment.isPending}
      />
    </div>
  );
}
