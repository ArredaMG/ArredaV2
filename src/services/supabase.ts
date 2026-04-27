import { createClient } from '@supabase/supabase-js';

// As credenciais devem ser configuradas no arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Credenciais do Supabase não encontradas. Certifique-se de configurar o arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
