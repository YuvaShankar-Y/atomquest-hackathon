import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompletionDashboard } from "@/hooks/useAdmin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function CompletionDashboard() {
  const { data: completionData = [], isLoading } = useCompletionDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Completion Status</h1>
        <p className="text-muted-foreground">Monitor the organization's progress on quarterly check-ins.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Check-in Progress</CardTitle>
          <CardDescription>View which employees have completed their check-ins for the active quarter.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : completionData.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Quarter</TableHead>
                    <TableHead className="text-center">Goals Set</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completionData.map((row) => (
                    <TableRow key={row.employee_id}>
                      <TableCell className="font-medium">{row.employee_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.manager_name || "Unassigned"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                          Q{row.quarter} {row.year}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{row.total_goals}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{row.checked_in_goals}</span>
                        <span className="text-muted-foreground"> / {row.total_goals}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {row.total_goals === 0 ? (
                          <div className="flex items-center justify-end text-muted-foreground">
                            <Circle className="mr-2 h-4 w-4" />
                            <span className="text-sm">No Goals</span>
                          </div>
                        ) : row.is_complete ? (
                          <div className="flex items-center justify-end text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            <span className="text-sm">Complete</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end text-yellow-600 dark:text-yellow-400 font-medium">
                            <Clock className="mr-2 h-4 w-4" />
                            <span className="text-sm">{row.pending_goals} Pending</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No employees found to track for this quarter.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
