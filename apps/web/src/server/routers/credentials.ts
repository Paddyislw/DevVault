import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  encryptCredential,
  decryptCredential,
  hashMasterPassword,
  verifyMasterPassword,
} from "@/lib/encryption";

async function assertOwnership(
  prisma: any,
  userId: string,
  credentialId: string,
) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, workspace: { userId } },
  });
  if (!credential) throw new TRPCError({ code: "NOT_FOUND" });
  return credential;
}

export const credentialsRouter = router({
  // Set master password for the first time
  setMasterPassword: protectedProcedure
    .input(z.object({ password: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });
      if (user?.masterPasswordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Master password already set",
        });
      }
      const hash = await hashMasterPassword(input.password);
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { masterPasswordHash: hash },
      });
    }),

  // Verify master password — returns true/false, never the hash
  verifyMasterPassword: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });
      if (!user?.masterPasswordHash) {
        return { verified: false, needsSetup: true };
      }
      const verified = await verifyMasterPassword(
        input.password,
        user.masterPasswordHash,
      );
      return { verified, needsSetup: false };
    }),

  // Forgot master password — credentials are encrypted with a key derived
  // from the password itself, so they are unrecoverable without it. Reset
  // deletes all of them and clears the hash so a new password can be set.
  resetVault: protectedProcedure.mutation(async ({ ctx }) => {
    const { count } = await ctx.prisma.credential.deleteMany({
      where: { workspace: { userId: ctx.session.user.id } },
    });
    await ctx.prisma.user.update({
      where: { id: ctx.session.user.id },
      data: { masterPasswordHash: null },
    });
    return { deletedCredentials: count };
  }),

  // Check if master password is set
  hasMasterPassword: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { masterPasswordHash: true },
    });
    return { hasPassword: !!user?.masterPasswordHash };
  }),

  // Create credential — encrypts on server using master password
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1),
        service: z.string().optional(),
        username: z.string().optional(),
        notes: z.string().optional(),
        value: z.string().min(1), // plaintext — encrypted immediately, never stored
        category: z
          .enum(["API_KEY", "DATABASE", "SERVICE", "SSH", "OTHER"])
          .default("OTHER"),
        masterPassword: z.string(), // sent once for encryption, never stored
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership of workspace
      const workspace = await ctx.prisma.workspace.findFirst({
        where: { id: input.workspaceId, userId: ctx.session.user.id },
      });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });

      // Verify master password before encrypting
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { masterPasswordHash: true },
      });
      if (!user?.masterPasswordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Set master password first",
        });
      }
      const valid = await verifyMasterPassword(
        input.masterPassword,
        user.masterPasswordHash,
      );
      if (!valid)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Wrong master password",
        });

      const { encryptedData, iv, salt } = await encryptCredential(
        input.value,
        input.masterPassword,
      );

      return ctx.prisma.credential.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          service: input.service ?? null,
          username: input.username ?? null,
          notes: input.notes ?? null,
          encryptedData,
          iv,
          salt,
          category: input.category,
        },
      });
    }),

  // Update — edits metadata in place; only re-encrypts when a new value is given
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        service: z.string().optional(),
        username: z.string().optional(),
        notes: z.string().optional(),
        category: z.enum(["API_KEY", "DATABASE", "SERVICE", "SSH", "OTHER"]),
        value: z.string().optional(), // omit to keep the existing secret
        masterPassword: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, ctx.session.user.id, input.id);

      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { masterPasswordHash: true },
      });
      if (!user?.masterPasswordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Set master password first" });
      }
      const valid = await verifyMasterPassword(
        input.masterPassword,
        user.masterPasswordHash,
      );
      if (!valid)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Wrong master password",
        });

      const secretFields = input.value
        ? await encryptCredential(input.value, input.masterPassword)
        : {};

      return ctx.prisma.credential.update({
        where: { id: input.id },
        data: {
          name: input.name,
          service: input.service ?? null,
          username: input.username ?? null,
          notes: input.notes ?? null,
          category: input.category,
          ...secretFields,
        },
      });
    }),

  // List — metadata only, NO encrypted data returned
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        category: z
          .enum(["API_KEY", "DATABASE", "SERVICE", "SSH", "OTHER"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.credential.findMany({
        where: {
          workspace: { userId: ctx.session.user.id },
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          ...(input.category && { category: input.category }),
        },
        select: {
          id: true,
          name: true,
          service: true,
          username: true,
          notes: true,
          category: true,
          lastCopiedAt: true,
          createdAt: true,
          workspaceId: true,
          // encryptedData, iv, salt intentionally excluded
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Reveal — decrypt on demand, requires master password
  reveal: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        masterPassword: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const credential = await ctx.prisma.credential.findFirst({
        where: { id: input.id, workspace: { userId: ctx.session.user.id } },
      });
      if (!credential) throw new TRPCError({ code: "NOT_FOUND" });

      const decrypted = await decryptCredential(
        credential.encryptedData,
        credential.iv,
        credential.salt,
        input.masterPassword,
      );

      if (!decrypted) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Wrong master password",
        });
      }

      // Update lastCopiedAt
      await ctx.prisma.credential.update({
        where: { id: input.id },
        data: { lastCopiedAt: new Date() },
      });

      return { value: decrypted };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, ctx.session.user.id, input.id);
      return ctx.prisma.credential.delete({ where: { id: input.id } });
    }),
});
