import { NotFoundError } from "@/domain/errors";
import { bucketByDay, type TodoStats } from "@/domain/stats";
import { addUtcDays, startOfUtcDay } from "@/domain/date";
import {
  createTodoSchema,
  updateTodoSchema,
  todoQuerySchema,
  type Todo,
} from "@/domain/todo";
import type { TodoRepository } from "@/domain/todo-repository";

const STATS_DAYS = 7;

/**
 * ユースケース層。入力検証・ドメインルール(完了日時の管理など)・ドメインエラーの発行を担い、
 * 永続化の詳細は TodoRepository に隠蔽する。
 * 入力は unknown で受け、境界(Action / Route Handler)の型を信用しない。
 * 時刻は clock として注入し、テストで固定できるようにする。
 */
export const createTodoService = (repo: TodoRepository, clock: () => Date = () => new Date()) => ({
  async list(query: unknown = {}): Promise<Todo[]> {
    return repo.findMany(todoQuerySchema.parse(query));
  },

  async get(id: string): Promise<Todo> {
    const todo = await repo.findById(id);
    if (!todo) throw new NotFoundError("Todo");
    return todo;
  },

  async add(input: unknown): Promise<Todo> {
    return repo.create(createTodoSchema.parse(input));
  },

  async update(id: string, input: unknown): Promise<Todo> {
    const patch = updateTodoSchema.parse(input);
    // 完了状態の変化に合わせて完了日時を保つ(統計の元データになる)
    const completedAt =
      patch.completed === undefined ? undefined : patch.completed ? clock() : null;
    const todo = await repo.update(id, { ...patch, completedAt });
    if (!todo) throw new NotFoundError("Todo");
    return todo;
  },

  async remove(id: string): Promise<void> {
    if (!(await repo.delete(id))) throw new NotFoundError("Todo");
  },

  clearCompleted: (): Promise<number> => repo.deleteCompleted(),

  async stats(): Promise<TodoStats> {
    const now = clock();
    const since = addUtcDays(startOfUtcDay(now), -(STATS_DAYS - 1));
    const [counts, completedAts] = await Promise.all([
      repo.counts(now),
      repo.completedAtSince(since),
    ]);
    return {
      ...counts,
      completionRate: counts.total === 0 ? 0 : counts.completed / counts.total,
      completedPerDay: bucketByDay(completedAts, now, STATS_DAYS),
    };
  },
});

export type TodoService = ReturnType<typeof createTodoService>;
