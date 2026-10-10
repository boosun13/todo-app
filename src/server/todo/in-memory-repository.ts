import { startOfUtcDay } from "@/domain/date";
import { PRIORITIES, type Priority, type Todo, type TodoQuery } from "@/domain/todo";
import type { TodoRepository } from "@/domain/todo-repository";

const PRIORITY_RANK: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };

const compare = (sort: TodoQuery["sort"]) => (a: Todo, b: Todo) => {
  const byCreated = b.createdAt.getTime() - a.createdAt.getTime();
  if (sort === "priority") return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || byCreated;
  if (sort === "due") {
    if (!a.dueDate && !b.dueDate) return byCreated;
    if (!a.dueDate) return 1; // 期限なしは末尾
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime() || byCreated;
  }
  return byCreated;
};

/** テスト用の TodoRepository 実装(DB 不要で service を検証できる) */
export const createInMemoryTodoRepository = (): TodoRepository => {
  const store = new Map<string, Todo>();
  let seq = 0;

  return {
    async findMany({ filter, priority, q, sort }) {
      const needle = q.toLowerCase();
      return [...store.values()]
        .filter((t) => filter === "all" || t.completed === (filter === "completed"))
        .filter((t) => !priority || t.priority === priority)
        .filter((t) => !needle || `${t.title}\n${t.description}`.toLowerCase().includes(needle))
        .sort(compare(sort));
    },
    async findById(id) {
      return store.get(id) ?? null;
    },
    async create({ title, description, priority, dueDate }) {
      // 作成順が createdAt に反映されるよう単調増加させる
      const now = new Date(Date.UTC(2026, 0, 1) + ++seq);
      const todo: Todo = {
        id: String(seq),
        title,
        description,
        priority,
        dueDate: dueDate ?? null,
        completed: false,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      store.set(todo.id, todo);
      return todo;
    },
    async update(id, patch) {
      const current = store.get(id);
      if (!current) return null;
      const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      const next: Todo = { ...current, ...defined, updatedAt: new Date() };
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
    async counts(now) {
      const all = [...store.values()];
      const active = all.filter((t) => !t.completed);
      const activeByPriority = Object.fromEntries(
        PRIORITIES.map((p) => [p, active.filter((t) => t.priority === p).length]),
      ) as Record<Priority, number>;
      return {
        total: all.length,
        completed: all.length - active.length,
        active: active.length,
        overdue: active.filter((t) => t.dueDate && t.dueDate < startOfUtcDay(now)).length,
        activeByPriority,
      };
    },
    async completedAtSince(since) {
      return [...store.values()].flatMap((t) =>
        t.completedAt && t.completedAt >= since ? [t.completedAt] : [],
      );
    },
  };
};
