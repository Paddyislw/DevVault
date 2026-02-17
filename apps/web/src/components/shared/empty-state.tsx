interface EmptyStateProps {
  message: string;
  /** Keyboard shortcut hint, e.g. "N" */
  shortcut?: string;
  /** Action text, e.g. "to create one" */
  actionHint?: string;
}

export function EmptyState({ message, shortcut, actionHint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-border-default bg-surface-1 px-8 py-12">
      <p className="text-[13px] text-text-secondary">{message}</p>
      {shortcut && actionHint && (
        <p className="mt-2 text-[12px] text-text-ghost">
          Press <kbd className="kbd">{shortcut}</kbd> {actionHint}
        </p>
      )}
    </div>
  );
}
