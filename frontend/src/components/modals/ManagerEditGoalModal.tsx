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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ApprovalGoalEditRequest, GoalRead } from "@/types";

const managerGoalSchema = z.object({
  target_value: z.coerce.number().min(0).optional().nullable(),
  target_date: z.string().optional().nullable(),
  weightage: z.coerce.number().min(10, "Minimum weightage is 10").max(100, "Maximum weightage is 100").optional().nullable(),
});

type ManagerGoalFormValues = z.infer<typeof managerGoalSchema>;

interface ManagerEditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: ApprovalGoalEditRequest) => void;
  initialData: GoalRead | null;
  isSubmitting?: boolean;
}

export function ManagerEditGoalModal({ isOpen, onClose, onSubmit, initialData, isSubmitting }: ManagerEditGoalModalProps) {
  const form = useForm<ManagerGoalFormValues>({
    resolver: zodResolver(managerGoalSchema) as any,
    defaultValues: {
      target_value: 0,
      target_date: "",
      weightage: 10,
    },
  });

  useEffect(() => {
    if (isOpen && initialData) {
      form.reset({
        target_value: initialData.target_value ?? 0,
        target_date: initialData.target_date || "",
        weightage: initialData.weightage,
      });
    }
  }, [isOpen, initialData, form]);

  const handleSubmit = (values: ManagerGoalFormValues) => {
    // Only submit fields that are relevant to the uom_type
    const cleanData: ApprovalGoalEditRequest = { weightage: values.weightage };
    if (initialData?.uom_type === "numeric" || initialData?.uom_type === "percentage") {
      cleanData.target_value = values.target_value;
    } else if (initialData?.uom_type === "timeline") {
      cleanData.target_date = values.target_date;
    }
    onSubmit(cleanData);
  };

  if (!initialData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Adjust Goal Parameters</DialogTitle>
          <DialogDescription>
            You can modify the target and weightage before approving.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="weightage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weightage (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min="10" max="100" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(initialData.uom_type === "numeric" || initialData.uom_type === "percentage") && (
              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {initialData.uom_type === "timeline" && (
              <FormField
                control={form.control}
                name="target_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end pt-4 space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
