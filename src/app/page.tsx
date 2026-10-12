import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { isOverdue, todoQuerySchema, type TodoQuery } from "@/domain/todo";
import { todoService } from "@/server/todo";
import { ClearCompletedButton } from "./_components/clear-completed-button";
import { CreateTodoDialog } from "./_components/create-todo-dialog";
import { TodoItem } from "./_components/todo-item";
import { TodoToolbar } from "./_components/todo-toolbar";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">TODO</h1>
        <CreateTodoDialog />
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <TodoSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TodoSection({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  await connection(); // 期限切れ判定が「今」に依存するためリクエスト時に描画する
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  // 不正なクエリは既定値にフォールバック(画面なので 400 にはしない)
  // 項目単位で検証し、不正な項目だけ既定値に戻す(他の有効な条件は維持する)
  const { shape } = todoQuerySchema;
  const query: TodoQuery = {
    filter: shape.filter.safeParse(raw.filter).data ?? "all",
    sort: shape.sort.safeParse(raw.sort).data ?? "created",
    priority: shape.priority.safeParse(raw.priority).data,
    q: shape.q.safeParse(raw.q).data ?? "",
  };

  const [todos, stats] = await Promise.all([todoService.list(query), todoService.stats()]);
  const now = new Date();
  const isFiltered = query.filter !== "all" || query.q !== "" || query.priority !== undefined;

  return (
    <section className="space-y-4">
      <TodoToolbar query={query} />
      {todos.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {isFiltered ? "条件に一致する TODO はありません" : "TODO はまだありません。「新規作成」から追加しましょう"}
        </p>
      ) : (
        <ul className="divide-y">
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} overdue={isOverdue(todo, now)} />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          未完了 {stats.active} 件 / 全 {stats.total} 件
        </span>
        <ClearCompletedButton disabled={stats.completed === 0} />
      </div>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
