import { describe, expect, it } from "vitest";
import { calendarDayIn, dateKeyIn } from "./date";
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
  const today = new Date("2026-10-10T00:00:00Z");
  it("期限が今日より前の未完了だけが期限切れ", () => {
    expect(isOverdue({ completed: false, dueDate: new Date("2026-10-09") }, today)).toBe(true);
    expect(isOverdue({ completed: false, dueDate: new Date("2026-10-10") }, today)).toBe(false);
    expect(isOverdue({ completed: false, dueDate: null }, today)).toBe(false);
    expect(isOverdue({ completed: true, dueDate: new Date("2026-10-09") }, today)).toBe(false);
  });
});

describe("bucketByDay", () => {
  const today = new Date("2026-10-10T00:00:00Z");
  it("今日を含む直近N日を古い順に返し、範囲外は無視する", () => {
    const result = bucketByDay(
      [new Date("2026-10-10T01:00:00Z"), new Date("2026-10-10T20:00:00Z"), new Date("2026-10-08T05:00:00Z"), new Date("2026-09-01T00:00:00Z")],
      today,
      3,
      "UTC",
    );
    expect(result).toEqual([
      { date: "2026-10-08", count: 1 },
      { date: "2026-10-09", count: 0 },
      { date: "2026-10-10", count: 2 },
    ]);
  });
});

describe("タイムゾーンごとの暦日", () => {
  it.each([
    ["Asia/Tokyo", "2026-10-11", true],
    ["UTC", "2026-10-10", false],
    ["America/Los_Angeles", "2026-10-10", false],
  ])("同じ瞬間でも %s の今日で期限切れを判断する", (timeZone, key, overdue) => {
    const instant = new Date("2026-10-10T23:30:00Z");
    const today = calendarDayIn(instant, timeZone);
    expect(dateKeyIn(instant, timeZone)).toBe(key);
    expect(today).toEqual(new Date(`${key}T00:00:00Z`));
    expect(isOverdue({ completed: false, dueDate: new Date("2026-10-10") }, today)).toBe(overdue);
  });

  it("負のオフセットでは UTC の前日になる", () => {
    expect(dateKeyIn(new Date("2026-10-11T01:00:00Z"), "America/Los_Angeles")).toBe("2026-10-10");
  });

  it("JST 08:00 の完了は当日に入り、範囲外は捨てる", () => {
    expect(bucketByDay([
      new Date("2026-10-09T23:00:00Z"),
      new Date("2026-10-08T14:59:59Z"),
      new Date("2026-10-10T15:00:00Z"),
    ], new Date("2026-10-10"), 2, "Asia/Tokyo")).toEqual([
      { date: "2026-10-09", count: 0 },
      { date: "2026-10-10", count: 1 },
    ]);
  });

  it("夏時間終了日の重複する現地時刻も同じ暦日に数える", () => {
    expect(bucketByDay([
      new Date("2026-11-01T08:30:00Z"),
      new Date("2026-11-01T09:30:00Z"),
    ], new Date("2026-11-01"), 1, "America/Los_Angeles")).toEqual([
      { date: "2026-11-01", count: 2 },
    ]);
  });
});
