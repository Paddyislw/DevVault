import { Suspense } from "react";
import { TasksPage } from "@/components/tasks";

export default function TodayPage() {
  // Suspense boundary required — TasksPage reads useSearchParams (?tab, ?ws)
  return (
    <Suspense>
      <TasksPage />
    </Suspense>
  );
}
