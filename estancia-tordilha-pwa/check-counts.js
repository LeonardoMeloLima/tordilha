import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('sessoes').select('count', { count: 'exact' });
  console.log('Sessions count:', data, error);
  
  const { data: d2, error: e2 } = await supabase.from('evolucao_sessoes').select('count', { count: 'exact' });
  console.log('Evolutions count:', d2, e2);
}

check();
