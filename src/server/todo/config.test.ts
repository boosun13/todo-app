import { afterEach, expect, it, vi } from "vitest";
import { formatDateTime } from "@/lib/format";

vi.mock("server-only", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it.each([undefined, "UTC", "America/Los_Angeles"])("APP_TIME_ZONE=%s を読み取る", async (timeZone) => {
  vi.stubEnv("APP_TIME_ZONE", timeZone);
  const config = await import("../config");
  expect(config.APP_TIME_ZONE).toBe(timeZone ?? "Asia/Tokyo");
});

it.each(["Invalid/TimeZone", "", "+09:00"])("不正な IANA 名 %j は明確なエラー", async (timeZone) => {
  vi.stubEnv("APP_TIME_ZONE", timeZone);
  await expect(import("../config")).rejects.toThrow("APP_TIME_ZONE に有効な IANA タイムゾーン名を指定してください");
});

it.each([
  ["Asia/Tokyo", "2026/10/11 08:30"],
  ["UTC", "2026/10/10 23:30"],
  ["America/Los_Angeles", "2026/10/10 16:30"],
])("日時表示は %s の暦日と時刻に従う", (timeZone, expected) => {
  expect(formatDateTime(new Date("2026-10-10T23:30:00Z"), timeZone)).toBe(expected);
});
