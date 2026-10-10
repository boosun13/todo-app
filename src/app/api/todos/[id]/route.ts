import { NextResponse } from "next/server";
import { todoService } from "@/server/todo";
import { readJson, toErrorResponse } from "../../_lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await todoService.get(id));
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    return NextResponse.json(await todoService.update(id, await readJson(req)));
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await todoService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return toErrorResponse(e);
  }
}
