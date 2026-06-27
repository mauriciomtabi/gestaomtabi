const { createClient } = require('@supabase/supabase-js');

const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const db = createClient(NEW_URL, NEW_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const SOLDADO_ID = '14fb3202-cddb-4da6-ad9d-ba3201dd71ee';

async function inspectProfile() {
  console.log(`Buscando perfil para o ID: ${SOLDADO_ID}...`);
  const { data: profile, error } = await db.from('profiles').select('*').eq('id', SOLDADO_ID).single();
  if (error) {
    console.error('Erro ao buscar perfil:', error.message);
  } else {
    console.log('Perfil encontrado no banco novo:', JSON.stringify(profile, null, 2));
  }
}

inspectProfile();
