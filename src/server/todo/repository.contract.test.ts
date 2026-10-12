import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { TodoQuery } from "@/domain/todo";
import type { TodoRepository } from "@/domain/todo-repository";
import { createInMemoryTodoRepository } from "./in-memory-repository";
import { createPrismaTodoRepository } from "./prisma-repository";

const query = (q: string): TodoQuery => ({ filter: "all", sort: "created", q });

/** 両実装に同じケースを流す契約テスト */
const contract = (name: string, make: () => Promise<TodoRepository>) => {
  describe(`TodoRepository 契約: ${name}`, () => {
    let repo: TodoRepository;
    beforeEach(async () => {
      repo = await make();
    });
    const titles = async (q: string) => (await repo.findMany(query(q))).map((t) => t.title).sort();
    const base = { description: "", priority: "MEDIUM", dueDate: null } as const;

    it("検索はタイトルとメモを個別に部分一致・大文字小文字無視で見る", async () => {
      await repo.create({ ...base, title: "Milk", description: "2 bottles" });
      await repo.create({ ...base, title: "Report" });
      expect(await titles("milk")).toEqual(["Milk"]);
      expect(await titles("BOTTLES")).toEqual(["Milk"]);
      // タイトル末尾とメモ先頭をまたぐ語にはマッチしない
      expect(await titles("milk 2")).toEqual([]);
    });

    it.each([["%"], ["_"], ["\\"], ["a%c"], ["a_c"]])("ワイルドカード/エスケープ文字 %j はリテラル扱い", async (q) => {
      await repo.create({ ...base, title: "abc" });
      await repo.create({ ...base, title: "a%c" });
      await repo.create({ ...base, title: "a_c" });
      await repo.create({ ...base, title: "x\\y" });
      const expected = { "%": ["a%c"], _: ["a_c"], "\\": ["x\\y"], "a%c": ["a%c"], a_c: ["a_c"] }[q];
      expect(await titles(q)).toEqual(expected);
    });

    it("存在しない id の delete は false、他の行は消えない", async () => {
      await repo.create({ ...base, title: "a" });
      expect(await repo.delete("missing")).toBe(false);
      expect(await repo.findMany(query(""))).toHaveLength(1);
    });

    it("update: 遷移時のみ completedAt を適用し、同状態の再送では変えない", async () => {
      const { id } = await repo.create({ ...base, title: "a" });
      const t1 = new Date("2026-10-10T00:00:00Z");
      const t2 = new Date("2026-10-11T00:00:00Z");
      expect(await repo.update(id, { completed: true, completedAt: t1 })).toMatchObject({ completedAt: t1 });
      expect(await repo.update(id, { completed: true, completedAt: t2 })).toMatchObject({
        completed: true,
        completedAt: t1,
      });
      expect(await repo.update(id, { completed: false, completedAt: null })).toMatchObject({
        completed: false,
        completedAt: null,
      });
      expect(await repo.update("missing", { completed: true, completedAt: t1 })).toBeNull();
      expect(await repo.update("missing", { title: "x" })).toBeNull();
    });

    it("statsSnapshot は件数と日別元データを同時に返し active は負にならない", async () => {
      const a = await repo.create({ ...base, title: "a" });
      await repo.create({ ...base, title: "b", dueDate: new Date("2026-10-01T00:00:00Z") });
      await repo.update(a.id, { completed: true, completedAt: new Date("2026-10-10T01:00:00Z") });
      const { counts, completedAts } = await repo.statsSnapshot(
        new Date("2026-10-10T12:00:00Z"),
        new Date("2026-10-04T00:00:00Z"),
      );
      expect(counts).toMatchObject({ total: 2, completed: 1, active: 1, overdue: 1 });
      expect(completedAts).toEqual([new Date("2026-10-10T01:00:00Z")]);
    });
  });
};

contract("in-memory", async () => createInMemoryTodoRepository());

it("in-memory: 返却値の変更が保存データに影響しない", async () => {
  const repo = createInMemoryTodoRepository();
  const created = await repo.create({ title: "a", description: "", priority: "LOW", dueDate: new Date(0) });
  created.title = "mutated";
  created.dueDate!.setTime(1);
  const found = await repo.findById(created.id);
  expect(found).toMatchObject({ title: "a" });
  expect(found!.dueDate).toEqual(new Date(0));
});

// 実 DB(破壊的に全削除するため、専用の TEST_DATABASE_URL が指定されたときだけ実行)
const testDbUrl = process.env.TEST_DATABASE_URL;
if (testDbUrl) {
  const prisma = new PrismaClient({ datasourceUrl: testDbUrl });
  afterAll(() => prisma.$disconnect());
  contract("prisma (TEST_DATABASE_URL)", async () => {
    await prisma.todo.deleteMany();
    return createPrismaTodoRepository(prisma);
  });
} else {
  it.skip("prisma 契約テスト: TEST_DATABASE_URL 未設定のためスキップ", () => {});
}
