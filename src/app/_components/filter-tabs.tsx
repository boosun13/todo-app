import Link from "next/link";
import type { TodoFilter } from "@/domain/todo";

const TABS: { filter: TodoFilter; label: string }[] = [
  { filter: "all", label: "すべて" },
  { filter: "active", label: "未完了" },
  { filter: "completed", label: "完了" },
];

export function FilterTabs({ current }: { current: TodoFilter }) {
  return (
    <nav aria-label="フィルタ" className="flex gap-1">
      {TABS.map(({ filter, label }) => (
        <Link
          key={filter}
          href={filter === "all" ? "/" : `/?filter=${filter}`}
          aria-current={filter === current ? "page" : undefined}
          className={`rounded px-3 py-1 text-sm ${
            filter === current ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
