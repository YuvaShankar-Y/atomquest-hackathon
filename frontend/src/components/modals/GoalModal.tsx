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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { GoalCreate, GoalRead } from "@/types";

const goalSchema = z.object({
  thrust_area: z.string().min(1, "Thrust area is required").max(120),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  uom_type: z.enum(["numeric", "percentage", "timeline", "zero"]),
  direction: z.enum(["min", "max"]).optional().nullable(),
  target_value: z.coerce.number().min(0).optional().nullable(),
  target_date: z.string().optional().nullable(),
  weightage: z.coerce.number().min(10, "Minimum weightage is 10").max(100, "Maximum weightage is 100"),
}).superRefine((data, ctx) => {
  if (data.uom_type === "numeric" || data.uom_type === "percentage") {
    if (data.target_value == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Target value is required", path: ["target_value"] });
    }
    if (!data.direction) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Direction is required", path: ["direction"] });
    }
  }
  if (data.uom_type === "timeline") {
    if (!data.target_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Target date is required", path: ["target_date"] });
    }
  }
});

type GoalFormValues = z.infer<typeof goalSchema>;

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goal: GoalCreate) => void;
  initialData?: GoalRead | null;
  isSubmitting?: boolean;
}

export function GoalModal({ isOpen, onClose, onSubmit, initialData, isSubmitting }: GoalModalProps) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema) as any,
    defaultValues: {
      thrust_area: "",
      title: "",
      description: "",
      uom_type: "numeric",
      direction: "max",
      target_value: 0,
      target_date: "",
      weightage: 10,
    },
  });

  const uomType = form.watch("uom_type");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          thrust_area: initialData.thrust_area,
          title: initialData.title,
          description: initialData.description || "",
          uom_type: initialData.uom_type,
          direction: initialData.direction || "max",
          target_value: initialData.target_value ?? 0,
          target_date: initialData.target_date || "",
          weightage: initialData.weightage,
        });
      } else {
        form.reset({
          thrust_area: "",
          title: "",
          description: "",
          uom_type: "numeric",
          direction: "max",
          target_value: 0,
          target_date: "",
          weightage: 10,
        });
      }
    }
  }, [isOpen, initialData, form]);

  const handleSubmit = (values: GoalFormValues) => {
    // Clean up fields based on uom_type before submission
    const cleanData: GoalCreate = { ...values };
    if (cleanData.uom_type === "numeric" || cleanData.uom_type === "percentage") {
      cleanData.target_date = null;
    } else if (cleanData.uom_type === "timeline") {
      cleanData.direction = null;
      cleanData.target_value = null;
    } else if (cleanData.uom_type === "zero") {
      cleanData.direction = null;
      cleanData.target_value = null;
      cleanData.target_date = null;
    }
    
    // Convert empty strings to null for optional fields
    if (!cleanData.description) cleanData.description = null;
    
    onSubmit(cleanData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Goal" : "Add New Goal"}</DialogTitle>
          <DialogDescription>
            Set the parameters for your goal. Weightage must be between 10% and 100%.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="thrust_area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thrust Area</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Revenue, Engineering" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Increase Q3 sales" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Details about this goal..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="uom_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Measurement Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="numeric">Numeric</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="timeline">Timeline</SelectItem>
                        <SelectItem value="zero">Zero-based (Yes/No)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weightage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weightage (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="10" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(uomType === "numeric" || uomType === "percentage") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || "max"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="max">Maximize (Higher is better)</SelectItem>
                          <SelectItem value="min">Minimize (Lower is better)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>
            )}

            {uomType === "timeline" && (
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
                {initialData ? "Save Changes" : "Add Goal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
