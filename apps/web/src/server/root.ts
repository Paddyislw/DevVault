// apps/web/src/server/root.ts
import { router } from './trpc'
import { tasksRouter } from './routers/tasks'
import { workspacesRouter } from './routers/workspaces'

export const appRouter = router({
  tasks: tasksRouter,
  workspaces: workspacesRouter
})

export type AppRouter = typeof appRouter