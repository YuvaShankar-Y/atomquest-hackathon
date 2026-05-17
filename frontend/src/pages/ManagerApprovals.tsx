import { useState } from "react";
import { CheckCircle, XCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ManagerEditGoalModal } from "@/components/modals/ManagerEditGoalModal";
import {
  useTeamGoalSheets,
  useApproveSheet,
  useReworkSheet,
  useManagerEditGoal,
} from "@/hooks/useApprovals";
import type { ApprovalGoalEditRequest, GoalRead, GoalSheetDetailRead } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ManagerApprovals() {
  const { data: sheets, isLoading } = useTeamGoalSheets();
  const approveSheet = useApproveSheet();
  const reworkSheet = useReworkSheet();
  const editGoal = useManagerEditGoal();

  const [editingGoal, setEditingGoal] = useState<{ sheetId: string; goal: GoalRead } | null>(null);

  const handleApprove = (sheetId: string) => {
    approveSheet.mutate(sheetId);
  };

  const handleRework = (sheetId: string) => {
    reworkSheet.mutate(sheetId);
  };

  const handleEditSubmit = (payload: ApprovalGoalEditRequest) => {
    if (!editingGoal) return;
    editGoal.mutate(
      { sheetId: editingGoal.sheetId, goalId: editingGoal.goal.id, payload },
      {
        onSuccess: () => setEditingGoal(null),
      }
    );
  };

  const formatTarget = (goal: GoalRead) => {
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
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!sheets || sheets.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Team Approvals</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Goal Sheets Pending</h2>
            <p className="text-muted-foreground">
              Your team hasn't submitted any goal sheets for approval yet.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Team Approvals</h1>

      {sheets.map((sheet: GoalSheetDetailRead) => (
        <Card key={sheet.id} className="overflow-hidden">
          <CardHeader className="bg-muted/50 pb-4 border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Goal Sheet for Employee: {sheet.user_id}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${sheet.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                      sheet.status === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'}`}
                  >
                    {sheet.status}
                  </span>
                </CardTitle>
                <CardDescription className="mt-1">
                  Submitted at: {sheet.submitted_at ? new Date(sheet.submitted_at).toLocaleDateString() : 'N/A'}
                </CardDescription>
              </div>
              
              {sheet.status === "submitted" && (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                    onClick={() => handleRework(sheet.id)}
                    disabled={reworkSheet.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Request Rework
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(sheet.id)}
                    disabled={approveSheet.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thrust Area</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="text-right">Weightage</TableHead>
                  {sheet.status === "submitted" && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheet.goals.map((goal) => (
                  <TableRow key={goal.id}>
                    <TableCell className="font-medium">{goal.thrust_area}</TableCell>
                    <TableCell>{goal.title}</TableCell>
                    <TableCell>{formatTarget(goal)}</TableCell>
                    <TableCell className="text-right font-semibold">{goal.weightage}%</TableCell>
                    {sheet.status === "submitted" && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingGoal({ sheetId: sheet.id, goal })}
                          title="Edit Target/Weightage"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <ManagerEditGoalModal
        isOpen={!!editingGoal}
        onClose={() => setEditingGoal(null)}
        initialData={editingGoal?.goal || null}
        onSubmit={handleEditSubmit}
        isSubmitting={editGoal.isPending}
      />
    </div>
  );
}
