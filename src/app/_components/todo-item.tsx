"use client";

import { CalendarIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Todo } from "@/domain/todo";
import { formatDueDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteTodo, setTodoCompleted } from "../_actions/todo-actions";
import { PriorityBadge } from "./priority-badge";

type Props = {
  todo: Todo;
  /** 「今」に依存する判定はサーバーで行い、ハイドレーション差異を避ける */
  overdue: boolean;
};

export function TodoItem({ todo, overdue }: Props) {
  const [completed, setCompleted] = useOptimistic(todo.completed);
  const [pending, startTransition] = useTransition();

  const toggle = (checked: boolean) =>
    startTransition(async () => {
      setCompleted(checked);
      const result = await setTodoCompleted(todo.id, checked);
      if (!result.ok) toast.error(result.error);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteTodo(todo.id);
      if (result.ok) toast.success("削除しました");
      else toast.error(result.error);
    });

  return (
    <li className={cn("flex items-start gap-3 py-3", pending && "opacity-60")}>
      <Checkbox
        checked={completed}
        onCheckedChange={toggle}
        aria-label={`「${todo.title}」を完了にする`}
        className="mt-1"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <Link
          href={`/todos/${todo.id}`}
          className={cn("block break-words font-medium hover:underline", completed && "text-muted-foreground line-through")}
        >
          {todo.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <PriorityBadge priority={todo.priority} />
          {todo.dueDate && (
            <Badge variant={overdue ? "destructive" : "outline"} className="gap-1">
              <CalendarIcon className="size-3" />
              {formatDueDate(todo.dueDate)}
              {overdue && " ・期限切れ"}
            </Badge>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" aria-label={`「${todo.title}」を削除`} onClick={remove} disabled={pending}>
        <Trash2Icon />
      </Button>
    </li>
  );
}
