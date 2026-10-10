import type { TodoQuery } from "@/domain/todo";

/** URL を状態の single source of truth とするため、クエリ ⇄ href の変換をここに集約する */
export function todoQueryHref(query: TodoQuery, patch: Partial<TodoQuery>): string {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.filter !== "all") params.set("filter", next.filter);
  if (next.sort !== "created") params.set("sort", next.sort);
  if (next.priority) params.set("priority", next.priority);
  if (next.q) params.set("q", next.q);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
