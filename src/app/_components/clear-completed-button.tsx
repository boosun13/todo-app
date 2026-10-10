"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clearCompletedTodos } from "../_actions/todo-actions";

export function ClearCompletedButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await clearCompletedTodos();
          if (result.ok) toast.success("完了済みを削除しました");
          else toast.error(result.error);
        })
      }
    >
      完了済みを一括削除
    </Button>
  );
}
