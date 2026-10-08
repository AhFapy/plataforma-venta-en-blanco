export function ProgressBar({ value, dark = false }: { value: number; dark?: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`h-2 w-full rounded-full overflow-hidden ${dark ? "bg-white/10" : "bg-bg-badge"}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-[width] duration-700 ${dark ? "bg-accent" : "bg-brand"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
