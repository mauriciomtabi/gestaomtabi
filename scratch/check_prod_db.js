import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rpnyobdmaaanyuquywiv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnlvYmRtYWFhbnl1cXV5d2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzIzODEsImV4cCI6MjA5ODEwODM4MX0.6ROH6dNdkdoNrfEl4kdEOyU_FASD0iGuSt8irtYueBg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log("Checking tables in VITE_SUPABASE_URL database...");
  
  const targetTables = ['profiles', 'clientes', 'projetos', 'ferramentas_custos', 'pipeline_negociacao', 'financeiro_movimentos', 'log_acessos_credenciais'];
  
  for (const table of targetTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}' failed or doesn't exist:`, error.message);
      } else {
        console.log(`Table '${table}' exists. Row count sample:`, data.length);
      }
    } catch (e) {
      console.log(`Exception querying '${table}':`, e.message);
    }
  }
}

check();
