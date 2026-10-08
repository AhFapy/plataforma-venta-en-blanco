/* eslint-disable @next/next/no-img-element */
import { initials } from "@/lib/utils";

export function Avatar({ name, url, size = 36 }: { name?: string | null; url?: string | null; size?: number }) {
  return url ? (
    <img src={url} alt="" width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span
      className="grid place-items-center rounded-full bg-brand-soft text-brand-deep font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
