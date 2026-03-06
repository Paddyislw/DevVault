# DevVault — CLAUDE.md
> Drop this file in the root of your devvault/ monorepo as `CLAUDE.md`.
> Claude Code reads this automatically on every session.
> Updated after: Day 21

---

## Project Overview

DevVault is a Telegram-first developer productivity tool. Combines task management, snippets, notes, credentials, bookmarks — controllable via Telegram bot + web dashboard.

**Timeline:** 72-day challenge, 1 hour/day, Mon–Sat
**Current day:** Day 21/72 complete (29% done, Week 4 of 12)

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
- Schema uses custom output path: `output = "./generated/prisma"` in generator block
- `packages/db/src/index.ts` imports from `../prisma/generated/prisma` (NOT `@prisma/client`)
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
├── scheduled/page.tsx
├── activity/page.tsx
├── inbox/page.tsx
├── ideas/page.tsx
├── api-endpoints/page.tsx    ← API Playground
├── settings/page.tsx
├── login/page.tsx            ← Telegram login
├── globals.css               ← ALL design tokens as CSS variables
├── layout.tsx
├── notes/page.tsx
├── vault/page.tsx            ← Credential vault
├── bookmarks/page.tsx        ← Bookmarks
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
│   ├── ScheduledPage.tsx
│   ├── AddTaskModal.tsx
│   ├── PriorityPicker.tsx
│   └── WorkspacePicker.tsx
├── activity/
│   ├── index.ts
│   └── ActivityPage.tsx
├── notes/
│   ├── index.ts
│   ├── NotesPage.tsx
│   ├── NoteList.tsx
│   ├── NoteViewer.tsx
│   ├── CommandsView.tsx
│   └── AddNoteModal.tsx
├── vault/
│   ├── index.ts
│   ├── VaultPage.tsx
│   ├── VaultSetup.tsx
│   ├── VaultLock.tsx
│   ├── CredentialList.tsx
│   ├── CredentialCard.tsx
│   └── AddCredentialModal.tsx
├── bookmarks/
│   ├── index.ts
│   ├── BookmarksPage.tsx
│   ├── BookmarkGrid.tsx
│   ├── BookmarkCard.tsx
│   └── AddBookmarkModal.tsx
├── ideas/
│   ├── index.ts
│   ├── IdeasPage.tsx
│   ├── IdeaCard.tsx
│   └── AddIdeaModal.tsx
├── api-endpoints/
│   ├── index.ts
│   ├── ApiPlaygroundPage.tsx  ← main container, owns all state
│   ├── UrlBar.tsx             ← method select + URL input + Send (paste cURL to auto-parse)
│   ├── RequestConfig.tsx      ← Params/Headers/Body/Auth tabs, collapsible
│   ├── ResponsePanel.tsx      ← JSON highlighting, Body/Headers tabs, ResizeHandle export
│   ├── SidePanel.tsx          ← Saved endpoints + history tabs
│   └── AddEndpointModal.tsx   ← create/edit, accepts prefill + onSaved callback
└── ui/                       ← shadcn components only

hooks/
└── useGlobalShortcuts.ts

lib/
├── auth.ts
├── encryption.ts            ← deriveKey, encryptCredential, decryptCredential, hashMasterPassword, verifyMasterPassword
├── metadata.ts              ← fetchUrlMetadata — server-side HTML scraper
├── curl-parser.ts           ← parseCurl, parseQueryParams, buildUrlWithParams
├── prisma.ts
└── trpc.ts

server/
├── routers/
│   ├── tasks.ts
│   ├── workspaces.ts
│   ├── snippets.ts
│   ├── scratchpads.ts
│   ├── notes.ts
│   ├── credentials.ts
│   ├── bookmarks.ts
│   ├── ideas.ts
│   ├── activity.ts
│   └── apiEndpoints.ts
├── root.ts
└── trpc.ts
```

## File Structure (apps/bot/src)

```
apps/bot/src/
├── index.ts          ← Bot entry point, command handlers
└── services/
    ├── user.ts       ← findOrCreateUser, findUserByTelegramId
    ├── task.ts       ← getTodayTasks, getSomedayTasks, getBacklogTasks, formatTasksByPriority
    └── ai.ts         ← parseMessage (NLP), transcribeVoice, extractBugFromScreenshot
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
| `listScheduled` | query | Future tasks — dueDate >= tomorrow, not someday, not done |
| `numberOfIncompleteTasks` | query | Group by priority counts |

### `api.activity.*`
| Procedure | Type | Description |
|---|---|---|
| `list` | query | Paginated activity log, optional entityType and action filter |
| `log` | mutation | Create activity log entry |

### `api.workspaces.*`
| Procedure | Type | Description |
|---|---|---|
| `list` | query | All workspaces for user, ordered default first |

### `api.snippets.*`
| Procedure | Type | Description |
|---|---|---|
| `create` | mutation | Create snippet, verifies workspace ownership |
| `list` | query | Filters: workspaceId, language, tags (hasSome), search (title contains, case-insensitive). Favorites sorted first |
| `byId` | query | Single snippet |
| `update` | mutation | Partial update of title, code, language, tags |
| `delete` | mutation | Hard delete |
| `toggleFavorite` | mutation | Reads current isFavorite, flips it |
| `incrementUsage` | mutation | Atomic `{ increment: 1 }` on usageCount — call on copy |

### `api.scratchpads.*`
| Procedure | Type | Description |
|---|---|---|
| `create` | mutation | Create scratchpad with optional TTL (expiresAt) |
| `list` | query | Runs inline cleanup first, then returns non-promoted non-expired pads |
| `byId` | query | Single scratchpad |
| `update` | mutation | Update content and/or language |
| `delete` | mutation | Hard delete |
| `promote` | mutation | Creates snippet from pad, marks pad isPromoted: true |
| `cleanup` | mutation | Deletes all expired scratchpads for user — returns `{ deleted: count }` |

### `api.notes.*`
| Procedure | Type | Description |
|---|---|---|
| `create` | mutation | Create note or command, verifies workspace ownership |
| `list` | query | Filter by type, search (title/content/command), workspaceId. Pinned first, then by copyCount |
| `update` | mutation | Partial update, ownership verified |
| `delete` | mutation | Hard delete, ownership verified |
| `incrementCopyCount` | mutation | Atomic increment on copyCount |
| `togglePin` | mutation | Flips isPinned |

### `api.credentials.*`
| Procedure | Type | Description |
|---|---|---|
| `setMasterPassword` | mutation | Set master password first time, stores SHA-256 hash only |
| `verifyMasterPassword` | mutation | Returns { verified, needsSetup } — never exposes hash |
| `hasMasterPassword` | query | Returns { hasPassword } — for vault entry gate |
| `create` | mutation | Verifies master password, encrypts value, stores ciphertext |
| `list` | query | Metadata only — encryptedData/iv/salt intentionally excluded |
| `reveal` | mutation | Decrypt on demand, requires master password, updates lastCopiedAt |
| `delete` | mutation | Hard delete, ownership verified |

### `api.bookmarks.*`
| Procedure | Type | Description |
|---|---|---|
| `create` | mutation | Auto-fetches metadata server-side on save |
| `list` | query | Filter by category, search (title/url/description) |
| `update` | mutation | Partial update, ownership verified |
| `delete` | mutation | Hard delete, ownership verified |
| `refreshMetadata` | mutation | Re-fetches title/description/favicon for a URL |
| `checkAlive` | mutation | HEAD request to verify URL still works |

### `api.ideas.*`
| Procedure | Type | Description |
|---|---|---|
| `create` | mutation | Create idea, linked to userId |
| `list` | query | Filter by status, search title/description |
| `update` | mutation | Partial update, ownership verified |
| `delete` | mutation | Hard delete, ownership verified |
| `promote` | mutation | Creates workspace from idea, marks COMMITTED, links id |

### `api.apiEndpoints.*`

**Module philosophy — API Playground (renamed from API Endpoints):**
- Playground-first, not storage-first — default view is an empty request builder
- URL bar is the primary UI element: method selector + URL input + Send button in one bar
- Response panel: JSON viewer with syntax highlighting, status pill, timing, size
- "Save Endpoint" is a secondary action — top-right button, only after testing
- Saved endpoints live in a collapsible sidebar (grouped by project), not the main view
- Request history (last 20) shown in sidebar History tab for loaded saved endpoints
- Request tabs: Params, Headers, Body, Auth — compact, between URL bar and response
- Server-side proxy for Send (`proxyRequest` tRPC mutation) to avoid CORS
- Empty state: "Enter a URL and hit Send" — no illustrations
- cURL paste auto-parses into method/URL/headers/body/auth/params
- Bidirectional URL ↔ query params sync (edit either, both update)
- Resizable split between request config and response panel

| Procedure | Type | Description |
|---|---|---|
| `proxyRequest` | mutation | Proxies HTTP request server-side, returns status + headers + body + time — no DB write |
| `create` | mutation | Save a tested endpoint (method, url, headers, body, auth, project), verifies workspace ownership |
| `list` | query | List saved endpoints, grouped/filtered by workspaceId, method, search |
| `byId` | query | Single endpoint with last 5 pingResults |
| `update` | mutation | Partial update, ownership verified |
| `delete` | mutation | Delete saved endpoint |
| `ping` | mutation | Execute request for a saved endpoint, stores PingResult, updates lastPingAt |
| `history` | query | Last 20 PingResults for a saved endpoint |

**Key design:** `proxyRequest` = fire-and-forget (no DB write). `ping` = saved endpoint execution (writes PingResult row). The playground uses `proxyRequest` by default and switches to `ping` when an endpoint is loaded from the sidebar.

**`fireRequest` helper** in `apiEndpoints.ts` handles auth header injection: BEARER → `Authorization: Bearer`, API_KEY → `X-API-Key`, BASIC → `Authorization: Basic` (base64).

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
- [x] Snippets tRPC router (create, list, byId, update, delete, toggleFavorite, incrementUsage)
- [x] Scratchpads tRPC router (create, list, byId, update, delete, promote, cleanup)
- [x] Scheduled page (listScheduled tRPC + UI, grouped by date)
- [x] Sidebar workspaces fetched from DB (live query)
- [x] useGlobalShortcuts hook — N opens AddTaskModal globally
- [x] Activity log tRPC router (list + log procedures)
- [x] ActivityPage UI — grouped by day, filters, workspace pills, relative timestamps
- [x] logActivity helper wired into tasks router (created, completed, reopened, deleted)
- [x] Workspace filter tabs on Today view
- [x] Sticky default workspace in AddTaskModal
- [x] Task update supports workspaceId change with ownership verification
- [x] Notes tRPC router (create, list, update, delete, incrementCopyCount, togglePin)
- [x] NotesPage — split panel for NOTE type, full-width cheatsheet for COMMAND type
- [x] NoteList — search, pin toggle, type-aware empty states
- [x] NoteViewer — markdown renderer (no deps), command block with copy
- [x] CommandsView — grid + table toggle, grouped by language, inline copy/edit/delete
- [x] AddNoteModal — type toggle, conditional fields for NOTE vs COMMAND
- [x] Credential encryption utility (deriveKey, encryptCredential, decryptCredential, hashMasterPassword, verifyMasterPassword)
- [x] Credentials tRPC router (setMasterPassword, verifyMasterPassword, hasMasterPassword, create, list, reveal, delete)
- [x] Prisma client import fixed — packages/db/src/index.ts now imports from '../prisma/generated/prisma'
- [x] Vault UI — 3-state flow (setup → lock → unlocked)
- [x] VaultSetup — first-time master password creation with confirmation
- [x] VaultLock — unlock prompt with show/hide password toggle
- [x] CredentialCard — masked value, reveal with 30s auto-clear countdown, copy, delete
- [x] CredentialList — category sidebar filter, card grid
- [x] AddCredentialModal — name, category, service, encrypted value input
- [x] credentials query only fires when vault is unlocked (enabled: !!masterPassword)
- [x] Bookmarks tRPC router (create, list, update, delete, refreshMetadata, checkAlive)
- [x] URL metadata fetcher (title, description, favicon — server-side, 5s timeout)
- [x] BookmarksPage — search in header, category sidebar, card grid
- [x] BookmarkCard — favicon, title, description, domain, tags, dead link indicator, refresh metadata
- [x] AddBookmarkModal — URL input, category picker, tags, auto-fetch on save
- [x] Ideas tRPC router (create, list, update, delete, promote)
- [x] IdeasPage — status tabs (All/Raw/Exploring/Committed/Abandoned), card grid
- [x] IdeaCard — description, tech stack badges, status dropdown, promote button
- [x] AddIdeaModal — title, description, tech stack, references
- [x] Promote to Workspace — creates workspace + invalidates workspaces query (sidebar updates instantly)
- [x] API Endpoints Prisma schema — ApiEndpoint + PingResult models, authValue/lastPingAt fields
- [x] apiEndpoints tRPC router — full CRUD + ping + history + proxyRequest
- [x] API Playground UI — Postman-style, two-card layout on surface-2 canvas
- [x] UrlBar — method badge pill, URL input, Send button, smart paste (cURL auto-parse)
- [x] RequestConfig — Params/Headers/Body/Auth tabs, collapsible, bidirectional URL↔params sync
- [x] ResponsePanel — JSON syntax highlighting, Body/Headers tabs with underline indicator, status/time/size meta bar
- [x] ResizeHandle — draggable divider between request and response cards
- [x] SidePanel — Saved endpoints (grouped by project) + History tabs
- [x] AddEndpointModal — prefill from playground state, onSaved callback wires back to loaded endpoint
- [x] cURL parser — parseCurl handles -X, -H, -d, -b (cookie→header), -u (basic auth), boolean/arg flags, strict URL detection
- [x] parseQueryParams / buildUrlWithParams — bidirectional query param ↔ URL sync
- [x] Voice-to-task pipeline — voice note → Gemini transcription → NLP parse → task created
- [x] Screenshot-to-bug pipeline — photo → Gemini Vision → structured bug extraction → P1 task created
- [x] safeEdit helper — editMessageText with silent fallback to ctx.reply if status message deleted
- [x] Bot helper refactors — getAuthenticatedUser, formatDueDate, formatTaskConfirmation extracted

## What's NOT Built Yet
- [ ] Snippets + Scratchpad UI (Week 3)
- [ ] Env Manager (Week 5)
- [ ] Standup + Recap + Reminders (Week 7)
- [ ] Telegram Mini App (Week 8)
- [ ] Global search (Week 9)
- [ ] PWA (Week 9)

---

## Known Issues / TODOs

- [ ] Remove console.log statements from TasksPage.tsx (3 left)

---

## Key Learnings (reference)

- Custom Prisma output path (`./generated/prisma`) requires `packages/db` to re-export from `../prisma/generated/prisma`, and all consumers import from `@devvault/db`
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
- `assertOwnership` helper pattern — extract auth+fetch into a reusable function per router. Returns the record (so callers can use it without a second query)
- Atomic increments in Prisma — use `{ increment: 1 }` in `data` instead of fetch → compute → update
- Scratchpad TTL cleanup strategy — run `deleteMany` on expired rows inline at the top of `list`, so cleanup is automatic on every read without a cron job
- `packages/db/src/index.ts` must import from `../prisma/generated/prisma` not `@prisma/client` — new schema fields won't be picked up by TS otherwise
- Prisma generate must be run after every schema change: `pnpm --filter db exec prisma generate`
- `reveal` is a mutation not a query — decrypted values must never sit in React Query cache
- `crypto.subtle` only available in HTTPS or localhost — fine for Vercel + local dev
- Per-credential salt: each credential gets its own random 16-byte salt, so same password produces different ciphertext every time
- Vault has 3 states: no master password (setup) → locked → unlocked. Handle all 3 in the container component
- `enabled: !!masterPassword` on credentials query — never fetch encrypted data until unlocked
- 30s auto-clear: useEffect watching timeLeft, decrement every second, clear revealed value at 0
- URL metadata fetching: og:title > <title>, og:description > meta description, relative favicon → absolute URL
- Google favicon fallback: https://www.google.com/s2/favicons?domain={domain}&sz=32
- AbortSignal.timeout(5000) — clean way to add fetch timeouts without manual AbortController
- Category counts derived from fetched data client-side via reduce — no extra query needed
- Derive filtered list + counts from single query via filter/reduce — never make two queries for the same data
- promote mutation invalidates both ideas.list AND workspaces.list — sidebar updates instantly
- tRPC deep type instantiation (TS2589): `RouterOutputs['router']['proc']` on complex Prisma includes causes "Type instantiation is excessively deep". Fix: define a manual interface with only the fields you need, cast with `as unknown as MyType`
- Two-card playground layout: use `bg-surface-2` as the canvas, white `bg-surface-1` bordered cards sitting on top — creates visible depth without needing dark backgrounds
- cURL `-b` / `--cookie` flag must be converted to a `Cookie` header, NOT treated as a URL (cookie values contain `.` which triggers naive URL detection)
- cURL parser URL detection: only match `http://` or `https://` prefixes explicitly. Fallback to `token.includes('.') && token.includes('/')` only when no URL found yet — prevents cookie/token strings from being misidentified
- ResizeHandle pattern: `useRef` for dragging state + `window` mousemove/mouseup listeners in `useEffect`. `document.body.style.cursor = 'row-resize'` during drag for smooth UX
- Bidirectional URL↔params sync: use a `syncSource` ref (`'url' | 'params' | null`) as a guard to prevent circular setState calls between handleUrlChange and handleQueryParamsChange
- API requests from browser hit CORS — always proxy through a tRPC mutation server-side (`proxyRequest`), never call external APIs directly from client code
- Playground-first UX: test first, save optionally — don't force users to save before testing. `proxyRequest` for ad-hoc, `ping` for saved endpoints with history tracking
- Gemini 2.5 Flash handles OGG/Opus audio natively via inlineData — no format conversion needed for Telegram voice messages
- Always grab largest photo from ctx.message.photo array (last element) — Telegram sends multiple resolutions
- safeEdit pattern: wrap editMessageText in try/catch, fall back to ctx.reply — handles user-deleted status messages
- Extract chatId + msgId at handler top so catch block can also call safeEdit without crashing
- Type safeEdit options as a simple inline union instead of fighting Parameters<> on grammY internals