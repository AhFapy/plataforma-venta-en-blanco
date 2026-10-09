// Importa alumnos desde un CSV exportado de GHL.
// Uso:  node --env-file=.env.local scripts/importar-alumnos.mjs alumnos.csv [--admin=email1,email2]
//
// Columnas reconocidas (cabecera, sin importar mayúsculas):
//   email | nombre / full_name / first_name + last_name | telefono / phone | promocion / cohort | fecha_alta / date_added
// Idempotente: si el email ya existe, lo deja activo y no lo duplica.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2];
if (!file) { console.error("Falta el CSV"); process.exit(1); }
const admins = (process.argv.find((a) => a.startsWith("--admin=")) ?? "").replace("--admin=", "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

function parseCSV(text) {
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === "," || c === ";") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

// Acepta DD/MM/YYYY (formato España), YYYY-MM-DD y fechas ISO
function parseDate(v) {
  const m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (m) { const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12)); return Number.isNaN(d.getTime()) ? null : d; }
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
  return null;
}

const rows = parseCSV(readFileSync(file, "utf8").replace(/^﻿/, ""));
const head = rows.shift().map((h) => h.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_"));
const col = (...names) => names.map((n) => head.indexOf(n)).find((i) => i >= 0) ?? -1;
const iEmail = col("email", "correo"), iName = col("nombre", "full_name", "name"), iFirst = col("first_name"), iLast = col("last_name");
const iPhone = col("telefono", "phone", "tel"), iCohort = col("promocion", "cohort"), iDate = col("fecha_alta", "date_added", "created");
if (iEmail < 0) { console.error("No encuentro la columna email. Cabecera:", head); process.exit(1); }

let created = 0, existing = 0, failed = 0;
for (const r of rows) {
  const email = (r[iEmail] ?? "").trim().toLowerCase();
  if (!email.includes("@")) continue;
  const full_name = (iName >= 0 ? r[iName] : [r[iFirst], r[iLast]].filter(Boolean).join(" ")).trim();
  const phone = iPhone >= 0 ? r[iPhone]?.trim() : null;
  const cohort = iCohort >= 0 ? r[iCohort]?.trim() || null : null;
  const date = iDate >= 0 ? r[iDate]?.trim() : null;

  const { data: ex } = await supabase.from("profile_private").select("id").eq("email", email).maybeSingle();
  let id = ex?.id;
  if (id) { existing++; await supabase.from("profiles").update({ active: true }).eq("id", id); }
  else {
    const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name, phone, cohort } });
    if (error) { failed++; console.error("✗", email, error.message); continue; }
    id = data.user.id; created++;
  }
  const patch = {};
  if (date) {
    const d = parseDate(date);
    if (d) patch.enrolled_at = d.toISOString();
    else console.warn("  ⚠ fecha no reconocida, se deja hoy:", email, date);
  }
  if (admins.includes(email)) patch.role = "admin";
  if (Object.keys(patch).length) await supabase.from("profiles").update(patch).eq("id", id);
  console.log(ex ? "=" : "✓", email);
}
console.log(`\nCreados ${created} · ya existían ${existing} · fallidos ${failed}`);
