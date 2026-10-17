import "server-only";
import { prisma } from "../db";
import { APP_TIME_ZONE } from "../config";
import { createPrismaTodoRepository } from "./prisma-repository";
import { createTodoService } from "./service";

/** Composition root: 具象(Prisma)をここでだけ service に注入する */
export const todoService = createTodoService(createPrismaTodoRepository(prisma), { timeZone: APP_TIME_ZONE });
