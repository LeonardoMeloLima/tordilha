import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Fetching data with correct column names (avatar_url)...");
  const { data, error } = await supabase
    .from('alunos')
    .select(`
      id,
      nome,
      avatar_url,
      sessoes (
        id,
        data_hora,
        evolucao_sessoes (
          cognitivo, pedagogico, social, emocional, agitacao, interacao
        )
      )
    `);

  if (error) {
    console.error("Error fetching:", JSON.stringify(error, null, 2));
  } else {
    console.log("Total students found:", data?.length);
    if (data && data.length > 0) {
      const studentsWithSessions = data.filter(a => a.sessoes.length > 0);
      console.log("Students with sessions:", studentsWithSessions.length);

      const stWithEvol = studentsWithSessions.filter(a =>
        a.sessoes.some(s => s.evolucao_sessoes && s.evolucao_sessoes.length > 0)
      );
      console.log("Students with clinical evolution:", stWithEvol.length);

      console.log("Sample Data (First Student):", JSON.stringify(data[0], null, 2));
    } else {
      console.log("No students found.");
    }
  }
}

test();
