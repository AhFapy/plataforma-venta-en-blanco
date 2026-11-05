import Link from "next/link";
import { requireStudentsViewer } from "@/lib/auth";

const tabs = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/solicitudes", label: "Solicitudes" },
  { href: "/admin/alumnos", label: "Alumnos" },
  { href: "/admin/contenido", label: "Contenido" },
  { href: "/admin/eventos", label: "Directos" },
  { href: "/admin/deberes", label: "Deberes" },
  { href: "/admin/recursos", label: "Recursos" },
  { href: "/admin/misiones", label: "Misiones" },
  { href: "/admin/entrena", label: "Entrena" },
  { href: "/admin/popups", label: "Pop-ups" },
  { href: "/admin/rosa", label: "Rosa" },
  { href: "/admin/ajustes", label: "Ajustes" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireStudentsViewer();
  const onlyStudents = profile.role === "csm";
  const { count } = onlyStudents ? { count: 0 } : await supabase.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "pendiente");
  const visible = onlyStudents ? tabs.filter((t) => t.href === "/admin/alumnos") : tabs;
  return (
    <div className="fade-in">
            <div className="flex flex-wrap gap-2 mb-8">
        {visible.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-full px-4 py-2 text-sm bg-bg-badge text-ink-muted hover:text-ink inline-flex items-center gap-1.5">
            {t.label}
            {t.href === "/admin/solicitudes" && (count ?? 0) > 0 && <span className="rounded-full bg-brand text-white text-[11px] leading-none px-1.5 py-1 tabular-nums">{count}</span>}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
