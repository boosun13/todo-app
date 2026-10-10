import { describe, expect, it } from "vitest";
import { bucketByDay } from "./stats";
import { isOverdue, updateTodoSchema } from "./todo";

describe("updateTodoSchema", () => {
  it("いずれか1項目があればよい", () => {
    expect(updateTodoSchema.safeParse({ completed: true }).success).toBe(true);
    expect(updateTodoSchema.safeParse({ title: "x" }).success).toBe(true);
    expect(updateTodoSchema.safeParse({ priority: "HIGH" }).success).toBe(true);
  });
  it("空オブジェクトは拒否する", () => {
    expect(updateTodoSchema.safeParse({}).success).toBe(false);
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-10-10T23:59:00Z");
  it("期限が今日より前の未完了だけが期限切れ", () => {
    expect(isOverdue({ completed: false, dueDate: new Date("2026-10-09") }, now)).toBe(true);
    expect(isOverdue({ completed: false, dueDate: new Date("2026-10-10") }, now)).toBe(false);
    expect(isOverdue({ completed: false, dueDate: null }, now)).toBe(false);
    expect(isOverdue({ completed: true, dueDate: new Date("2026-10-09") }, now)).toBe(false);
  });
});

describe("bucketByDay", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  it("今日を含む直近N日を古い順に返し、範囲外は無視する", () => {
    const result = bucketByDay(
      [new Date("2026-10-10T01:00:00Z"), new Date("2026-10-10T20:00:00Z"), new Date("2026-10-08T05:00:00Z"), new Date("2026-09-01T00:00:00Z")],
      now,
      3,
    );
    expect(result).toEqual([
      { date: "2026-10-08", count: 1 },
      { date: "2026-10-09", count: 0 },
      { date: "2026-10-10", count: 2 },
    ]);
  });
});
