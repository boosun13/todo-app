"use client";

import { useRef, useState, useTransition } from "react";
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
import { clearCompletedTodos } from "../_actions/todo-actions";
import { findCreateTodoButton } from "./focus";

/** completedCount: 表示中の絞り込みに関係ない、全体の完了済み件数 */
export function ClearCompletedButton({ completedCount }: { completedCount: number }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // 成功時はトリガー(0 件で無効化される)ではなく新規作成ボタンへフォーカスを戻す
  const cleared = useRef(false);

  const confirm = () =>
    startTransition(async () => {
      const result = await clearCompletedTodos();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`完了済み ${completedCount} 件を片付けました`);
      cleared.current = true;
      setOpen(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) cleared.current = false;
        setOpen(next);
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="sm" disabled={completedCount === 0} />}>
        完了済みを片付ける
      </DialogTrigger>
      <DialogContent finalFocus={() => (cleared.current ? findCreateTodoButton() : true)}>
        <DialogHeader>
          <DialogTitle>完了済みを片付けますか？</DialogTitle>
          <DialogDescription>
            表示中の絞り込みに関係なく、完了済みの {completedCount} 件をすべて一覧から片付けます。統計の完了実績には残ります。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>キャンセル</DialogClose>
          <Button onClick={confirm} disabled={pending}>
            {pending ? "片付け中…" : "片付ける"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
