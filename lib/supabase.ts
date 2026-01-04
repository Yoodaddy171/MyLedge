import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient otomatis menangani cookies di sisi browser
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);