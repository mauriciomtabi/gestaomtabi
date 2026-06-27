import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjg1MzQsImV4cCI6MjA5NzUwNDUzNH0.FUPtbmSDGdQtGM3kRAfxiuWIXIbjXDlbpV0724XrX4w';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log("Checking tables in database...");
  
  // Try querying one of our target tables to see if it exists
  const targetTables = ['clientes', 'projetos', 'ferramentas_custos', 'pipeline_negociacao', 'financeiro_movimentos', 'log_acessos_credenciais'];
  
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
