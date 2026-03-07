import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data: { user } } = await supabase.auth.getUser();
    console.log("Current User:", user?.id, user?.email);

    if (user) {
        const { data: roles } = await supabase.from('user_roles').select('*').eq('user_id', user.id);
        console.log("Roles:", roles);
    }
}

test();
// I can't run this easily because I don't have a session in my environment.
// But I can use mcp_supabase-mcp-server_execute_sql to see what's in user_roles.
