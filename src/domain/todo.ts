import { z } from "zod";
import { startOfUtcDay } from "./date";

export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MAX_LENGTH = 500;

export const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type Priority = z.infer<typeof prioritySchema>;
export const PRIORITIES = prioritySchema.options;

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
};

/** フォーム(""=未設定)・API(null/省略) のどちらの期限入力も受け、Date | null に正規化する */
const dueDateSchema = z
  .string()
  .transform((s, ctx) => {
    if (s === "") return null;
    const d = new Date(s);
    // 2026-02-31 のような存在しない日付は繰り上がるので、往復して一致するかで判定する
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s)) return d;
    ctx.addIssue({ code: "custom", message: "期限は YYYY-MM-DD 形式の正しい日付で入力してください" });
    return z.NEVER;
  })
  .nullable()
  .optional();

const titleSchema = z
  .string()
  .trim()
  .min(1, "タイトルを入力してください")
  .max(TITLE_MAX_LENGTH, `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`);

export const createTodoSchema = z.object({
  title: titleSchema,
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX_LENGTH, `メモは${DESCRIPTION_MAX_LENGTH}文字以内で入力してください`)
    .default(""),
  priority: prioritySchema.default("MEDIUM"),
  dueDate: dueDateSchema,
});
export type CreateTodoInput = z.output<typeof createTodoSchema>;
export type CreateTodoFormValues = z.input<typeof createTodoSchema>;

export const updateTodoSchema = createTodoSchema
  .partial()
  .extend({ completed: z.boolean().optional() })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "更新する項目を指定してください",
  });
export type UpdateTodoInput = z.output<typeof updateTodoSchema>;

export const todoFilterSchema = z.enum(["all", "active", "completed"]);
export type TodoFilter = z.infer<typeof todoFilterSchema>;

export const todoSortSchema = z.enum(["created", "due", "priority"]);
export type TodoSort = z.infer<typeof todoSortSchema>;

export const SORT_LABEL: Record<TodoSort, string> = {
  created: "作成日が新しい順",
  due: "期限が近い順",
  priority: "優先度が高い順",
};

export const todoQuerySchema = z.object({
  filter: todoFilterSchema.default("all"),
  sort: todoSortSchema.default("created"),
  priority: prioritySchema.optional(),
  q: z.string().trim().max(100).default(""),
});
export type TodoQuery = z.output<typeof todoQuerySchema>;

export type Todo = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const isOverdue = (todo: Pick<Todo, "completed" | "dueDate">, now: Date): boolean =>
  !todo.completed && todo.dueDate !== null && todo.dueDate < startOfUtcDay(now);
