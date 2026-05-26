import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (process.env.NODE_ENV === "production" && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    "[Collatz Engine] Supabase environment variables are not set. Database features will be unavailable."
  );
}

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
