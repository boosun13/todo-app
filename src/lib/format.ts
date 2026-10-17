import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { toDateKey } from "@/domain/date";

/** 期限(UTC 暦日)を、閲覧者のタイムゾーンに依らず同じ日付で表示する */
export const formatDueDate = (d: Date) => format(parseISO(toDateKey(d)), "M月d日(E)", { locale: ja });

export const formatDateTime = (d: Date, timeZone?: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);

export const formatShortDay = (dateKey: string) => format(parseISO(dateKey), "M/d", { locale: ja });
