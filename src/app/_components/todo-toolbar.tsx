"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  SORT_LABEL,
  todoSortSchema,
  type TodoFilter,
  type TodoQuery,
} from "@/domain/todo";
import { todoQueryHref } from "@/lib/todo-query";
import { cn } from "@/lib/utils";

const FILTERS: { filter: TodoFilter; label: string }[] = [
  { filter: "all", label: "すべて" },
  { filter: "active", label: "未完了" },
  { filter: "completed", label: "完了" },
];

const ANY = "ANY";
const PRIORITY_ITEMS = { [ANY]: "優先度: すべて", ...PRIORITY_LABEL };
const SEARCH_DEBOUNCE_MS = 300;

export function TodoToolbar({ query }: { query: TodoQuery }) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);

  // 検索語はデバウンスして URL に反映する(URL が唯一の状態)
  useEffect(() => {
    if (q.trim() === query.q) return;
    const t = setTimeout(() => router.replace(todoQueryHref(query, { q: q.trim() })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, query, router]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="タイトル・メモを検索"
          aria-label="検索"
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="状態で絞り込み" className="flex rounded-lg bg-muted p-0.5">
          {FILTERS.map(({ filter, label }) => (
            <Link
              key={filter}
              href={todoQueryHref(query, { filter })}
              aria-current={filter === query.filter ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1 text-sm text-muted-foreground",
                filter === query.filter && "bg-background font-medium text-foreground shadow-sm",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex gap-2">
          <Select
            value={query.priority ?? ANY}
            items={PRIORITY_ITEMS}
            onValueChange={(v) =>
              router.replace(todoQueryHref(query, { priority: v === ANY ? undefined : (v as TodoQuery["priority"]) }))
            }
          >
            <SelectTrigger size="sm" aria-label="優先度で絞り込み">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{PRIORITY_ITEMS[ANY]}</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  優先度: {PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={query.sort}
            items={SORT_LABEL}
            onValueChange={(v) => router.replace(todoQueryHref(query, { sort: todoSortSchema.parse(v) }))}
          >
            <SelectTrigger size="sm" aria-label="並び替え">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {todoSortSchema.options.map((s) => (
                <SelectItem key={s} value={s}>
                  {SORT_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
