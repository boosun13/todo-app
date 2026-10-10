"use client";

import { useActionState } from "react";
import { addTodo } from "../actions";
import { TITLE_MAX_LENGTH } from "@/domain/todo";

export function AddTodoForm() {
  const [state, action, pending] = useActionState(addTodo, undefined);

  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="title"
          required
          maxLength={TITLE_MAX_LENGTH}
          placeholder="やることを入力"
          aria-label="新しいTODO"
          aria-invalid={!!state?.error}
          aria-describedby={state?.error ? "add-error" : undefined}
          className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
        <button
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "追加中…" : "追加"}
        </button>
      </div>
      {state?.error && (
        <p id="add-error" role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
