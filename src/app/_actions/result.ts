import { ZodError } from "zod";
import { NotFoundError } from "@/domain/errors";

/** Server Action の戻り値。例外ではなく値で失敗を返し、クライアントでフォームに反映する */
export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok: ActionResult = { ok: true };

/** 想定内のエラー(検証・Not Found)だけを ActionResult に変換し、それ以外は再スローする */
export async function runAction(fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
    return ok;
  } catch (e) {
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) {
        const key = String(issue.path[0] ?? "_");
        fieldErrors[key] ??= issue.message;
      }
      return { ok: false, error: e.issues[0]?.message ?? "入力が不正です", fieldErrors };
    }
    if (e instanceof NotFoundError) return { ok: false, error: e.message };
    throw e;
  }
}
