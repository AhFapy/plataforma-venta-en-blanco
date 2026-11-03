import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { Tabs } from "./Tabs";

export const metadata = { title: "Entrena" };

export default async function EntrenaLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requireMember();
  const { data: open } = await supabase.rpc("entrena_open");
  if (!open) redirect("/");
  return <div className="fade-in max-w-4xl"><Tabs />{children}</div>;
}
