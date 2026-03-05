// apps/web/src/server/root.ts
import { router } from './trpc'
import { tasksRouter } from './routers/tasks'
import { workspacesRouter } from './routers/workspaces'
import { snippetsRouter } from './routers/snippets'
import { scratchpadsRouter } from './routers/scratchpads'
import { activityRouter } from './routers/activity'
import { notesRouter } from './routers/notes'
import { credentialsRouter } from './routers/credentials'
import { bookmarksRouter } from './routers/bookmarks'
import { ideasRouter } from './routers/ideas'

export const appRouter = router({
  tasks: tasksRouter,
  workspaces: workspacesRouter,
  snippets: snippetsRouter,
  scratchpads: scratchpadsRouter,
  activity: activityRouter,
  notes: notesRouter,
  credentials: credentialsRouter,
  bookmarks: bookmarksRouter,
  ideas: ideasRouter,
})

export type AppRouter = typeof appRouter