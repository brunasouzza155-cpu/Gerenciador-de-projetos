import { createClient } from "@supabase/supabase-js";

// Conexão com o Supabase. As duas chaves vêm do arquivo .env.local
// (que NÃO vai para o GitHub). Enquanto elas não existirem, o app
// roda no modo demonstração, com os dados de exemplo.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = supabase !== null;
