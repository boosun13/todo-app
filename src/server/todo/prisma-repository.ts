import { Prisma, type PrismaClient } from "@prisma/client";
import type { TodoFilter } from "@/domain/todo";
import type { TodoRepository } from "@/domain/todo-repository";

const whereByFilter = (filter: TodoFilter): Prisma.TodoWhereInput => {
  switch (filter) {
    case "active":
      return { completed: false };
    case "completed":
      return { completed: true };
    default:
      return {};
  }
};

const isRecordNotFound = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";

export const createPrismaTodoRepository = (db: PrismaClient): TodoRepository => ({
  findMany: (filter) =>
    db.todo.findMany({
      where: whereByFilter(filter),
      orderBy: { createdAt: "desc" },
    }),

  create: (input) => db.todo.create({ data: input }),

  async update(id, input) {
    try {
      return await db.todo.update({ where: { id }, data: input });
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

  countActive: () => db.todo.count({ where: { completed: false } }),
});
