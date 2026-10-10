import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { NotFoundError } from "@/domain/errors";
import { createInMemoryTodoRepository } from "./in-memory-repository";
import { createTodoService, type TodoService } from "./service";

describe("todoService", () => {
  let service: TodoService;
  beforeEach(() => {
    service = createTodoService(createInMemoryTodoRepository());
  });

  describe("add", () => {
    it("前後の空白を除去して作成する", async () => {
      const todo = await service.add({ title: "  牛乳を買う  " });
      expect(todo).toMatchObject({ title: "牛乳を買う", completed: false });
    });

    it.each([[""], ["   "], ["a".repeat(101)], [undefined], [null]])(
      "不正なタイトル(%j)は ZodError",
      async (title) => {
        await expect(service.add({ title })).rejects.toBeInstanceOf(ZodError);
      },
    );
  });

  describe("update", () => {
    it("完了状態を更新できる", async () => {
      const { id } = await service.add({ title: "a" });
      expect(await service.update(id, { completed: true })).toMatchObject({ completed: true });
    });

    it("更新項目が空なら ZodError", async () => {
      const { id } = await service.add({ title: "a" });
      await expect(service.update(id, {})).rejects.toBeInstanceOf(ZodError);
    });

    it("存在しない id は NotFoundError", async () => {
      await expect(service.update("nope", { completed: true })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("remove", () => {
    it("削除後は一覧に出ない", async () => {
      const { id } = await service.add({ title: "a" });
      await service.remove(id);
      expect(await service.list()).toHaveLength(0);
    });

    it("存在しない id は NotFoundError", async () => {
      await expect(service.remove("nope")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("list / countActive / clearCompleted", () => {
    it("フィルタと件数と一括削除が整合する", async () => {
      const a = await service.add({ title: "a" });
      await service.add({ title: "b" });
      await service.update(a.id, { completed: true });

      expect((await service.list("completed")).map((t) => t.title)).toEqual(["a"]);
      expect((await service.list("active")).map((t) => t.title)).toEqual(["b"]);
      expect(await service.countActive()).toBe(1);

      expect(await service.clearCompleted()).toBe(1);
      expect(await service.list()).toHaveLength(1);
    });
  });
});
