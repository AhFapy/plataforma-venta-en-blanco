export function PageHeader({ title, emphasis, children }: { label?: string; title: string; emphasis?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[30px] sm:text-[38px] leading-[1.08] font-semibold tracking-[-0.035em]">
          {title} {emphasis && <span className="em">{emphasis}</span>}
        </h1>
      </div>
      {children}
    </div>
  );
}
