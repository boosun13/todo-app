import { Prisma, type PrismaClient } from "@prisma/client";
import { startOfUtcDay } from "@/domain/date";
import { PRIORITIES, type Priority, type TodoQuery } from "@/domain/todo";
import type { TodoRepository } from "@/domain/todo-repository";

const buildWhere = ({ filter, priority, q }: TodoQuery): Prisma.TodoWhereInput => ({
  ...(filter !== "all" && { completed: filter === "completed" }),
  ...(priority && { priority }),
  ...(q && {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
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
    try {
      return await db.todo.update({ where: { id }, data: patch });
    } catch (e) {
      if (isRecordNotFound(e)) return null;
      throw e;
    }
  },

  async delete(id) {
    const { count } = await db.todo.deleteMany({ where: { id } });
    return count > 0;
  },

  async deleteCompleted() {
    const { count } = await db.todo.deleteMany({ where: { completed: true } });
    return count;
  },

  async counts(now) {
    const [total, completed, overdue, grouped] = await Promise.all([
      db.todo.count(),
      db.todo.count({ where: { completed: true } }),
      db.todo.count({ where: { completed: false, dueDate: { lt: startOfUtcDay(now) } } }),
      db.todo.groupBy({ by: ["priority"], where: { completed: false }, _count: { _all: true } }),
    ]);
    const activeByPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<Priority, number>;
    for (const g of grouped) activeByPriority[g.priority] = g._count._all;
    return { total, completed, active: total - completed, overdue, activeByPriority };
  },

  async completedAtSince(since) {
    const rows = await db.todo.findMany({
      where: { completedAt: { gte: since } },
      select: { completedAt: true },
    });
    return rows.flatMap((r) => (r.completedAt ? [r.completedAt] : []));
  },
});
