/**
 * 期限は「日付のみ」の概念として扱い、UTC 0 時の Date で表す
 * (DB は @db.Date、API/フォームは YYYY-MM-DD)。タイムゾーンによる日付ずれを防ぐ。
 */
export const startOfUtcDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const toDateKey = (d: Date): string => d.toISOString().slice(0, 10);

export const addUtcDays = (d: Date, days: number): Date =>
  new Date(d.getTime() + days * 86_400_000);

/** 瞬間を指定タイムゾーンの暦日キーに変換する。環境のローカル TZ には依存しない。 */
export function dateKeyIn(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** 指定タイムゾーンでの暦日を、期限と比較できる UTC 0 時の Date として返す。 */
export const calendarDayIn = (instant: Date, timeZone: string): Date =>
  new Date(`${dateKeyIn(instant, timeZone)}T00:00:00.000Z`);
