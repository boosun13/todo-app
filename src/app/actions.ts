"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { todoService } from "@/server/todo";

export type FormState = { error?: string } | undefined;

export async function addTodo(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await todoService.add({ title: formData.get("title") });
  } catch (e) {
    if (e instanceof ZodError) return { error: e.issues[0]?.message };
    throw e;
  }
  revalidatePath("/");
}

export async function toggleTodo(formData: FormData) {
  const id = String(formData.get("id"));
  const completed = formData.get("completed") === "true";
  await todoService.update(id, { completed: !completed });
  revalidatePath("/");
}

export async function deleteTodo(formData: FormData) {
  await todoService.remove(String(formData.get("id")));
  revalidatePath("/");
}

export async function clearCompleted() {
  await todoService.clearCompleted();
  revalidatePath("/");
}
