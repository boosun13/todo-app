import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABEL, type Priority } from "@/domain/todo";
import { cn } from "@/lib/utils";

const STYLE: Record<Priority, string> = {
  HIGH: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant="secondary" className={cn("border-0", STYLE[priority])}>
      優先度 {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
