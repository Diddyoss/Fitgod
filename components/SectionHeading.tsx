export default function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[11px] uppercase tracking-[0.18em] text-ink-2">
          {children}
        </h2>
        {action}
      </div>
      <div className="accent-rule mt-2" />
    </div>
  );
}
