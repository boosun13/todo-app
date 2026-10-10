import type { CreateTodoInput, Todo, TodoFilter, UpdateTodoInput } from "./todo";

/** 永続化の抽象。実装(Prisma等)は server 層が持ち、domain は何にも依存しない。 */
export interface TodoRepository {
  findMany(filter: TodoFilter): Promise<Todo[]>;
  create(input: CreateTodoInput): Promise<Todo>;
  /** 対象が存在しない場合は null */
  update(id: string, input: UpdateTodoInput): Promise<Todo | null>;
  /** 削除できたら true、存在しなければ false */
  delete(id: string): Promise<boolean>;
  deleteCompleted(): Promise<number>;
  countActive(): Promise<number>;
}
