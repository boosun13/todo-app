import { NextResponse } from "next/server";
import { todoFilterSchema } from "@/domain/todo";
import { todoService } from "@/server/todo";
import { readJson, toErrorResponse } from "../_lib/http";

export async function GET(req: Request) {
  try {
    const raw = new URL(req.url).searchParams.get("filter") ?? "all";
    const filter = todoFilterSchema.parse(raw);
    return NextResponse.json(await todoService.list(filter));
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const todo = await todoService.add(await readJson(req));
    return NextResponse.json(todo, { status: 201 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
