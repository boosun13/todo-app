import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TodoStats } from "@/domain/stats";
import { PRIORITIES, PRIORITY_LABEL } from "@/domain/todo";
import { formatShortDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { todoService } from "@/server/todo";

export const metadata: Metadata = { title: "統計" };

export default function StatsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">統計</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <StatsView />
      </Suspense>
    </div>
  );
}

async function StatsView() {
  await connection(); // 「今」に依存するためリクエスト時に描画する
  const stats = await todoService.stats();
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="合計" value={stats.total} />
        <StatCard label="未完了" value={stats.active} />
        <StatCard label="完了" value={stats.completed} />
        <StatCard label="期限切れ" value={stats.overdue} tone={stats.overdue > 0 ? "danger" : undefined} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">達成率</CardTitle>
          <CardDescription>{Math.round(stats.completionRate * 100)}%（アーカイブ済みを含む）</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="progressbar"
            aria-label="達成率"
            aria-valuenow={Math.round(stats.completionRate * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full bg-primary" style={{ width: `${stats.completionRate * 100}%` }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <PriorityCard stats={stats} />
        <DailyCard stats={stats} />
      </div>
    </>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn("text-3xl tabular-nums", tone === "danger" && "text-destructive")}>
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function PriorityCard({ stats }: { stats: TodoStats }) {
  const max = Math.max(1, ...PRIORITIES.map((p) => stats.activeByPriority[p]));
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">未完了の優先度内訳</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[...PRIORITIES].reverse().map((p) => (
          <div key={p} className="flex items-center gap-3 text-sm">
            <span className="w-8 shrink-0">{PRIORITY_LABEL[p]}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${(stats.activeByPriority[p] / max) * 100}%` }} />
            </div>
            <span className="w-6 text-right tabular-nums">{stats.activeByPriority[p]}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DailyCard({ stats }: { stats: TodoStats }) {
  const max = Math.max(1, ...stats.completedPerDay.map((d) => d.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">直近 7 日間の完了数</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex h-32 items-end gap-2">
          {stats.completedPerDay.map(({ date, count }) => (
            <li key={date} className="flex h-full flex-1 flex-col items-center justify-end gap-1 text-xs">
              <span className="tabular-nums text-muted-foreground">{count}</span>
              <div
                className="w-full rounded-t bg-primary"
                style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? 4 : 2 }}
                role="img"
                aria-label={`${formatShortDay(date)}: ${count}件`}
              />
              <span className="text-muted-foreground">{formatShortDay(date)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
