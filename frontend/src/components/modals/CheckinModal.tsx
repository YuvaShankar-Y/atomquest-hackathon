import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CheckInCreate, CheckInGoalRead } from "@/types";

const checkinSchema = z.object({
  actual_value: z.coerce.number().min(0).optional().nullable(),
  status: z.enum(["not_started", "on_track", "completed"]),
});

type CheckinFormValues = z.infer<typeof checkinSchema>;

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CheckInCreate) => void;
  goal: CheckInGoalRead | null;
  isSubmitting?: boolean;
}

export function CheckinModal({ isOpen, onClose, onSubmit, goal, isSubmitting }: CheckinModalProps) {
  const form = useForm<CheckinFormValues>({
    resolver: zodResolver(checkinSchema) as any,
    defaultValues: {
      actual_value: 0,
      status: "on_track",
    },
  });

  useEffect(() => {
    if (isOpen && goal) {
      form.reset({
        actual_value: goal.current_actual ?? 0,
        status: goal.checkin_status,
      });
    }
  }, [isOpen, goal, form]);

  const handleSubmit = (values: CheckinFormValues) => {
    const payload: CheckInCreate = { status: values.status };
    if (goal?.uom_type === "numeric" || goal?.uom_type === "percentage" || goal?.uom_type === "zero") {
      payload.actual_value = values.actual_value;
    }
    onSubmit(payload);
  };

  if (!goal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
          <DialogDescription>
            {goal.goal_title}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            
            {(goal.uom_type === "numeric" || goal.uom_type === "percentage") && (
              <FormField
                control={form.control}
                name="actual_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Achievement</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target was: {goal.target_value} {goal.uom_type === "percentage" ? "%" : ""}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {goal.uom_type === "zero" && (
              <FormField
                control={form.control}
                name="actual_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Have you achieved this?</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "yes" ? 0 : 1)} 
                      defaultValue={field.value === 0 ? "yes" : "no"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Yes (0 errors/incidents)</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Save Check-in
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
