import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GoalRead } from "@/types";

interface GoalsTableProps {
  goals: GoalRead[];
  onEdit?: (goal: GoalRead) => void;
  isReadOnly?: boolean;
}

export function GoalsTable({ goals, onEdit, isReadOnly = false }: GoalsTableProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No goals added yet.</p>
      </div>
    );
  }

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

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thrust Area</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>UoM</TableHead>
            <TableHead>Target</TableHead>
            <TableHead className="text-right">Weightage</TableHead>
            {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {goals.map((goal) => (
            <TableRow key={goal.id}>
              <TableCell className="font-medium">{goal.thrust_area}</TableCell>
              <TableCell>
                <div>
                  <p>{goal.title}</p>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                      {goal.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="capitalize">{goal.uom_type}</TableCell>
              <TableCell>{formatTarget(goal)}</TableCell>
              <TableCell className="text-right font-semibold">{goal.weightage}%</TableCell>
              {!isReadOnly && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit?.(goal)}
                      title="Edit Goal"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    {/* Add delete button logic later if the backend supports deleting goals */}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
