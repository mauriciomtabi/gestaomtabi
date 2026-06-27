const { createClient } = require('@supabase/supabase-js');

const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const db = createClient(NEW_URL, NEW_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fixProfiles() {
  console.log('🔍 Buscando perfis no banco novo...');
  const { data: profiles, error } = await db.from('profiles').select('*');
  
  if (error) {
    console.error('Erro ao buscar perfis:', error.message);
    return;
  }
  
  console.log(`Encontrados ${profiles.length} perfis. Verificando campos nulos...`);
  
  let fixedCount = 0;
  for (const p of profiles) {
    const needFix = p.name === null || p.war_name === null || p.rank === null;
    if (needFix) {
      console.log(`🔧 Perfil do usuário ${p.email} (ID: ${p.id}) possui campos nulos. Corrigindo...`);
      const { error: updateErr } = await db.from('profiles').update({
        name: p.name || '',
        war_name: p.war_name || '',
        rank: p.rank || '',
        allowed_screens: p.allowed_screens || ['dashboard', 'fuel', 'face-checkin']
      }).eq('id', p.id);
      
      if (updateErr) {
        console.error(`  ❌ Erro ao atualizar perfil ${p.email}:`, updateErr.message);
      } else {
        console.log(`  ✅ Perfil ${p.email} corrigido!`);
        fixedCount++;
      }
    }
  }
  
  console.log(`🎉 Correção de perfis finalizada! ${fixedCount} perfis corrigidos.`);
}

fixProfiles().catch(err => console.error('Erro geral:', err.message));
