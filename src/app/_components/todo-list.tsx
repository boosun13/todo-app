import type { Todo } from "@/domain/todo";
import { deleteTodo, toggleTodo } from "../actions";

export function TodoList({ todos }: { todos: Todo[] }) {
  if (todos.length === 0) {
    return <p className="py-8 text-center text-zinc-500">TODO はありません</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {todos.map((todo) => (
        <li key={todo.id} className="flex items-center gap-3 py-3">
          <form action={toggleTodo}>
            <input type="hidden" name="id" value={todo.id} />
            <input type="hidden" name="completed" value={String(todo.completed)} />
            <button
              aria-label={todo.completed ? "未完了に戻す" : "完了にする"}
              aria-pressed={todo.completed}
              className="flex size-5 items-center justify-center rounded border border-zinc-400"
            >
              {todo.completed && "✓"}
            </button>
          </form>
          <span className={`flex-1 break-all ${todo.completed ? "text-zinc-400 line-through" : ""}`}>
            {todo.title}
          </span>
          <form action={deleteTodo}>
            <input type="hidden" name="id" value={todo.id} />
            <button aria-label={`「${todo.title}」を削除`} className="text-sm text-zinc-500 hover:text-red-600">
              削除
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
