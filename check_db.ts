import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Buscando dados...');
  const { data: clients, error: cErr } = await supabase.from('clients').select('*');
  console.log('Clientes:', clients?.length, cErr);

  const { data: projects, error: pErr } = await supabase.from('projects').select('*');
  console.log('Projetos:', projects?.length, pErr);

  const { data: profs, error: profErr } = await supabase.from('professionals').select('*');
  console.log('Profissionais:', profs?.length, profErr);

  const { data: groups, error: gErr } = await supabase.from('cost_groups').select('*');
  console.log('Grupos de Custo:', groups?.length, gErr);

  const { data: items, error: iErr } = await supabase.from('cost_items').select('*');
  console.log('Itens de Custo:', items?.length, iErr);
}

check().catch(console.error);
