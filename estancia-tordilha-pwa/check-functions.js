import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFunctions() {
  const { data, error } = await supabase.rpc('get_evolucao_clinica_recente');
  console.log('Result for get_evolucao_clinica_recente:', data, error);
}

checkFunctions();
