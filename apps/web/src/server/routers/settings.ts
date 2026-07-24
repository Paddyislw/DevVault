// apps/web/src/server/routers/settings.ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { Prisma } from "@devvault/db";
import {
  parseDigestSettings,
  DIGEST_TIME_RE,
  type DigestSettings,
} from "@/lib/digest";

const updateDigestSchema = z.object({
  standupEnabled: z.boolean(),
  standupTime: z.string().regex(DIGEST_TIME_RE, "Time must be HH:mm"),
  standupWorkspaceIds: z.array(z.string()).max(50),
  recapEnabled: z.boolean(),
  recapDay: z.number().int().min(0).max(6),
  recapTime: z.string().regex(DIGEST_TIME_RE, "Time must be HH:mm"),
  recapWorkspaceIds: z.array(z.string()).max(50),
  remainingEnabled: z.boolean(),
  remainingTime: z.string().regex(DIGEST_TIME_RE, "Time must be HH:mm"),
  remainingWorkspaceIds: z.array(z.string()).max(50),
});

export const settingsRouter = router({
  // Digest settings merged with defaults — safe for users who never saved any
  getDigest: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { aiSettings: true },
    });
    return parseDigestSettings(user?.aiSettings);
  }),

  updateDigest: protectedProcedure
    .input(updateDigestSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { aiSettings: true },
      });

      // Preserve any other keys living in aiSettings, only replace `digest`
      const existing =
        user?.aiSettings &&
        typeof user.aiSettings === "object" &&
        !Array.isArray(user.aiSettings)
          ? (user.aiSettings as Record<string, unknown>)
          : {};

      const digest: DigestSettings = {
        ...parseDigestSettings(existing),
        ...input,
      };

      await ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: {
          aiSettings: { ...existing, digest } as Prisma.InputJsonValue,
        },
      });

      return digest;
    }),
});
