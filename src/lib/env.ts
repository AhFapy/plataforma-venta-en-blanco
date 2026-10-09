// Acepta los nombres que pone la integración Supabase ↔ Vercel (nuevos y antiguos)
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") as string;
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "") as string;
