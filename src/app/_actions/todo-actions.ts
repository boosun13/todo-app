"use server";

import { revalidatePath } from "next/cache";
import { todoService } from "@/server/todo";
import { runAction, type ActionResult } from "./result";

// 一覧・詳細・統計のすべてが TODO の変更で古くなる
function revalidateTodos(id?: string) {
  revalidatePath("/");
  revalidatePath("/stats");
  if (id) revalidatePath(`/todos/${id}`);
}

export async function createTodo(values: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await todoService.add(values);
    revalidateTodos();
  });
}

export async function updateTodo(id: string, values: unknown): Promise<ActionResult> {
  return runAction(async () => {
    await todoService.update(id, values);
    revalidateTodos(id);
  });
}

export async function setTodoCompleted(id: string, completed: boolean): Promise<ActionResult> {
  return updateTodo(id, { completed });
}

export async function deleteTodo(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await todoService.remove(id);
    revalidateTodos(id);
  });
}

export async function clearCompletedTodos(): Promise<ActionResult> {
  return runAction(async () => {
    await todoService.clearCompleted();
    revalidateTodos();
  });
}
