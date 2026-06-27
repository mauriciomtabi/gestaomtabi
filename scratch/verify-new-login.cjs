const { createClient } = require('@supabase/supabase-js');

const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const db = createClient(NEW_URL, NEW_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function main() {
  // Listar todos os usuários
  const { data: { users }, error } = await db.auth.admin.listUsers();
  if (error) { console.error('Erro:', error.message); return; }
  
  console.log(`\n📋 Usuários no novo projeto (${users.length} total):`);
  for (const u of users) {
    console.log(`  - ${u.email} | confirmed: ${u.email_confirmed_at ? 'SIM' : 'NÃO'} | id: ${u.id}`);
  }
  
  // Resetar senha do admin com senha mais simples
  const admin = users.find(u => u.email === 'mtabi.adm@gmail.com');
  if (!admin) { console.log('\n❌ Admin não encontrado!'); return; }
  
  const NEW_PASS = 'Cbm@2026';
  const { error: updateErr } = await db.auth.admin.updateUserById(admin.id, {
    password: NEW_PASS,
    email_confirm: true
  });
  
  if (updateErr) {
    console.error('\n❌ Erro ao atualizar senha:', updateErr.message);
  } else {
    console.log(`\n✅ Senha resetada com sucesso!`);
    console.log(`   Email: mtabi.adm@gmail.com`);
    console.log(`   Senha: ${NEW_PASS}`);
  }
  
  // Testar login
  const anonDb = createClient(NEW_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Mjg1MzQsImV4cCI6MjA5NzUwNDUzNH0.FUPtbmSDGdQtGM3kRAfxiuWIXIbjXDlbpV0724XrX4w');
  const { data: signInData, error: signInErr } = await anonDb.auth.signInWithPassword({
    email: 'mtabi.adm@gmail.com',
    password: NEW_PASS
  });
  
  if (signInErr) {
    console.error('\n❌ Teste de login falhou:', signInErr.message);
  } else {
    console.log('\n✅ Login testado com SUCESSO! O sistema está funcionando.');
    console.log(`   Token: ${signInData.session?.access_token?.substring(0, 30)}...`);
  }
}

main().catch(e => console.error('❌', e.message));
