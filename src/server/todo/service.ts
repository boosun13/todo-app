import { NotFoundError } from "@/domain/errors";
import {
  createTodoSchema,
  updateTodoSchema,
  type Todo,
  type TodoFilter,
} from "@/domain/todo";
import type { TodoRepository } from "@/domain/todo-repository";

/**
 * ユースケース層。入力検証とドメインエラーの発行を担い、
 * 永続化の詳細は TodoRepository に隠蔽する。
 * 入力は unknown で受け、境界(Action / Route Handler)の型を信用しない。
 */
export const createTodoService = (repo: TodoRepository) => ({
  list: (filter: TodoFilter = "all"): Promise<Todo[]> => repo.findMany(filter),

  countActive: (): Promise<number> => repo.countActive(),

  async add(input: unknown): Promise<Todo> {
    return repo.create(createTodoSchema.parse(input));
  },

  async update(id: string, input: unknown): Promise<Todo> {
    const todo = await repo.update(id, updateTodoSchema.parse(input));
    if (!todo) throw new NotFoundError("Todo");
    return todo;
  },

  async remove(id: string): Promise<void> {
    if (!(await repo.delete(id))) throw new NotFoundError("Todo");
  },

  clearCompleted: (): Promise<number> => repo.deleteCompleted(),
});

export type TodoService = ReturnType<typeof createTodoService>;
