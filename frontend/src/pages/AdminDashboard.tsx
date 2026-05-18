import { useState } from "react";
import { LockOpen, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useTeamGoalSheets } from "@/hooks/useApprovals";
import { useUnlockGoalSheet, useAuditLogs } from "@/hooks/useAdmin";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AdminDashboard() {
  const { data: goalSheets = [], isLoading: isSheetsLoading } = useTeamGoalSheets();
  const { data: auditLogs = [], isLoading: isLogsLoading } = useAuditLogs();
  const unlockSheet = useUnlockGoalSheet();

  const handleUnlock = (sheetId: string) => {
    if (!window.confirm("Are you sure you want to unlock this goal sheet and send it back to the rework state?")) return;
    unlockSheet.mutate(sheetId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage goal sheets and view system audit logs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Goal Sheets</CardTitle>
          <CardDescription>View all employee goal sheets across the organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {isSheetsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : goalSheets.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goalSheets.map((sheet) => (
                    <TableRow key={sheet.id}>
                      <TableCell className="font-medium">User {sheet.user_id}</TableCell>
                      <TableCell>
                        <span className={`capitalize inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          sheet.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          sheet.status === "submitted" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {sheet.status}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(sheet.updated_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={sheet.status !== "approved" || unlockSheet.isPending}
                          onClick={() => handleUnlock(sheet.id)}
                        >
                          <LockOpen className="h-4 w-4 mr-2" />
                          Unlock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No goal sheets found.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Audit Logs</CardTitle>
          <CardDescription>Recent actions tracked in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLogsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : auditLogs.length > 0 ? (
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(log.changed_at), "MMM d, HH:mm:ss")}</TableCell>
                      <TableCell className="font-medium text-sm">{log.entity_type}</TableCell>
                      <TableCell className="text-sm uppercase text-muted-foreground">{log.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.user_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No audit logs available.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
