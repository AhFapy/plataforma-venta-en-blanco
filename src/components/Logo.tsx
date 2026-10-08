import Image from "next/image";

export function Logo({ dark = false, size = 20 }: { dark?: boolean; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${dark ? "on-dark text-[#f5f4ef]" : ""}`}>
      <span className="grid place-items-center rounded-[10px] bg-bg-dark" style={{ width: size * 1.6, height: size * 1.6 }}>
        <Image src="/isotipo.png" alt="" width={size * 1.1} height={size * 0.82} priority />
      </span>
      <span className="font-semibold tracking-[-0.03em]" style={{ fontSize: size }}>
        Trud <span className="em">Sales.</span>
      </span>
    </span>
  );
}
