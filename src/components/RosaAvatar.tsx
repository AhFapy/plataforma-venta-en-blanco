/* eslint-disable @next/next/no-img-element */
/** Avatar de Rosa, la asistente de la plataforma. Si no hay foto subida, monograma de marca. */
export function RosaAvatar({ url, size = 40 }: { url?: string | null; size?: number }) {
  return url ? (
    <img src={url} alt="Rosa" width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span
      className="grid place-items-center rounded-full shrink-0 bg-accent text-[#0c1f15] font-serif italic"
      style={{ width: size, height: size, fontSize: size * 0.56, lineHeight: 1 }}
      aria-label="Rosa"
    >
      R
    </span>
  );
}
