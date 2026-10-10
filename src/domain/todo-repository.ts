import type { TodoCounts } from "./stats";
import type { CreateTodoInput, Todo, TodoQuery, UpdateTodoInput } from "./todo";

/** 更新内容 + 完了日時(完了状態の変化に伴い service が決める) */
export type TodoPatch = UpdateTodoInput & { completedAt?: Date | null };

/** 永続化の抽象。実装(Prisma等)は server 層が持ち、domain は何にも依存しない。 */
export interface TodoRepository {
  findMany(query: TodoQuery): Promise<Todo[]>;
  findById(id: string): Promise<Todo | null>;
  create(input: CreateTodoInput): Promise<Todo>;
  /** 対象が存在しない場合は null */
  update(id: string, patch: TodoPatch): Promise<Todo | null>;
  /** 削除できたら true、存在しなければ false */
  delete(id: string): Promise<boolean>;
  deleteCompleted(): Promise<number>;
  /** now より前の期限で未完了のものを overdue として数える */
  counts(now: Date): Promise<TodoCounts>;
  completedAtSince(since: Date): Promise<Date[]>;
}
