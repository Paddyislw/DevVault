import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { GoogleGenerativeAI } from '@google/generative-ai'

async function assertOwnership(prisma: any, userId: string, noteId: string) {
  const note = await prisma.note.findFirst({
    where: { id: noteId, workspace: { userId } },
  })
  if (!note) throw new Error('Not found')
  return note
}

export const notesRouter = router({
  create: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      title: z.string().min(1),
      content: z.string().default(''),
      type: z.enum(['NOTE', 'COMMAND']).default('NOTE'),
      command: z.string().optional(),
      language: z.string().optional(),
      warning: z.string().optional(),
      source: z.string().optional(),
      tags: z.array(z.string()).default([]),
      isPinned: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findFirst({
        where: { id: input.workspaceId, userId: ctx.session.user.id },
      })
      if (!workspace) throw new Error('Workspace not found')
      return ctx.prisma.note.create({ data: input })
    }),

  list: protectedProcedure
    .input(z.object({
      type: z.enum(['NOTE', 'COMMAND']).optional(),
      search: z.string().optional(),
      workspaceId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.note.findMany({
        where: {
          workspace: { userId: ctx.session.user.id },
          ...(input.type && { type: input.type }),
          ...(input.workspaceId && { workspaceId: input.workspaceId }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: 'insensitive' } },
              { content: { contains: input.search, mode: 'insensitive' } },
              { command: { contains: input.search, mode: 'insensitive' } },
            ],
          }),
        },
        orderBy: [{ isPinned: 'desc' }, { copyCount: 'desc' }, { createdAt: 'desc' }],
      })
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      command: z.string().optional(),
      language: z.string().optional(),
      warning: z.string().optional(),
      source: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      await assertOwnership(ctx.prisma, ctx.session.user.id, id)
      return ctx.prisma.note.update({ where: { id }, data })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)
      return ctx.prisma.note.delete({ where: { id: input.id } })
    }),

  incrementCopyCount: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.note.update({
        where: { id: input.id },
        data: { copyCount: { increment: 1 } },
      })
    }),

  // Returns AI-formatted markdown WITHOUT saving — client previews, then
  // applies via notes.update so the original is never overwritten silently.
  // mode 'format' only restyles; mode 'rewrite' may condense and restructure.
  beautify: protectedProcedure
    .input(z.object({
      id: z.string(),
      mode: z.enum(['format', 'rewrite', 'custom']).default('format'),
      instruction: z.string().trim().min(1).max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const note = await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)

      if (!process.env.GEMINI_API_KEY) throw new Error('AI is not configured on the server')
      if (!note.content?.trim()) throw new Error('This note has no content to format')
      if (input.mode === 'custom' && !input.instruction) {
        throw new Error('Tell the AI how you want the note formatted')
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      const formatPrompt = `Reformat this developer's personal note into clean, well-organized Markdown.

Rules:
- Preserve ALL original information, links, and code exactly — do not add facts, do not summarize details away, do not add commentary.
- Use short section headings (## / ###) only where they genuinely help.
- Use bullet or numbered lists for enumerations, **bold** for key terms, \`inline code\` for identifiers/paths/commands, and fenced code blocks for multi-line code.
- Fix obvious typos and broken formatting, keep the author's wording otherwise.
- Return ONLY the formatted markdown — no preamble, no explanation.

Note title: ${note.title}

Note content:
${note.content}`

      const rewritePrompt = `Rewrite and reformat this developer's personal note so it is as readable and useful as possible.

You MAY:
- Reorganize sections into a more logical order and tighten wording.
- Condense — cut filler, redundant phrasing, and anything that adds no information.
- Merge repeated or overlapping content: if the same command, fact, or idea appears more than once, keep one well-placed version.
- Add a short clarifying line, label, or section heading where it genuinely aids comprehension.
- Convert prose into bullet lists or Markdown tables wherever that is clearer (e.g. option/flag explanations → table).
- Use ## / ### headings, **bold** key terms, \`inline code\` for commands/paths/identifiers, and fenced code blocks for multi-line code.

You MUST NOT:
- Lose any command, code, URL, number, name, or concrete fact — every piece of actionable information must survive the rewrite.
- Invent facts that are not in the note.
- Pad the note with generic advice.

Return ONLY the formatted markdown — no preamble, no explanation.

Note title: ${note.title}

Note content:
${note.content}`

      const customPrompt = `Reformat this developer's personal note in Markdown, following the author's specific instruction.

Author's instruction: "${input.instruction}"

Rules:
- Follow the instruction as closely as possible — e.g. converting the content into a table, a list, or whatever structure was asked for.
- Keep ALL information from the note unless the instruction explicitly asks to remove or condense it.
- Do not invent facts that are not in the note.
- Output valid Markdown only (## / ### headings, bullet/numbered lists, Markdown tables, \`inline code\`, fenced code blocks).
- Return ONLY the formatted markdown — no preamble, no explanation.

Note title: ${note.title}

Note content:
${note.content}`

      const prompt =
        input.mode === 'custom' ? customPrompt
        : input.mode === 'rewrite' ? rewritePrompt
        : formatPrompt

      const result = await model.generateContent(prompt)
      let content = result.response.text().trim()

      // Strip a wrapping ``` fence if the model returned one around the whole doc
      const fenced = content.match(/^```(?:markdown|md)?\n([\s\S]*)\n```$/)
      if (fenced) content = fenced[1].trim()

      if (!content) throw new Error('AI returned an empty result — try again')

      return { content }
    }),

  togglePin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await assertOwnership(ctx.prisma, ctx.session.user.id, input.id)
      return ctx.prisma.note.update({
        where: { id: input.id },
        data: { isPinned: !note.isPinned },
      })
    }),
})