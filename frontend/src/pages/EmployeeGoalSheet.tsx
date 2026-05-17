import { useState, useMemo } from "react";
import { Plus, Send, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalModal } from "@/components/modals/GoalModal";
import { GoalsTable } from "@/components/tables/GoalsTable";
import {
  useActiveGoalCycles,
  useGoalSheets,
  useGoalSheet,
  useCreateGoalSheet,
  useAddGoalToSheet,
  useUpdateGoal,
  useSubmitGoalSheet,
} from "@/hooks/useGoals"; // Assuming useGoalCycles is also exported from useGoals or we import it properly. Wait, I created useGoalCycles in a separate file.
import { useActiveGoalCycles as useGoalCycles } from "@/hooks/useGoalCycles";
import type { GoalCreate, GoalRead } from "@/types";

export function EmployeeGoalSheet() {
  const { user } = useAuth();
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalRead | null>(null);

  // Queries
  const { data: cycles, isLoading: isLoadingCycles } = useGoalCycles();
  const { data: goalSheets, isLoading: isLoadingSheets } = useGoalSheets();
  
  // Find the active goal setting cycle
  const activeCycle = useMemo(() => {
    if (!cycles) return null;
    return cycles.find(c => c.is_active && c.phase === "goal_setting");
  }, [cycles]);

  // Find if user already has a sheet for this cycle
  const currentSheetOverview = useMemo(() => {
    if (!activeCycle || !goalSheets) return null;
    return goalSheets.find(s => s.cycle_id === activeCycle.id);
  }, [activeCycle, goalSheets]);

  // Fetch full details of the current sheet (if it exists)
  const { data: currentSheetDetail, isLoading: isLoadingDetail } = useGoalSheet(currentSheetOverview?.id);

  // Mutations
  const createSheet = useCreateGoalSheet();
  const addGoal = useAddGoalToSheet();
  const updateGoal = useUpdateGoal();
  const submitSheet = useSubmitGoalSheet();

  const handleStartGoalSetting = () => {
    if (!activeCycle) return;
    createSheet.mutate({ cycle_id: activeCycle.id });
  };

  const handleGoalSubmit = (goalData: GoalCreate) => {
    if (!currentSheetDetail) return;

    if (editingGoal) {
      updateGoal.mutate(
        { goalId: editingGoal.id, payload: goalData },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingGoal(null);
          },
        }
      );
    } else {
      addGoal.mutate(
        { sheetId: currentSheetDetail.id, payload: goalData },
        {
          onSuccess: () => {
            setIsModalOpen(false);
          },
        }
      );
    }
  };

  const openEditModal = (goal: GoalRead) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleSubmitSheet = () => {
    if (!currentSheetDetail) return;
    submitSheet.mutate(currentSheetDetail.id);
  };

  // Loading state
  if (isLoadingCycles || isLoadingSheets || (currentSheetOverview && isLoadingDetail)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!activeCycle) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Goal Sheet</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-xl font-semibold mb-2">No Active Goal Cycle</h2>
            <p className="text-muted-foreground">
              Goal setting is currently closed. Please wait for the next cycle to begin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentSheetOverview) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Goal Sheet</h1>
        <Card>
          <CardHeader>
            <CardTitle>{activeCycle.name}</CardTitle>
            <CardDescription>
              Goal setting is open from {new Date(activeCycle.start_date).toLocaleDateString()} to {new Date(activeCycle.end_date).toLocaleDateString()}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Button size="lg" onClick={handleStartGoalSetting} disabled={createSheet.isPending}>
              <Plus className="mr-2 h-5 w-5" />
              Start Goal Setting
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // We have a sheet, show details
  const sheet = currentSheetDetail;
  const isReadOnly = sheet?.status !== "draft" && sheet?.status !== "rework";
  const goals = sheet?.goals || [];
  const totalWeightage = goals.reduce((sum, g) => sum + Number(g.weightage), 0);
  const isValidWeightage = totalWeightage === 100;
  const maxGoalsReached = goals.length >= 8;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Goal Sheet</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
            ${sheet?.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
              sheet?.status === 'submitted' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
              sheet?.status === 'rework' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' : 
              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}
          >
            {sheet?.status}
          </span>
        </div>
      </div>

      {!isReadOnly && (
        <Alert variant={isValidWeightage ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Weightage Validation</AlertTitle>
          <AlertDescription>
            Total weightage is currently <strong>{totalWeightage}%</strong>. It must equal exactly 100% before you can submit.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{activeCycle.name} Goals</CardTitle>
            <CardDescription>
              You have {goals.length}/8 goals set.
            </CardDescription>
          </div>
          {!isReadOnly && !maxGoalsReached && (
            <Button onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <GoalsTable 
            goals={goals} 
            onEdit={openEditModal} 
            isReadOnly={isReadOnly} 
          />

          {!isReadOnly && (
            <div className="mt-8 flex justify-end">
              <Button 
                size="lg" 
                onClick={handleSubmitSheet}
                disabled={!isValidWeightage || goals.length === 0 || submitSheet.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                Submit for Approval
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingGoal(null); }}
        onSubmit={handleGoalSubmit}
        initialData={editingGoal}
        isSubmitting={addGoal.isPending || updateGoal.isPending}
      />
    </div>
  );
}
