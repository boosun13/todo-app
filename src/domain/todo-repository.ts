import type { TodoCounts } from "./stats";
import type { CreateTodoInput, Todo, TodoQuery, UpdateTodoInput } from "./todo";

/** 更新内容 + 完了日時(完了状態の変化に伴い service が決める) */
export type TodoPatch = UpdateTodoInput & { completedAt?: Date | null };

/** 永続化の抽象。実装(Prisma等)は server 層が持ち、domain は何にも依存しない。 */
export interface TodoRepository {
  findMany(query: TodoQuery): Promise<Todo[]>;
  findById(id: string): Promise<Todo | null>;
  create(input: CreateTodoInput): Promise<Todo>;
  /**
   * 対象が存在しない場合は null。
   * patch.completed が現在値と異なる(遷移する)ときだけ patch.completedAt を適用し、
   * 同じ状態の再送では completedAt を変えない。
   */
  update(id: string, patch: TodoPatch): Promise<Todo | null>;
  /** 削除できたら true、存在しなければ false */
  delete(id: string): Promise<boolean>;
  /** 完了済みかつ未アーカイブの行をアーカイブし、件数を返す */
  archiveCompleted(now: Date): Promise<number>;
  /**
   * 統計の元データを同一時点のスナップショットで返す。
   * today (UTC 0 時で表す暦日) より前の期限で未完了のものを overdue として数える。
   * counts は未アーカイブが対象(archived は例外)。完了日時はアーカイブ済みも含め since (瞬間) 以降。
   */
  statsSnapshot(today: Date, since: Date): Promise<{ counts: TodoCounts; completedAts: Date[] }>;
}
