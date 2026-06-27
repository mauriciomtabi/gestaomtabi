const { createClient } = require('@supabase/supabase-js');

const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const db = createClient(NEW_URL, NEW_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const USERS_TO_UPDATE = [
  { email: 'mtabi.adm@gmail.com', id: '7869829d-eb25-4440-98ab-c7f757c033eb' },
  { email: 'soldado.teste@cbm.rs.gov.br', id: '14fb3202-cddb-4da6-ad9d-ba3201dd71ee' }
];

const NEW_PASSWORD = '@Speni190868';

async function updatePasswords() {
  console.log('🔑 Iniciando atualização de senhas...');
  
  for (const user of USERS_TO_UPDATE) {
    console.log(`Updating password for ${user.email} (ID: ${user.id})...`);
    const { data, error } = await db.auth.admin.updateUserById(user.id, {
      password: NEW_PASSWORD
    });
    
    if (error) {
      console.error(`❌ Erro ao atualizar senha para ${user.email}:`, error.message);
    } else {
      console.log(`✅ Senha atualizada com sucesso para ${user.email}!`);
    }
  }
}

updatePasswords().catch(err => console.error('Erro geral:', err.message));
