import { addUtcDays, dateKeyIn, toDateKey } from "./date";
import type { Priority } from "./todo";

export type TodoCounts = {
  total: number;
  /** アーカイブ済みの完了 TODO 数 */
  archived: number;
  active: number;
  completed: number;
  overdue: number;
  activeByPriority: Record<Priority, number>;
};

export type DailyCount = { date: string; count: number };

export type TodoStats = TodoCounts & {
  /** アーカイブ済み完了を含む累計の達成率。0〜1、累計 0 件のときは 0 */
  completionRate: number;
  /** 直近 N 日(古い順、今日を含む)の完了数 */
  completedPerDay: DailyCount[];
};

/** 完了日時の一覧を、今日を含む直近 days 日の日別件数に集計する(純粋関数) */
export function bucketByDay(dates: Date[], today: Date, days: number, timeZone: string): DailyCount[] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) buckets.set(toDateKey(addUtcDays(today, -i)), 0);
  for (const d of dates) {
    const key = dateKeyIn(d, timeZone);
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + 1);
  }
  return [...buckets].map(([date, count]) => ({ date, count }));
}
