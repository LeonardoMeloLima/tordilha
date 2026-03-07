import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Checking sessoes and their relations...");
    const { data: sessoes, error: sError } = await supabase.from('sessoes').select('*');
    console.log("Sessions count:", sessoes?.length);
    if (sessoes && sessoes.length > 0) {
        console.log("First session sample:", sessoes[0]);
    }

    const { data: evolucao, error: eError } = await supabase.from('evolucao_sessoes').select('*');
    console.log("Evolution count:", evolucao?.length);
    if (evolucao && evolucao.length > 0) {
        console.log("First evolution sample:", evolucao[0]);
    }
}

test();
