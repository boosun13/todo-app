import { NextResponse } from "next/server";
import { todoService } from "@/server/todo";
import { readJson, toErrorResponse } from "../_lib/http";

export async function GET(req: Request) {
  try {
    const query = Object.fromEntries(new URL(req.url).searchParams);
    return NextResponse.json(await todoService.list(query));
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
