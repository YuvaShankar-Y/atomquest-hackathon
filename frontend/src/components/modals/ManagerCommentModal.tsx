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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ManagerCommentCreate, CheckInGoalRead } from "@/types";

const commentSchema = z.object({
  manager_comment: z.string().min(1, "Comment is required").max(3000),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface ManagerCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ManagerCommentCreate) => void;
  goal: CheckInGoalRead | null;
  isSubmitting?: boolean;
}

export function ManagerCommentModal({ isOpen, onClose, onSubmit, goal, isSubmitting }: ManagerCommentModalProps) {
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      manager_comment: "",
    },
  });

  useEffect(() => {
    if (isOpen && goal) {
      form.reset({
        manager_comment: goal.manager_comment || "",
      });
    }
  }, [isOpen, goal, form]);

  const handleSubmit = (values: CommentFormValues) => {
    onSubmit(values);
  };

  if (!goal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Manager Comment</DialogTitle>
          <DialogDescription>
            {goal.goal_title}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="manager_comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Feedback</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add your thoughts on their progress..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Save Comment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
