import "server-only";
import { prisma } from "../db";
import { createPrismaTodoRepository } from "./prisma-repository";
import { createTodoService } from "./service";

/** Composition root: 具象(Prisma)をここでだけ service に注入する */
export const todoService = createTodoService(createPrismaTodoRepository(prisma));
