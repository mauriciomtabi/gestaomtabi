const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc6OTg2MTY5NSwiZXhwIjoyMDg1NDM3Njk1fQ.Rme-4TmNPhCJzQTb0pLjSVmHtPUJV6kYcNNifHlWHaw';

const oldDb = createClient(OLD_URL, OLD_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  console.log('Testando conexão com banco antigo...');
  try {
    const { data, error } = await oldDb.from('providers').select('*').limit(5);
    if (error) {
      console.error('Erro retornado pelo Supabase antigo:', error);
    } else {
      console.log('Conexão de leitura bem-sucedida! Dados lidos:', data);
    }
  } catch (err) {
    console.error('Erro ao fazer a requisição:', err);
  }
}

run();
