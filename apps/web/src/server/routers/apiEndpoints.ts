import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from "@devvault/db";

async function assertOwnership(
  prisma: PrismaClient,
  userId: string,
  endpointId: string,
) {
  const endpoint = await prisma.apiEndpoint.findFirst({
    where: { id: endpointId, workspace: { userId } },
  });
  if (!endpoint) throw new TRPCError({ code: "NOT_FOUND" });
  return endpoint;
}

async function fireRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null,
  authType: string,
  authValue: string | null,
) {
  const start = Date.now();

  const finalHeaders: Record<string, string> = { ...headers };

  if (authType === "BEARER" && authValue) {
    finalHeaders["Authorization"] = `Bearer ${authValue}`;
  } else if (authType === "API_KEY" && authValue) {
    finalHeaders["X-API-Key"] = authValue;
  } else if (authType === "BASIC" && authValue) {
    finalHeaders["Authorization"] =
      `Basic ${Buffer.from(authValue).toString("base64")}`;
  }

  if (["POST", "PUT", "PATCH"].includes(method) && body) {
    finalHeaders["Content-Type"] =
      finalHeaders["Content-Type"] ?? "application/json";
  }

  try {
    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: ["GET", "HEAD"].includes(method) ? undefined : body || undefined,
      signal: AbortSignal.timeout(15000),
    });

    const responseTime = Date.now() - start;
    const contentType = response.headers.get("content-type") ?? "";

    let responseBody: string | null = null;
    if (
      contentType.includes("application/json") ||
      contentType.includes("text/")
    ) {
      try {
        responseBody = await response.text();
        if (contentType.includes("application/json")) {
          try {
            responseBody = JSON.stringify(JSON.parse(responseBody), null, 2);
          } catch {
            /* keep as-is */
          }
        }
      } catch {
        responseBody = null;
      }
    } else {
      responseBody = `[Binary response: ${contentType}]`;
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      responseTime,
      body: responseBody,
      headers: responseHeaders,
      error: null,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const responseTime = Date.now() - start;
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      status: null,
      responseTime,
      body: null,
      headers: null,
      error: error.includes("timed out") ? "Request timed out (15s)" : error,
      timestamp: new Date().toISOString(),
    };
  }
}

export const apiEndpointsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1),
        url: z.string().url(),
        method: z
          .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
          .default("GET"),
        headers: z.record(z.string(), z.string()).default({}),
        body: z.string().default(""),
        authType: z
          .enum(["NONE", "BEARER", "API_KEY", "BASIC"])
          .default("NONE"),
        authValue: z.string().optional(),
        projectName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findFirst({
        where: { id: input.workspaceId, userId: ctx.session.user.id },
      });
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.apiEndpoint.create({
        data: {
          workspaceId: input.workspaceId,
          name: input.name,
          url: input.url,
          method: input.method as any,
          headers: input.headers as any,
          body: input.body ? { raw: input.body } : {},
          authType: input.authType as any,
          authValue: input.authValue ?? null,
          projectName: input.projectName ?? null,
        },
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().optional(),
        projectName: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.apiEndpoint.findMany({
        where: {
          workspace: { userId: ctx.session.user.id },
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          ...(input.projectName && { projectName: input.projectName }),
        },
        include: {
          pingResults: {
            orderBy: { createdAt: "desc" },
            take: 1, // just the latest ping for list view
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const endpoint = await ctx.prisma.apiEndpoint.findFirst({
        where: { id: input.id, workspace: { userId: ctx.session.user.id } },
        include: {
          pingResults: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });
      if (!endpoint) throw new TRPCError({ code: "NOT_FOUND" });
      return endpoint;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        url: z.string().url().optional(),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        body: z.string().optional(),
        authType: z.enum(["NONE", "BEARER", "API_KEY", "BASIC"]).optional(),
        authValue: z.string().optional(),
        projectName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, body, headers, method, authType, ...rest } = input;
      await assertOwnership(ctx.prisma, ctx.session.user.id, id);
      return ctx.prisma.apiEndpoint.update({
        where: { id },
        data: {
          ...rest,
          ...(method && { method: method as any }),
          ...(authType && { authType: authType as any }),
          ...(headers !== undefined && { headers: headers as any }),
          ...(body !== undefined && { body: body ? { raw: body } : {} }),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, ctx.session.user.id, input.id);
      return ctx.prisma.apiEndpoint.delete({ where: { id: input.id } });
    }),

  ping: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        url: z.string().url().optional(),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
        headers: z.record(z.string(), z.string()).optional(),
        body: z.string().optional(),
        authType: z.enum(["NONE", "BEARER", "API_KEY", "BASIC"]).optional(),
        authValue: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const endpoint = await assertOwnership(
        ctx.prisma,
        ctx.session.user.id,
        input.id,
      );

      const url = input.url ?? endpoint.url;
      const method = input.method ?? endpoint.method;
      const headers = (input.headers ?? endpoint.headers ?? {}) as Record<
        string,
        string
      >;
      const bodyRaw = input.body ?? (endpoint.body as any)?.raw ?? "";
      const authType = input.authType ?? endpoint.authType;
      const authValue = input.authValue ?? endpoint.authValue;

      const result = await fireRequest(
        url,
        method,
        headers,
        bodyRaw,
        authType,
        authValue,
      );

      // Save ping result to DB
      await ctx.prisma.pingResult.create({
        data: {
          endpointId: input.id,
          status: result.status,
          responseTime: result.responseTime,
          body: result.body ? result.body.slice(0, 10000) : null,
          headers: (result.headers ?? {}) as any,
          error: result.error,
        },
      });

      // Keep only last 5 ping results per endpoint
      const allPings = await ctx.prisma.pingResult.findMany({
        where: { endpointId: input.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (allPings.length > 5) {
        const toDelete = allPings.slice(5).map((p) => p.id);
        await ctx.prisma.pingResult.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // Update endpoint lastPingStatus + lastPingAt
      await ctx.prisma.apiEndpoint.update({
        where: { id: input.id },
        data: {
          lastPingStatus: result.status,
          lastPingAt: new Date(),
        },
      });

      return result;
    }),

  history: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, ctx.session.user.id, input.id);
      return ctx.prisma.pingResult.findMany({
        where: { endpointId: input.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
    }),

  proxyRequest: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
        headers: z.record(z.string(), z.string()).default({}),
        body: z.string().optional(),
        authType: z
          .enum(["NONE", "BEARER", "API_KEY", "BASIC"])
          .default("NONE"),
        authValue: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return fireRequest(
        input.url,
        input.method,
        input.headers,
        input.body ?? null,
        input.authType,
        input.authValue ?? null,
      );
    }),
});
