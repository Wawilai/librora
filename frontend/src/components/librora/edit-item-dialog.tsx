import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOOKSHELVES } from "@/lib/bookshelves";
import type { Bookshelf, LibraryItem } from "@/lib/api/types";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export function EditItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: LibraryItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateItem = useStore((s) => s.updateItem);
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState(item.tags.join(", "));
  const [bookshelf, setBookshelf] = useState<Bookshelf | "unsorted">(item.bookshelf ?? "unsorted");
  const [note, setNote] = useState(item.personalNote ?? "");

  useEffect(() => {
    if (open) {
      setTitle(item.title);
      setTags(item.tags.join(", "));
      setBookshelf(item.bookshelf ?? "unsorted");
      setNote(item.personalNote ?? "");
    }
  }, [open, item]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTags = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const nextShelf = bookshelf === "unsorted" ? undefined : (bookshelf as Bookshelf);
    const shelfChanged = nextShelf !== item.bookshelf;
    updateItem(item.id, {
      title: title.trim() || item.title,
      tags: parsedTags,
      bookshelf: nextShelf,
      // Picking a shelf from the dialog is a manual override.
      bookshelfSource: shelfChanged ? "manual" : item.bookshelfSource,
      personalNote: note.trim() || undefined,
    });
    toast("Item updated");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit item</DialogTitle>
          <DialogDescription>Refine title, tags, shelf, and your note.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-title">Title</Label>
            <Input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-tags">Tags</Label>
            <Input
              id="e-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="design, systems"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Smart Bookshelf</Label>
            <Select
              value={bookshelf}
              onValueChange={(v) => setBookshelf(v as Bookshelf | "unsorted")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unsorted">Unsorted</SelectItem>
                {BOOKSHELVES.map((b) => (
                  <SelectItem key={b.slug} value={b.slug}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {item.bookshelfSource === "manual"
                ? "Manually selected — won't be changed by reprocessing."
                : "Automatically classified."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-note">Personal note</Label>
            <Textarea
              id="e-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why are you keeping this?"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
