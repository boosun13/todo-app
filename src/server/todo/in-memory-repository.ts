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
        .filter((t) => t.archivedAt === null)
        .filter((t) => filter === "all" || t.completed === (filter === "completed"))
        .filter((t) => !priority || t.priority === priority)
        .filter((t) => !needle || matches(t))
        .sort(compare(sort))
        .map(copy);
    },
    async findById(id) {
      const t = store.get(id);
      return t && t.archivedAt === null ? copy(t) : null;
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
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      store.set(todo.id, copy(todo));
      return copy(todo);
    },
    async update(id, patch) {
      const current = store.get(id);
      if (!current || current.archivedAt !== null) return null;
      const { completedAt, ...rest } = patch;
      const defined = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
      const transitions = patch.completed !== undefined && patch.completed !== current.completed;
      const next: Todo = {
        ...current,
        ...defined,
        ...(transitions && completedAt !== undefined && { completedAt }),
        updatedAt: new Date(),
      };
      store.set(id, copy(next));
      return copy(next);
    },
    async delete(id) {
      const todo = store.get(id);
      return todo?.archivedAt === null ? store.delete(id) : false;
    },
    async archiveCompleted(now) {
      const todos = [...store.values()].filter((t) => t.completed && t.archivedAt === null);
      todos.forEach((t) => store.set(t.id, copy({ ...t, archivedAt: now, updatedAt: now })));
      return todos.length;
    },
    async statsSnapshot(today, since) {
      const stored = [...store.values()];
      const all = stored.filter((t) => t.archivedAt === null);
      const active = all.filter((t) => !t.completed);
      const activeByPriority = Object.fromEntries(
        PRIORITIES.map((p) => [p, active.filter((t) => t.priority === p).length]),
      ) as Record<Priority, number>;
      return {
        counts: {
          total: all.length,
          archived: stored.filter((t) => t.archivedAt !== null && t.completed).length,
          completed: all.length - active.length,
          active: active.length,
          overdue: active.filter((t) => t.dueDate && t.dueDate < today).length,
          activeByPriority,
        },
        completedAts: stored.flatMap((t) =>
          t.completedAt && t.completedAt >= since ? [new Date(t.completedAt)] : [],
        ),
      };
    },
  };
};
