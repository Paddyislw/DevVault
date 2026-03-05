import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { Prisma } from "@devvault/db";

export const activityRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
        entityType: z.string().optional(),
        action: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.activityLog.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input.entityType && { entityType: input.entityType }),
          ...(input.action && { action: input.action }),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
      });
    }),

  log: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        entityType: z.string(),
        entityId: z.string(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.activityLog.create({
        data: {
          userId: ctx.session.user.id,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata:
            (input.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });
    }),
});
