// apps/web/src/server/root.ts
import { router } from './trpc'
import { tasksRouter } from './routers/tasks'
import { workspacesRouter } from './routers/workspaces'
import { snippetsRouter } from './routers/snippets'
import { scratchpadsRouter } from './routers/scratchpads'
import { activityRouter } from './routers/activity'

export const appRouter = router({
  tasks: tasksRouter,
  workspaces: workspacesRouter,
  snippets: snippetsRouter,
  scratchpads: scratchpadsRouter,
  activity: activityRouter,
})

export type AppRouter = typeof appRouter