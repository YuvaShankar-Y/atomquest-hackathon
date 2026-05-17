import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ItemCreate, ItemRead, ItemStatus } from "@/types";

const defaultValues: ItemCreate = {
  title: "",
  description: "",
  status: "draft",
};

interface ItemModalProps {
  open: boolean;
  item?: ItemRead | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: ItemCreate) => void | Promise<void>;
}

export function ItemModal({ open, item, isSubmitting = false, onClose, onSubmit }: ItemModalProps) {
  const [values, setValues] = useState<ItemCreate>(defaultValues);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues({
      title: item?.title ?? "",
      description: item?.description ?? "",
      status: item?.status ?? "draft",
    });
  }, [item, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      title: values.title.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      status: values.status,
    });
  };

  const setStatus = (status: ItemStatus) => setValues((current) => ({ ...current, status }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold">{item ? "Edit item" : "Add item"}</h2>
            <p className="text-sm text-muted-foreground">
              {item ? "Update the item details and save your changes." : "Create a new item for your dashboard."}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label htmlFor="item-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="item-title"
              value={values.title}
              onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
              placeholder="Quarterly roadmap"
              maxLength={200}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="item-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="item-description"
              value={values.description ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
              placeholder="Add a short summary or context for this item."
              maxLength={5000}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="item-status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="item-status"
              value={values.status}
              onChange={(event) => setStatus(event.target.value as ItemStatus)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isSubmitting}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !values.title.trim()}>
              {isSubmitting ? "Saving..." : item ? "Save changes" : "Create item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
