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
  // 呼び出し側の変更が保存データに影響しないよう、出入りの両方でコピーする
  const copy = (t: Todo): Todo => structuredClone(t);

  return {
    async findMany({ filter, priority, q, sort }) {
      const needle = q.toLowerCase();
      const matches = (t: Todo) =>
        t.title.toLowerCase().includes(needle) || t.description.toLowerCase().includes(needle);
      return [...store.values()]
        .filter((t) => filter === "all" || t.completed === (filter === "completed"))
        .filter((t) => !priority || t.priority === priority)
        .filter((t) => !needle || matches(t))
        .sort(compare(sort))
        .map(copy);
    },
    async findById(id) {
      const t = store.get(id);
      return t ? copy(t) : null;
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
      return copy(todo);
    },
    async update(id, patch) {
      const current = store.get(id);
      if (!current) return null;
      const { completedAt, ...rest } = patch;
      const defined = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
      const transitions = patch.completed !== undefined && patch.completed !== current.completed;
      const next: Todo = {
        ...current,
        ...defined,
        ...(transitions && completedAt !== undefined && { completedAt }),
        updatedAt: new Date(),
      };
      store.set(id, next);
      return copy(next);
    },
    async delete(id) {
      return store.delete(id);
    },
    async deleteCompleted() {
      const ids = [...store.values()].filter((t) => t.completed).map((t) => t.id);
      ids.forEach((id) => store.delete(id));
      return ids.length;
    },
    async statsSnapshot(now, since) {
      const all = [...store.values()];
      const active = all.filter((t) => !t.completed);
      const activeByPriority = Object.fromEntries(
        PRIORITIES.map((p) => [p, active.filter((t) => t.priority === p).length]),
      ) as Record<Priority, number>;
      return {
        counts: {
          total: all.length,
          completed: all.length - active.length,
          active: active.length,
          overdue: active.filter((t) => t.dueDate && t.dueDate < startOfUtcDay(now)).length,
          activeByPriority,
        },
        completedAts: all.flatMap((t) =>
          t.completedAt && t.completedAt >= since ? [new Date(t.completedAt)] : [],
        ),
      };
    },
  };
};
