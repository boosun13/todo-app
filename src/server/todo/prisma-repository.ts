import { Prisma, type PrismaClient } from "@prisma/client";
import { startOfUtcDay } from "@/domain/date";
import { PRIORITIES, type Priority, type TodoQuery } from "@/domain/todo";
import type { TodoRepository } from "@/domain/todo-repository";

/** LIKE のメタ文字(\ % _)をリテラルとして扱うためにエスケープする(PostgreSQL の既定 ESCAPE は \) */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

const buildWhere = ({ filter, priority, q }: TodoQuery): Prisma.TodoWhereInput => ({
  ...(filter !== "all" && { completed: filter === "completed" }),
  ...(priority && { priority }),
  ...(q && {
    OR: [
      { title: { contains: escapeLike(q), mode: "insensitive" } },
      { description: { contains: escapeLike(q), mode: "insensitive" } },
    ],
  }),
});

const buildOrderBy = (sort: TodoQuery["sort"]): Prisma.TodoOrderByWithRelationInput[] => {
  switch (sort) {
    case "due":
      return [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "priority":
      // enum は宣言順(LOW < MEDIUM < HIGH)で並ぶ
      return [{ priority: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
};

const isRecordNotFound = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";

export const createPrismaTodoRepository = (db: PrismaClient): TodoRepository => ({
  findMany: (query) =>
    db.todo.findMany({ where: buildWhere(query), orderBy: buildOrderBy(query.sort) }),

  findById: (id) => db.todo.findUnique({ where: { id } }),

  create: (input) => db.todo.create({ data: input }),

  async update(id, patch) {
    const { completedAt, completed, ...rest } = patch;
    try {
      if (completed !== undefined) {
        // 未完了→完了(または逆)の遷移時だけ completedAt を設定する条件付き更新(原子的)
        const { count } = await db.todo.updateMany({
          where: { id, completed: !completed },
          data: { ...rest, completed, completedAt },
        });
        if (count > 0) return await db.todo.findUnique({ where: { id } });
      }
      // 遷移しない(同状態の再送・完了に無関係な更新)場合は completedAt に触れない
      if (Object.values(rest).every((v) => v === undefined)) {
        return await db.todo.findUnique({ where: { id } });
      }
      return await db.todo.update({ where: { id }, data: rest });
    } catch (e) {
      if (isRecordNotFound(e)) return null;
      throw e;
    }
  },

  async delete(id) {
    try {
      await db.todo.delete({ where: { id } });
      return true;
    } catch (e) {
      if (isRecordNotFound(e)) return false;
      throw e;
    }
  },

  async deleteCompleted() {
    const { count } = await db.todo.deleteMany({ where: { completed: true } });
    return count;
  },

  async statsSnapshot(now, since) {
    // 同一スナップショットで読むため Repeatable Read のトランザクションにまとめる
    const [total, completed, overdue, grouped, rows] = await db.$transaction(
      async (tx) => [
        await tx.todo.count(),
        await tx.todo.count({ where: { completed: true } }),
        await tx.todo.count({ where: { completed: false, dueDate: { lt: startOfUtcDay(now) } } }),
        await tx.todo.groupBy({ by: ["priority"], where: { completed: false }, _count: { _all: true } }),
        await tx.todo.findMany({ where: { completedAt: { gte: since } }, select: { completedAt: true } }),
      ] as const,
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const activeByPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<Priority, number>;
    for (const g of grouped) activeByPriority[g.priority] = g._count._all;
    return {
      counts: { total, completed, active: total - completed, overdue, activeByPriority },
      completedAts: rows.flatMap((r) => (r.completedAt ? [r.completedAt] : [])),
    };
  },
});
