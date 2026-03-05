interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between border-b border-border-subtle px-6 py-4">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[32px] leading-none text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-text-tertiary tracking-wide">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-3">{children}</div>
      )}
    </div>
  );
}
