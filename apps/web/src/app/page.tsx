import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function TodayPage() {
  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <PageHeader title="Today" subtitle={getFormattedDate()} />

      <div className="mt-8">
        <EmptyState
          message="No tasks for today."
          shortcut="N"
          actionHint="to create one"
        />
      </div>
    </div>
  );
}