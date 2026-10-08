export function PageHeader({ label, title, emphasis, children }: { label?: string; title: string; emphasis?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {label && <span className="badge badge-dot mb-4">{label}</span>}
        <h1 className="text-[34px] sm:text-[46px] leading-[1.05] font-semibold tracking-[-0.035em]">
          {title} {emphasis && <span className="em">{emphasis}</span>}
        </h1>
      </div>
      {children}
    </div>
  );
}
