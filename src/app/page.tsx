import { Suspense } from "react";
import { todoFilterSchema } from "@/domain/todo";
import { todoService } from "@/server/todo";
import { clearCompleted } from "./actions";
import { AddTodoForm } from "./_components/add-todo-form";
import { FilterTabs } from "./_components/filter-tabs";
import { TodoList } from "./_components/todo-list";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-12">
      <h1 className="text-2xl font-semibold">TODO</h1>
      <AddTodoForm />
      <Suspense fallback={<p className="text-zinc-500">読み込み中…</p>}>
        <TodoSection searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function TodoSection({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { filter: rawFilter } = await searchParams;
  // 不正なクエリは "all" にフォールバック(画面なので 400 にはしない)
  const parsed = todoFilterSchema.safeParse(rawFilter);
  const filter = parsed.success ? parsed.data : "all";

  const [todos, activeCount] = await Promise.all([
    todoService.list(filter),
    todoService.countActive(),
  ]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <FilterTabs current={filter} />
        <span className="text-sm text-zinc-500">未完了 {activeCount} 件</span>
      </div>
      <TodoList todos={todos} />
      <form action={clearCompleted}>
        <button className="text-sm text-zinc-500 hover:text-red-600">完了済みを一括削除</button>
      </form>
    </section>
  );
}
