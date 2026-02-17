interface SectionLabelProps {
  children: React.ReactNode;
  collapsed?: boolean;
}

export function SectionLabel({ children, collapsed = false }: SectionLabelProps) {
  if (collapsed) return null;

  return (
    <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-widest text-text-ghost">
      {children}
    </p>
  );
}
