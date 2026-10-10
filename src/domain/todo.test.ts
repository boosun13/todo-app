import { describe, expect, it } from "vitest";
import { updateTodoSchema } from "./todo";

describe("updateTodoSchema", () => {
  it("title / completed のどちらか一方でよい", () => {
    expect(updateTodoSchema.safeParse({ completed: true }).success).toBe(true);
    expect(updateTodoSchema.safeParse({ title: "x" }).success).toBe(true);
  });
  it("空オブジェクトは拒否する", () => {
    expect(updateTodoSchema.safeParse({}).success).toBe(false);
  });
});
