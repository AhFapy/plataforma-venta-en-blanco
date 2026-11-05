import { requireStaff } from "@/lib/auth";

export default async function ImportarLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return children;
}
