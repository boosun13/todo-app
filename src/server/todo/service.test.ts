import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { NotFoundError } from "@/domain/errors";
import type { TodoRepository } from "@/domain/todo-repository";
import { createInMemoryTodoRepository } from "./in-memory-repository";
import { createTodoService, type TodoService } from "./service";

const NOW = new Date("2026-10-10T12:00:00Z");

describe("todoService", () => {
  let service: TodoService;
  let repo: TodoRepository;
  beforeEach(() => {
    repo = createInMemoryTodoRepository();
    service = createTodoService(repo, () => NOW);
  });

  describe("add", () => {
    it("前後の空白を除去し、既定値(優先度 MEDIUM・期限なし)で作成する", async () => {
      const todo = await service.add({ title: "  牛乳を買う  " });
      expect(todo).toMatchObject({
        title: "牛乳を買う",
        description: "",
        priority: "MEDIUM",
        dueDate: null,
        completed: false,
        completedAt: null,
      });
    });

    it("フォーム由来の期限 YYYY-MM-DD を UTC 暦日の Date にする。空文字は期限なし", async () => {
      const a = await service.add({ title: "a", dueDate: "2026-10-20" });
      const b = await service.add({ title: "b", dueDate: "" });
      expect(a.dueDate).toEqual(new Date("2026-10-20T00:00:00Z"));
      expect(b.dueDate).toBeNull();
    });

    it.each([
      [{ title: "" }],
      [{ title: "   " }],
      [{ title: "a".repeat(101) }],
      [{}],
      [{ title: "a", description: "x".repeat(501) }],
      [{ title: "a", priority: "URGENT" }],
      [{ title: "a", dueDate: "2026/10/20" }],
      [{ title: "a", dueDate: "2026-02-31" }],
      [undefined],
    ])("不正な入力(%j)は ZodError", async (input) => {
      await expect(service.add(input)).rejects.toBeInstanceOf(ZodError);
    });
  });

  describe("update", () => {
    it("完了にすると completedAt が記録され、戻すと消える", async () => {
      const { id } = await service.add({ title: "a" });
      expect(await service.update(id, { completed: true })).toMatchObject({
        completed: true,
        completedAt: NOW,
      });
      expect(await service.update(id, { completed: false })).toMatchObject({
        completed: false,
        completedAt: null,
      });
    });

    it("完了済みに completed:true を再送しても completedAt は上書きされない", async () => {
      const { id } = await service.add({ title: "a" });
      await service.update(id, { completed: true });
      const later = createTodoService(repo, () => new Date("2026-10-11T00:00:00Z"));
      expect(await later.update(id, { completed: true })).toMatchObject({ completed: true, completedAt: NOW });
      expect(await later.update(id, { completed: true, title: "b" })).toMatchObject({
        title: "b",
        completedAt: NOW,
      });
    });

    it("完了状態に触れない更新では completedAt を変えない", async () => {
      const { id } = await service.add({ title: "a" });
      await service.update(id, { completed: true });
      expect(await service.update(id, { title: "b" })).toMatchObject({ title: "b", completedAt: NOW });
    });

    it("期限を null で解除できる", async () => {
      const { id } = await service.add({ title: "a", dueDate: "2026-10-20" });
      expect((await service.update(id, { dueDate: null })).dueDate).toBeNull();
    });

    it("更新項目が空なら ZodError", async () => {
      const { id } = await service.add({ title: "a" });
      await expect(service.update(id, {})).rejects.toBeInstanceOf(ZodError);
    });

    it("存在しない id は NotFoundError", async () => {
      await expect(service.update("nope", { completed: true })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("get / remove", () => {
    it("存在しない id は NotFoundError", async () => {
      await expect(service.get("nope")).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.remove("nope")).rejects.toBeInstanceOf(NotFoundError);
    });

    it.each([[undefined], [null], [""], [123], [{}]])(
      "不正な id(%j)は ZodError で、他の TODO は削除されない",
      async (bad) => {
        await service.add({ title: "a" });
        await service.add({ title: "b" });
        await expect(service.remove(bad as never)).rejects.toBeInstanceOf(ZodError);
        await expect(service.update(bad as never, { title: "x" })).rejects.toBeInstanceOf(ZodError);
        await expect(service.get(bad as never)).rejects.toBeInstanceOf(ZodError);
        expect(await service.list()).toHaveLength(2);
      },
    );

    it("削除後は取得できない", async () => {
      const { id } = await service.add({ title: "a" });
      await service.remove(id);
      await expect(service.get(id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await service.add({ title: "牛乳", priority: "LOW", dueDate: "2026-10-30" });
      await service.add({ title: "レポート", description: "月次の集計", priority: "HIGH", dueDate: "2026-10-12" });
      await service.add({ title: "掃除", priority: "MEDIUM" });
    });

    const titles = async (query: unknown) => (await service.list(query)).map((t) => t.title);

    it("既定は作成日の新しい順", async () => {
      expect(await titles({})).toEqual(["掃除", "レポート", "牛乳"]);
    });

    it("期限順は期限なしが末尾", async () => {
      expect(await titles({ sort: "due" })).toEqual(["レポート", "牛乳", "掃除"]);
    });

    it("優先度順は HIGH が先頭", async () => {
      expect(await titles({ sort: "priority" })).toEqual(["レポート", "掃除", "牛乳"]);
    });

    it("検索はタイトルとメモを大文字小文字を無視して対象にする", async () => {
      expect(await titles({ q: "集計" })).toEqual(["レポート"]);
      expect(await titles({ q: "牛" })).toEqual(["牛乳"]);
    });

    it("状態・優先度で絞り込める", async () => {
      const [report] = await service.list({ priority: "HIGH" });
      await service.update(report.id, { completed: true });
      expect(await titles({ filter: "completed" })).toEqual(["レポート"]);
      expect(await titles({ filter: "active" })).toEqual(["掃除", "牛乳"]);
      expect(await titles({ filter: "active", priority: "HIGH" })).toEqual([]);
    });

    it("不正な sort は ZodError", async () => {
      await expect(service.list({ sort: "random" })).rejects.toBeInstanceOf(ZodError);
    });
  });

  describe("clearCompleted", () => {
    it("完了済みだけを消して件数を返す", async () => {
      const a = await service.add({ title: "a" });
      await service.add({ title: "b" });
      await service.update(a.id, { completed: true });
      expect(await service.clearCompleted()).toBe(1);
      expect(await service.list()).toHaveLength(1);
    });
  });

  describe("stats", () => {
    it("件数・期限切れ・達成率・優先度内訳・日別完了数を集計する", async () => {
      const done = await service.add({ title: "done", priority: "HIGH" });
      await service.add({ title: "late", priority: "HIGH", dueDate: "2026-10-09" }); // 期限切れ
      await service.add({ title: "today", priority: "LOW", dueDate: "2026-10-10" }); // 今日は期限切れでない
      await service.add({ title: "later", priority: "LOW", dueDate: "2026-10-11" });
      await service.update(done.id, { completed: true });

      const stats = await service.stats();

      expect(stats).toMatchObject({
        total: 4,
        completed: 1,
        active: 3,
        overdue: 1,
        completionRate: 0.25,
        activeByPriority: { HIGH: 1, MEDIUM: 0, LOW: 2 },
      });
      expect(stats.completedPerDay).toHaveLength(7);
      expect(stats.completedPerDay.at(-1)).toEqual({ date: "2026-10-10", count: 1 });
    });

    it("TODO が 0 件でも達成率は 0", async () => {
      expect((await service.stats()).completionRate).toBe(0);
    });
  });
});
