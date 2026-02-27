# DevVault — CLAUDE.md
> Drop this file in the root of your devvault/ monorepo as `CLAUDE.md`.
> Claude Code reads this automatically on every session.
> Updated after: Day 11

---

## Project Overview

DevVault is a Telegram-first developer productivity tool. Combines task management, snippets, notes, credentials, bookmarks — controllable via Telegram bot + web dashboard.

**Timeline:** 72-day challenge, 1 hour/day, Mon–Sat
**Current day:** Day 11/72 complete (15% done, Week 2 of 12)

---

## Package Manager

**ALWAYS pnpm. NEVER npm or yarn.**

```bash
pnpm install
pnpm add --filter <app> <pkg>      # e.g. pnpm add --filter web lucide-react
pnpm add --filter web -D <pkg>     # dev dependency
pnpm run dev                       # run all apps
pnpm run dev --filter web          # run single app
```

---

## Monorepo Structure

```
devvault/
├── apps/
│   ├── web/          ← Next.js 14 web app
│   └── bot/          ← grammY Telegram bot
├── packages/
│   └── db/           ← Prisma schema + generated client
├── turbo.json
└── CLAUDE.md         ← this file
```

---

## Critical Import Rules

### Prisma
- Schema currently has NO custom output path (generates to node_modules default)
- **NEVER** import from `@prisma/client` directly
- **ALWAYS** import ALL Prisma types, enums, PrismaClient from `@devvault/db`

```ts
// ✅ Correct
import { prisma, TaskPriority, TaskStatus, Task } from '@devvault/db'

// ❌ Wrong — will break in monorepo
import { PrismaClient } from '@prisma/client'
```

### tRPC (web app)
```ts
import { api } from '@/lib/trpc'                          // React client
import { getQueryKey } from '@trpc/react-query'           // for cache keys
import type { RouterOutputs } from '@/lib/trpc'           // inferred types
```

### tRPC server procedures
- Defined in: `apps/web/src/server/routers/`
- Root router: `apps/web/src/server/root.ts`
- Route handler: `apps/web/src/app/api/trpc/[trpc]/route.ts`

---

## File Structure (apps/web/src)

```
app/
├── api/
│   ├── auth/[...nextauth]/   ← NextAuth route
│   └── trpc/[trpc]/route.ts  ← tRPC route handler
├── someday/page.tsx
├── inbox/page.tsx
├── ideas/page.tsx
├── settings/page.tsx
├── login/page.tsx            ← Telegram login
├── globals.css               ← ALL design tokens as CSS variables
├── layout.tsx
├── page.tsx                  ← Today view (/)
└── providers.tsx             ← tRPC + React Query providers

components/
├── auth/
│   └── telegram-login.tsx
├── layout/
│   ├── authgate.tsx
│   ├── command-trigger.tsx
│   ├── dashboard-layout.tsx
│   ├── nav-item.tsx
│   ├── section-label.tsx
│   ├── sidebar.tsx
│   └── workspace-item.tsx
├── shared/
│   ├── empty-state.tsx
│   └── page-header.tsx
├── tasks/
│   ├── index.ts              ← barrel export — always maintain this
│   ├── TaskStatusBadge.tsx
│   ├── TaskRow.tsx
│   ├── TaskDetail.tsx
│   ├── PriorityGroup.tsx
│   ├── TasksPage.tsx
│   ├── SomedayPage.tsx
│   ├── AddTaskModal.tsx
│   ├── PriorityPicker.tsx
│   └── WorkspacePicker.tsx
└── ui/                       ← shadcn components only

lib/
├── auth.ts
├── prisma.ts
└── trpc.ts

server/
├── routers/
│   └── tasks.ts
├── root.ts
└── trpc.ts
```

## File Structure (apps/bot/src)

```
apps/bot/src/
├── index.ts          ← Bot entry point, command handlers
└── services/
    ├── user.ts       ← findOrCreateUser, findUserByTelegramId
    └── task.ts       ← getTodayTasks, getSomedayTasks, getBacklogTasks, formatTasksByPriority
```

**Rule:** Every `components/<module>/` folder MUST have an `index.ts` barrel export.

---

## Design System

### Philosophy
DevVault must feel like **Linear / Raycast / Things 3** — built by a senior engineering team.
It must NEVER look like a generic AI project.

### Palette (Light mode)

| CSS Variable | Value | Tailwind Class | Usage |
|---|---|---|---|
| `--surface-0` | `#FAF9F6` | `bg-surface-0` | App background (warm cream, never pure white) |
| `--surface-1` | `#FFFFFF` | `bg-surface-1` | Cards, panels |
| `--surface-2` | `#F7F5F0` | `bg-surface-2` | Hover states |
| `--surface-3` | `#F0EDE7` | `bg-surface-3` | Selected states |
| `--text-primary` | `#050505` | `text-text-primary` | Main text |
| `--text-secondary` | `#8C6A64` | `text-text-secondary` | Labels, metadata |
| `--text-tertiary` | `#B0948F` | `text-text-tertiary` | Hints, placeholders |
| `--text-ghost` | `#C8B4B0` | `text-text-ghost` | Disabled |
| `--accent` | `#C25E4A` | `bg-accent`, `text-accent` | Terracotta — primary accent |
| `--accent-subtle` | `#FAD4D0` | `bg-accent-subtle` | Blush — P1 bg, highlights |
| `--border-default` | `#E6E4DF` | `border-border-default` | Standard borders |
| `--border-subtle` | `#EEECEA` | `border-border-subtle` | Faint separators |
| `--border-strong` | `#C8C4BC` | `border-border-strong` | Emphasized borders |

### Token Rules — CRITICAL
- **ALWAYS** use CSS variable tokens via Tailwind classes
- **NEVER** hardcode Tailwind color classes like `text-zinc-400`, `bg-zinc-800`, `text-gray-500`
- **NEVER** use inline `style={{ color: 'var(--something)' }}` — define in globals.css, use as Tailwind class

```tsx
// ✅ Correct
<p className="text-text-secondary">Label</p>
<div className="bg-surface-1 border border-border-default">...</div>

// ❌ Wrong
<p className="text-zinc-400">Label</p>
<div className="bg-white border border-gray-200">...</div>
<p style={{ color: 'var(--text-secondary)' }}>Label</p>
```

### Typography
- Body: Inter (system font stack)
- Display/headings: Oswald — use `font-display` class. Page titles are 32px `font-display`
- Mono: JetBrains Mono — use `font-mono` class for all code

### Priority Badge Classes
```tsx
<span className="badge-p1">P1</span>  // blush bg, dark red text
<span className="badge-p2">P2</span>  // amber bg
<span className="badge-p3">P3</span>  // blue bg
<span className="badge-p4">P4</span>  // neutral bg
```

### Utility Classes (defined in globals.css)
| Class | Usage |
|---|---|
| `.label` | 11px uppercase tracking — field labels |
| `.section-header` | label + trailing separator line |
| `.card-hover` | 4px offset editorial shadow on hover |
| `.create-placeholder` | dashed border empty state container |
| `.badge-p1` – `.badge-p4` | priority badges |
| `.kbd` | keyboard shortcut chip styling |
| `.font-display` | Oswald display font |
| `.font-mono` | JetBrains Mono |

---

## Component Patterns

### Page Header Pattern
Every page header follows this layout:
```tsx
<div className="flex items-end justify-between border-b border-border-subtle px-6 py-4">
  {/* Left: title (font-display 32px) + subtitle (12px text-tertiary) + stats badges */}
  <div className="flex items-end gap-3">
    <div className="flex flex-col gap-1">
      <h1 className="font-display text-[32px] leading-none text-text-primary">Title</h1>
      <p className="text-[12px] text-text-tertiary tracking-wide">Subtitle</p>
    </div>
    {/* Priority stats badges sit here, bottom-aligned */}
  </div>
  {/* Right: progress bar + primary action button */}
  <div className="flex items-center gap-4">...</div>
</div>
```

### Empty State Pattern
**Text-only. No illustrations. No sad robots. One clear action.**
```tsx
<div className="flex h-full flex-col items-center justify-center gap-2">
  <p className="text-[14px] text-text-secondary">No tasks due today.</p>
  <p className="text-[13px] text-text-ghost">
    Press <kbd className="kbd">N</kbd> to create one.
  </p>
</div>
```

### Loading Skeleton Pattern
```tsx
<div className="space-y-2 w-full max-w-lg px-4">
  {[1, 2, 3].map((i) => (
    <div
      key={i}
      className="h-10 animate-pulse rounded-md bg-surface-2"
      style={{ opacity: 1 - i * 0.2 }}
    />
  ))}
</div>
```

### Modal Pattern
```tsx
<>
  {/* Backdrop */}
  <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
  {/* Modal */}
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
    <div className="bg-surface-1 border border-border-default rounded-lg w-full max-w-lg shadow-lg pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <h2 className="font-display font-light text-base text-text-primary">Title</h2>
        <button className="text-text-tertiary hover:text-text-primary transition-colors">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
      {/* Body */}
      <form className="p-5 flex flex-col gap-4">...</form>
    </div>
  </div>
</>
```

### Edit Modal — Key Prop Remount Pattern
When a modal is used for both create and edit, use `key` to force remount:
```tsx
<AddTaskModal
  key={editTask?.id ?? 'new'}
  open={modalOpen || !!editTask}
  onClose={() => { setModalOpen(false); setEditTask(null) }}
  task={editTask ?? undefined}
/>
```

### Tab Pattern (SomedayPage style)
```tsx
<button
  onClick={() => setActiveTab('someday')}
  className={`relative font-display text-[32px] leading-none transition-colors ${
    activeTab === 'someday' ? 'text-text-primary' : 'text-text-ghost hover:text-text-tertiary'
  }`}
>
  Someday
  {activeTab === 'someday' && (
    <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-accent rounded-full" />
  )}
</button>
```

### Input Style Pattern
```tsx
// Borderless title input (modal, inline edit)
<input className="w-full bg-transparent text-text-primary placeholder:text-text-tertiary text-sm outline-none border-b border-border-subtle pb-2 focus:border-border-strong transition-colors" />

// Boxed input (filters, forms)
<input className="bg-surface-0 border border-border-default rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:border-border-strong transition-colors" />
```

### Button Styles
```tsx
// Primary
<button className="px-4 py-1.5 text-sm bg-accent text-white rounded font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">

// Ghost
<button className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">

// Destructive (delete)
<button className="px-4 py-1.5 text-sm bg-red-500 text-white rounded font-medium hover:opacity-90 transition-opacity">
```

---

## Design Hard Rules

### What DevVault IS
- Linear density — content first, no decorative elements
- Warm cream base (`#FAF9F6`) — not pure white, not dark grey
- Terracotta accent (`#C25E4A`) — earthy, not techy
- Oswald display font for headings — editorial, not corporate
- 8px grid system — all spacing multiples of 4 or 8
- 6px border radius globally — sharper than shadcn default
- Icons: Lucide only, 16px or 20px, `strokeWidth={1.5}`, never filled
- Animations: 150ms transitions only, on hover/focus. No bounces, no entrance animations
- AI features work invisibly — no "Powered by AI" labels, no sparkle ✨ icons

### What DevVault is NOT
| ❌ Avoid | ✅ Do instead |
|---|---|
| Purple/blue gradients | Flat `bg-surface-0` |
| Neon or glowing accents | Muted terracotta `#C25E4A` |
| "Powered by AI" badges | AI just works, no label |
| Gradient text | Plain `text-text-primary` |
| Rounded blob shapes | 6px border radius rectangles |
| Emoji as UI elements | Lucide icons only |
| ChatGPT chat bubble UI | Structured lists and forms |
| Spinning loaders | Skeleton `animate-pulse` |
| Illustration empty states | Text-only empty states |
| `text-zinc-400` hardcoded | `text-text-secondary` token |
| `bg-white` | `bg-surface-1` |
| `border-gray-200` | `border-border-default` |

---

## Design Anti-Patterns (Call These Out)

If any component uses the following, flag it immediately:
1. Any `text-zinc-*`, `bg-zinc-*`, `text-gray-*`, `bg-gray-*`, `text-slate-*` etc. → replace with tokens
2. Any `bg-white` → replace with `bg-surface-1`
3. Any gradient class (`bg-gradient-*`) → remove entirely
4. Any `shadow-lg` on dark surfaces → remove (no shadows in dark mode)
5. Any emoji used as a UI icon instead of Lucide
6. `font-sans` or `font-inter` for headings → use `font-display`
7. Any `rounded-xl` or `rounded-2xl` → use `rounded` (6px) or `rounded-md`

---

## tRPC Patterns

### Optimistic Update Pattern
```ts
const mutation = api.tasks.complete.useMutation({
  onMutate: async (input) => {
    await queryClient.cancelQueries({ queryKey })
    const previous = queryClient.getQueryData(queryKey)
    queryClient.setQueryData(queryKey, (old) => /* optimistic update */)
    return { previous }
  },
  onError: (_err, _input, context) => {
    queryClient.setQueryData(queryKey, context?.previous)
  },
  onSettled: () => refetch(), // always use onSettled, not onSuccess, for refetch
})
```

### isLoading vs isFetching
- `isLoading` — true only on FIRST load (no cached data yet)
- `isFetching` — true on EVERY fetch including background refetches and tab switches
- Use `isLoading` for skeleton on page mount
- Use `isFetching && !isLoading` for subtle loading on tab/filter switches

### Query Key for Cache
```ts
import { getQueryKey } from '@trpc/react-query'
const queryKey = getQueryKey(api.tasks.list, { isSomeday: true }, 'query')
```

### RouterOutputs for Types
```ts
import type { RouterOutputs } from '@/lib/trpc'
type Task = RouterOutputs['tasks']['list'][number]
type Workspace = RouterOutputs['workspaces']['list'][number]
```

---

## Auth

- Telegram Login Widget on `/login`
- NextAuth `CredentialsProvider` verifies Telegram hash with `BOT_TOKEN`
- Creates user + 2 default workspaces (Personal + Work) on first login
- Session has `user.id` and `user.telegramId`
- `protectedProcedure` in tRPC throws UNAUTHORIZED if no session
- `<AuthGate>` wraps dashboard layout — redirects to `/login` if no session

---

## Database

### Key models
- `User` — telegramId, name, email, masterPasswordHash, aiSettings (JSON)
- `Workspace` — userId, name, slug, color, icon, isDefault, type (PERSONAL/WORK/CUSTOM)
- `Task` — workspaceId, title, description, priority, status, dueDate, isBacklog, isSomeday, position, parentTaskId
- `TaskAttachment` — taskId, type (CODE/IMAGE/LINK/FILE)
- Full schema: Snippet, Scratchpad, Note, Credential, Bookmark, EnvSet, ApiEndpoint, ActivityLog, Standup, Recap, Reminder, ProjectIdea

### Enums
```ts
TaskStatus:   BACKLOG | TODO | UP_NEXT | IN_PROGRESS | BLOCKED | IN_REVIEW | DONE | CANCELLED
TaskPriority: P1 | P2 | P3 | P4
WorkspaceType: PERSONAL | WORK | CUSTOM
```

### Query patterns
```ts
// Today's tasks
prisma.task.findMany({
  where: {
    workspace: { userId },
    status: { notIn: ['DONE', 'CANCELLED'] },
    isSomeday: false,
    isBacklog: false,
    OR: [{ dueDate: { lte: endOfToday } }, { dueDate: null }],
  },
  include: { workspace: { select: { id: true, name: true, color: true } } },
  orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
})
```

---

## tRPC Routers Built

### `api.tasks.*`
| Procedure | Type | Description |
|---|---|---|
| `create` | mutation | Create task, verifies workspace ownership |
| `list` | query | Filters: workspaceId, status, priority, isBacklog, isSomeday, dueBefore, dueAfter |
| `listToday` | query | Today's tasks — overdue incomplete + all of today + no-date incomplete |
| `byId` | query | Single task with attachments + subtasks |
| `update` | mutation | Update any task fields |
| `complete` | mutation | Toggle DONE/TODO |
| `delete` | mutation | Delete task |
| `numberOfIncompleteTasks` | query | Group by priority counts |

### `api.workspaces.*`
| Procedure | Type | Description |
|---|---|---|
| `list` | query | All workspaces for user, ordered default first |

---

## Bot Patterns

### Service Layer (apps/bot/src/services/)
- `user.ts` — `findOrCreateUser`, `findUserByTelegramId`
- `task.ts` — `getTodayTasks`, `getSomedayTasks`, `getBacklogTasks`, `formatTasksByPriority`

### Command Handler Pattern
```ts
bot.command('tasks', async (ctx) => {
  const telegramId = ctx.from?.id.toString()
  if (!telegramId) { await ctx.reply('Please run /start first'); return }
  const user = await findUserByTelegramId(telegramId)
  if (!user) { await ctx.reply('Please run /start first'); return }
  // ... handle command
})
```

### Bot Message Formatting
- Use emoji for priority indicators in bot messages (Telegram native): 🔴 P1, 🟠 P2, 🔵 P3, ⚪ P4
- Emoji is acceptable in bot messages — this is NOT the web UI
- Keep messages scannable: section title → blank line → bullet items

---

## Environment Variables

### apps/web/.env.local
```env
DATABASE_URL=
NEXTAUTH_URL=https://YOUR_NGROK_URL
NEXTAUTH_SECRET=
BOT_TOKEN=
NEXT_PUBLIC_BOT_USERNAME=devvault_dev_bot
```

### apps/bot/.env
```env
DATABASE_URL=
BOT_TOKEN=
```

### ngrok note
Free tier changes domain on every restart. Update both:
1. `NEXTAUTH_URL` in `apps/web/.env.local`
2. Webhook URL in BotFather

---

## What's Working

- [x] Turborepo monorepo setup
- [x] Full Prisma schema (16 tables)
- [x] Telegram bot connected to DB
- [x] Next.js web app with full design system
- [x] NextAuth Telegram login
- [x] tRPC full task CRUD router
- [x] tRPC client setup + RouterOutputs
- [x] Today's Tasks view — priority groups, inline expand, checkbox complete
- [x] Optimistic updates on task complete
- [x] Add Task modal (N shortcut, default today date, default workspace)
- [x] Edit task modal (key prop remount pattern)
- [x] Delete task with confirmation
- [x] Overdue indicator (red date)
- [x] Priority stats bar in Today header
- [x] workspaces tRPC router
- [x] Someday/Backlog view with tabs
- [x] Bot: /tasks, /backlog, /workspaces, /help commands
- [x] Bot service layer (task.ts, user.ts)
- [x] Bot NLP with Gemini 2.5 Flash — natural language task creation

## What's NOT Built Yet
- [ ] Snippets + Scratchpad (Week 3)
- [ ] Notes (Week 3)
- [ ] Credential Vault (Week 4)
- [ ] Bookmarks (Week 4)
- [ ] Env Manager + API Endpoints (Week 5)
- [ ] Project Ideas (Week 5)
- [ ] Voice-to-task (Week 6)
- [ ] Screenshot-to-bug (Week 6)
- [ ] Standup + Recap + Reminders (Week 7)
- [ ] Telegram Mini App (Week 8)
- [ ] Global search (Week 9)
- [ ] PWA (Week 9)

---

## Known Issues / TODOs

- [ ] Remove console.log statements from TasksPage.tsx (3 left)
- [ ] Add `output = "./generated/prisma"` to schema generator block (deferred)
- [ ] Sidebar workspaces are hardcoded — need to fetch from DB
- [ ] N keyboard shortcut handler not global yet

---

## Key Learnings (reference)

- Custom Prisma output path requires importing from `@devvault/db` not `@prisma/client`
- NextAuth session needs type extension for `user.id` — done in `types/`
- tRPC v11 uses `getQueryKey` from `@trpc/react-query` (not `.getQueryKey()` on procedure)
- Optimistic updates: `onMutate` → cancel → backup → update. `onError` → restore. `onSettled` → refetch
- Use `onSettled` not `onSuccess` for refetch in optimistic updates
- `RouterOutputs`: export from `lib/trpc.ts` using `inferRouterOutputs<AppRouter>`
- `.filter(Boolean)` doesn't narrow types — use `.filter((t): t is NonNullable<typeof t> => t != null)`
- Edit modal pre-fill: `key={task?.id ?? 'new'}` on modal forces remount with fresh state
- `useState(() => getInitialForm(task))` with key prop is enough — no useEffect needed for init
- Stats bar: derive from already-fetched tasks via `useMemo+reduce`, no extra query needed
- `isLoading` = first load only. `isFetching` = every fetch including tab switches
- Tab-driven query params: pass query object to `useQuery`, swap params on tab change
- `listToday` procedure handles Today logic server-side — overdue incomplete + today all statuses + null date incomplete
- Don't use dueAfter/dueBefore on frontend for Today view — use a dedicated server procedure with OR clauses
- Gemini model name — use `gemini-2.5-flash` (2.0 and 1.5 deprecated)