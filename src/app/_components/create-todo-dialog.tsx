"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTodo } from "../_actions/todo-actions";
import { CREATE_TODO_ATTR } from "./focus";
import { TodoForm } from "./todo-form";

export function CreateTodoDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button {...{ [CREATE_TODO_ATTR]: "" }} />}>
        <PlusIcon data-icon="inline-start" />
        新規作成
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>TODO を追加</DialogTitle>
          <DialogDescription>タイトルのみ必須です。</DialogDescription>
        </DialogHeader>
        <TodoForm
          submitLabel="追加"
          onSubmit={createTodo}
          onSuccess={() => {
            setOpen(false);
            toast.success("TODO を追加しました");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
