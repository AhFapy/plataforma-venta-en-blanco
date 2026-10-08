import Link from "next/link";
import { requireStaff } from "@/lib/auth";

const tabs = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/alumnos", label: "Alumnos" },
  { href: "/admin/contenido", label: "Contenido" },
  { href: "/admin/eventos", label: "Directos" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div className="fade-in">
      <span className="badge badge-dot mb-4">Admin</span>
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-full px-4 py-2 text-sm bg-bg-badge text-ink-muted hover:text-ink">{t.label}</Link>
        ))}
      </div>
      {children}
    </div>
  );
}
