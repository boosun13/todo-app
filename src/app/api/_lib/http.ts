import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { NotFoundError } from "@/domain/errors";

/** ドメイン/検証エラーを HTTP ステータスへ変換する(Route Handler 共通) */
export function toErrorResponse(e: unknown) {
  if (e instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed", issues: e.issues }, { status: 400 });
  }
  if (e instanceof NotFoundError) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
  console.error(e);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined; // 後段のスキーマ検証で 400 になる
  }
}
