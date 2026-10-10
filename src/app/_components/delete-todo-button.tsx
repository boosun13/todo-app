"use client";

import { Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteTodo } from "../_actions/todo-actions";

export function DeleteTodoButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteTodo(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("削除しました");
      setOpen(false);
      router.replace("/");
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>
        <Trash2Icon data-icon="inline-start" />
        削除
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>削除しますか？</DialogTitle>
          <DialogDescription>「{title}」を削除します。この操作は取り消せません。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>キャンセル</DialogClose>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? "削除中…" : "削除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
