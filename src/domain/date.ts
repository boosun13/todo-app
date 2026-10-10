/**
 * 期限は「日付のみ」の概念として扱い、アプリ全体で UTC 暦日に統一する
 * (DB は @db.Date、API/フォームは YYYY-MM-DD)。タイムゾーンによる日付ずれを防ぐ。
 */
export const startOfUtcDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const toDateKey = (d: Date): string => d.toISOString().slice(0, 10);

export const addUtcDays = (d: Date, days: number): Date =>
  new Date(d.getTime() + days * 86_400_000);
