import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NotFoundError } from "@/domain/errors";
import { formatDateTime } from "@/lib/format";
import { todoService } from "@/server/todo";
import { updateTodo } from "../../_actions/todo-actions";
import { DeleteTodoButton } from "../../_components/delete-todo-button";
import { TodoForm } from "../../_components/todo-form";

export const metadata: Metadata = { title: "TODO の編集" };

export default function TodoDetailPage({ params }: PageProps<"/todos/[id]">) {
  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        一覧に戻る
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TodoDetail params={params} />
      </Suspense>
    </div>
  );
}

async function TodoDetail({ params }: Pick<PageProps<"/todos/[id]">, "params">) {
  const { id } = await params;
  const todo = await todoService.get(id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h1">TODO の編集</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <TodoForm
          submitLabel="保存"
          defaultValues={{
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            dueDate: todo.dueDate?.toISOString().slice(0, 10) ?? "",
          }}
          onSubmit={updateTodo.bind(null, todo.id)}
        />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
          <dt>状態</dt>
          <dd>{todo.completed ? "完了" : "未完了"}</dd>
          <dt>作成</dt>
          <dd>{formatDateTime(todo.createdAt)}</dd>
          <dt>更新</dt>
          <dd>{formatDateTime(todo.updatedAt)}</dd>
          {todo.completedAt && (
            <>
              <dt>完了</dt>
              <dd>{formatDateTime(todo.completedAt)}</dd>
            </>
          )}
        </dl>
        <div className="flex justify-end">
          <DeleteTodoButton id={todo.id} title={todo.title} />
        </div>
      </CardContent>
    </Card>
  );
}
