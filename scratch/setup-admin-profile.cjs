const { createClient } = require('@supabase/supabase-js');

const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const db = createClient(NEW_URL, NEW_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function setupAdmin() {
  console.log('🔧 Configurando perfil admin...');
  
  // Buscar usuário pelo email
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers();
  if (listErr) { console.error('Erro:', listErr.message); return; }
  
  const admin = users.find(u => u.email === 'mtabi.adm@gmail.com');
  if (!admin) { console.log('❌ Admin não encontrado'); return; }
  
  console.log(`✅ Admin encontrado: ${admin.id}`);
  
  // Criar/atualizar perfil com permissões de admin
  const { error } = await db.from('profiles').upsert({
    id: admin.id,
    email: 'mtabi.adm@gmail.com',
    name: 'Maurício Tabis',
    war_name: 'MACIEL',
    rank: '3º SGT',
    cpf: '',
    is_admin: true,
    allowed_screens: ['dashboard', 'providers', 'attendance', 'face-checkin', 'fuel', 'reports', 'settings', 'service-swap', 'admin']
  }, { onConflict: 'id' });
  
  if (error) {
    console.error('❌ Erro no profile:', error.message);
  } else {
    console.log('✅ Perfil admin configurado com sucesso!');
    console.log('\n🔑 Login:');
    console.log('   Email: mtabi.adm@gmail.com');
    console.log('   Senha: Admin@CBM2026');
  }
}

setupAdmin().catch(e => console.error('❌', e.message));
