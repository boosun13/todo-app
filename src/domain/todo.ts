import { z } from "zod";

export const TITLE_MAX_LENGTH = 100;

export const todoFilterSchema = z.enum(["all", "active", "completed"]);
export type TodoFilter = z.infer<typeof todoFilterSchema>;

export const createTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(TITLE_MAX_LENGTH, `タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`),
});
export type CreateTodoInput = z.infer<typeof createTodoSchema>;

export const updateTodoSchema = z
  .object({
    title: createTodoSchema.shape.title.optional(),
    completed: z.boolean().optional(),
  })
  .refine((v) => v.title !== undefined || v.completed !== undefined, {
    message: "更新する項目を指定してください",
  });
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
};
