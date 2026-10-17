"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queryRef = useRef(query);
  // 自分が router.replace で送ったが、まだ URL に反映されていない検索語(送信順)
  const inflight = useRef<string[]>([]);

  useEffect(() => {
    queryRef.current = query;
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  // URL が唯一の状態。ただし自分の送信の応答(古い応答を含む)で入力値を巻き戻さない:
  // - query.q が送信済みの値なら、その応答なので入力値の上書きも保留中タイマーの取消もしない
  // - それ以外(ヘッダーのリンク等の外部変更、戻る/進む)は入力値を同期し、保留中の送信を取り消す
  useEffect(() => {
    const idx = inflight.current.indexOf(query.q);
    if (idx !== -1) {
      inflight.current = inflight.current.slice(idx + 1); // 追い越された古い送信も破棄する
      return;
    }
    inflight.current = [];
    clearTimeout(timer.current);
    setQ(query.q);
  }, [query.q]);
  // 検索語以外の条件が変わる遷移(フィルタのリンク等)は送信中の検索を中断しうるので、記録を捨てる
  useEffect(() => {
    inflight.current = [];
  }, [query.filter, query.sort, query.priority]);

  // 検索語はユーザー入力起点でデバウンスして URL に反映する
  function onSearchChange(value: string) {
    setQ(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = value.trim();
      // 送信中のものがあれば(中断されて URL に反映されない可能性もあるので)常に送る。同じ URL の再送は無害
      if (inflight.current.length === 0 && next === queryRef.current.q) return;
      inflight.current.push(next);
      router.replace(todoQueryHref(queryRef.current, { q: next }));
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => onSearchChange(e.target.value)}
          maxLength={100}
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
