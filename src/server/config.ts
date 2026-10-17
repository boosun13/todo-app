import "server-only";

/** 環境変数の読み取りと検証は server 層に閉じ込める。 */
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE ?? "Asia/Tokyo";

try {
  if (/^[+-]/.test(APP_TIME_ZONE)) throw new RangeError("固定オフセットは IANA 名ではありません");
  new Intl.DateTimeFormat("ja-JP", { timeZone: APP_TIME_ZONE });
} catch {
  throw new Error(`APP_TIME_ZONE に有効な IANA タイムゾーン名を指定してください: ${APP_TIME_ZONE}`);
}
