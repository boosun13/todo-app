import type { Todo } from "@/domain/todo";
import type { TodoRepository } from "@/domain/todo-repository";

/** テスト用の TodoRepository 実装(DB 不要で service を検証できる) */
export const createInMemoryTodoRepository = (): TodoRepository => {
  const store = new Map<string, Todo>();
  let seq = 0;

  return {
    async findMany(filter) {
      return [...store.values()]
        .filter((t) => filter === "all" || t.completed === (filter === "completed"))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
    async create({ title }) {
      const now = new Date(Date.now() + seq);
      const todo: Todo = { id: String(++seq), title, completed: false, createdAt: now, updatedAt: now };
      store.set(todo.id, todo);
      return todo;
    },
    async update(id, input) {
      const current = store.get(id);
      if (!current) return null;
      const next = { ...current, ...input, updatedAt: new Date() };
      store.set(id, next);
      return next;
    },
    async delete(id) {
      return store.delete(id);
    },
    async deleteCompleted() {
      const ids = [...store.values()].filter((t) => t.completed).map((t) => t.id);
      ids.forEach((id) => store.delete(id));
      return ids.length;
    },
    async countActive() {
      return [...store.values()].filter((t) => !t.completed).length;
    },
  };
};
