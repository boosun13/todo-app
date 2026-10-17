import { PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { calendarDayIn } from "@/domain/date";
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

    it("アーカイブは完了済みだけを隠し、完了実績は保持する", async () => {
      const done = await repo.create({ ...base, title: "done", priority: "HIGH" });
      const active = await repo.create({ ...base, title: "active", priority: "LOW", dueDate: new Date("2026-10-09") });
      const completedAt = new Date("2026-10-09T23:00:00Z");
      const now = new Date("2026-10-10T01:00:00Z");
      await repo.update(done.id, { completed: true, completedAt });
      expect(await repo.archiveCompleted(now)).toBe(1);
      expect(await repo.archiveCompleted(new Date("2026-10-11"))).toBe(0);
      expect(await repo.findMany(query(""))).toEqual([await repo.findById(active.id)]);
      expect(await repo.findMany({ ...query(""), filter: "completed" })).toEqual([]);
      expect(await repo.findById(done.id)).toBeNull();
      expect(await repo.update(done.id, { title: "changed" })).toBeNull();
      expect(await repo.update(done.id, { completed: false, completedAt: null })).toBeNull();
      expect(await repo.update(done.id, { completed: true, completedAt: now })).toBeNull();
      expect(await repo.delete(done.id)).toBe(false);
      expect(await repo.statsSnapshot(new Date("2026-10-10"), new Date("2026-10-04"))).toEqual({
        counts: {
          total: 1, active: 1, completed: 0, archived: 1, overdue: 1,
          activeByPriority: { LOW: 1, MEDIUM: 0, HIGH: 0 },
        },
        completedAts: [completedAt],
      });
      // since は瞬間の境界を含み、境界より前の完了は取得しない
      expect((await repo.statsSnapshot(new Date("2026-10-10"), completedAt)).completedAts).toEqual([completedAt]);
      expect((await repo.statsSnapshot(new Date("2026-10-10"), now)).completedAts).toEqual([]);
    });

    it("単件削除は完了実績ごと物理削除する", async () => {
      const todo = await repo.create({ ...base, title: "done" });
      await repo.update(todo.id, { completed: true, completedAt: new Date("2026-10-10") });
      expect(await repo.delete(todo.id)).toBe(true);
      const snapshot = await repo.statsSnapshot(new Date("2026-10-10"), new Date("2026-10-01"));
      expect(snapshot.counts).toMatchObject({ total: 0, completed: 0, archived: 0 });
      expect(snapshot.completedAts).toEqual([]);
    });

    it("overdue は呼び出し元が指定した今日の暦日より前だけを数える", async () => {
      await repo.create({ ...base, title: "yesterday", dueDate: new Date("2026-10-09") });
      await repo.create({ ...base, title: "boundary", dueDate: new Date("2026-10-10") });
      await repo.create({ ...base, title: "tomorrow", dueDate: new Date("2026-10-11") });
      const done = await repo.create({ ...base, title: "done", dueDate: new Date("2026-10-09") });
      const instant = new Date("2026-10-10T23:30:00Z");
      await repo.update(done.id, { completed: true, completedAt: instant });
      for (const [timeZone, expected] of [["Asia/Tokyo", 2], ["UTC", 1], ["America/Los_Angeles", 1]] as const) {
        const { counts } = await repo.statsSnapshot(calendarDayIn(instant, timeZone), new Date("2026-10-01"));
        expect(counts.overdue).toBe(expected);
      }
    });

    it("statsSnapshot は件数と日別元データを同時に返し active は負にならない", async () => {
      const a = await repo.create({ ...base, title: "a" });
      await repo.create({ ...base, title: "b", dueDate: new Date("2026-10-01T00:00:00Z") });
      await repo.update(a.id, { completed: true, completedAt: new Date("2026-10-10T01:00:00Z") });
      const { counts, completedAts } = await repo.statsSnapshot(
        new Date("2026-10-10T00:00:00Z"),
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

it("in-memory: 作成・更新・アーカイブ入力の Date も保存データと共有しない", async () => {
  const repo = createInMemoryTodoRepository();
  const dueDate = new Date("2026-10-10");
  const todo = await repo.create({ title: "a", description: "", priority: "LOW", dueDate });
  dueDate.setUTCDate(11);
  expect((await repo.findById(todo.id))!.dueDate).toEqual(new Date("2026-10-10"));
  await repo.update(todo.id, { dueDate });
  dueDate.setUTCDate(12);
  expect((await repo.findById(todo.id))!.dueDate).toEqual(new Date("2026-10-11"));
  const completedAt = new Date("2026-10-10T01:00:00Z");
  await repo.update(todo.id, { completed: true, completedAt });
  completedAt.setUTCDate(11);
  const archivedAt = new Date("2026-10-10T02:00:00Z");
  await repo.archiveCompleted(archivedAt);
  archivedAt.setTime(NaN);
  expect(await repo.findById(todo.id)).toBeNull();
  expect((await repo.statsSnapshot(new Date("2026-10-10"), new Date("2026-10-04"))).completedAts)
    .toEqual([new Date("2026-10-10T01:00:00Z")]);
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
