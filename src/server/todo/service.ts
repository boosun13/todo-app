import { z } from "zod";
import { NotFoundError } from "@/domain/errors";
import { bucketByDay, type TodoStats } from "@/domain/stats";
import { addUtcDays, calendarDayIn } from "@/domain/date";
import {
  createTodoSchema,
  updateTodoSchema,
  todoQuerySchema,
  type Todo,
} from "@/domain/todo";
import type { TodoRepository } from "@/domain/todo-repository";

const STATS_DAYS = 7;

/** 境界の型を信用しない。undefined 等が Prisma の where:{} になるのを防ぐ */
const idSchema = z.string().min(1);
const parseId = (id: unknown): string => idSchema.parse(id);

/**
 * ユースケース層。入力検証・ドメインルール(完了日時の管理など)・ドメインエラーの発行を担い、
 * 永続化の詳細は TodoRepository に隠蔽する。
 * 入力は unknown で受け、境界(Action / Route Handler)の型を信用しない。
 * 時刻は clock として注入し、テストで固定できるようにする。
 */
export const createTodoService = (
  repo: TodoRepository,
  { clock = () => new Date(), timeZone = "Asia/Tokyo" }: { clock?: () => Date; timeZone?: string } = {},
) => ({
  today: (): Date => calendarDayIn(clock(), timeZone),

  async list(query: unknown = {}): Promise<Todo[]> {
    return repo.findMany(todoQuerySchema.parse(query));
  },

  async get(id: string): Promise<Todo> {
    const todo = await repo.findById(parseId(id));
    if (!todo) throw new NotFoundError("Todo");
    return todo;
  },

  async add(input: unknown): Promise<Todo> {
    return repo.create(createTodoSchema.parse(input));
  },

  async update(id: string, input: unknown): Promise<Todo> {
    const validId = parseId(id);
    const patch = updateTodoSchema.parse(input);
    // 完了状態の変化に合わせて完了日時を保つ(統計の元データになる)
    const completedAt =
      patch.completed === undefined ? undefined : patch.completed ? clock() : null;
    const todo = await repo.update(validId, { ...patch, completedAt });
    if (!todo) throw new NotFoundError("Todo");
    return todo;
  },

  async remove(id: string): Promise<void> {
    if (!(await repo.delete(parseId(id)))) throw new NotFoundError("Todo");
  },

  clearCompleted: (): Promise<number> => repo.archiveCompleted(clock()),

  async stats(): Promise<TodoStats> {
    const today = calendarDayIn(clock(), timeZone);
    // 正の UTC オフセットでも最初の日の現地 0 時を取りこぼさない余裕を持たせる
    const since = addUtcDays(today, -STATS_DAYS);
    const { counts, completedAts } = await repo.statsSnapshot(today, since);
    const cumulativeTotal = counts.total + counts.archived;
    return {
      ...counts,
      completionRate: cumulativeTotal === 0 ? 0 : (counts.completed + counts.archived) / cumulativeTotal,
      completedPerDay: bucketByDay(completedAts, today, STATS_DAYS, timeZone),
    };
  },
});

export type TodoService = ReturnType<typeof createTodoService>;
