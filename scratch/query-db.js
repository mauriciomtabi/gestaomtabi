const SUPABASE_URL = 'https://rpnyobdmaaanyuquywiv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnlvYmRtYWFhbnl1cXV5d2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzIzODEsImV4cCI6MjA5ODEwODM4MX0.6ROH6dNdkdoNrfEl4kdEOyU_FASD0iGuSt8irtYueBg';

async function run() {
  try {
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'mtabi.adm@gmail.com',
        password: 'Cbm@2026'
      })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      console.log("Login failed:", loginData);
      return;
    }
    const token = loginData.access_token;

    // Fetch Clientes to find IDs
    const resCli = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=id,nome_empresa`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    const clientes = await resCli.json();

    const jle = clientes.find(c => c.nome_empresa.includes('JLE'));
    const global = clientes.find(c => c.nome_empresa.includes('Global'));

    if (jle) {
      console.log(`\n--- CONTRATOS JLE (${jle.id}) ---`);
      const resCont = await fetch(`${SUPABASE_URL}/rest/v1/contratos?cliente_id=eq.${jle.id}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
      });
      console.log(await resCont.json());

      console.log(`\n--- MOVIMENTOS JLE ---`);
      const resMov = await fetch(`${SUPABASE_URL}/rest/v1/financeiro_movimentos?cliente_id=eq.${jle.id}&order=mes_referencia.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
      });
      console.log(await resMov.json());
    }

    if (global) {
      console.log(`\n--- CONTRATOS GLOBAL (${global.id}) ---`);
      const resCont = await fetch(`${SUPABASE_URL}/rest/v1/contratos?cliente_id=eq.${global.id}`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
      });
      console.log(await resCont.json());

      console.log(`\n--- MOVIMENTOS GLOBAL ---`);
      const resMov = await fetch(`${SUPABASE_URL}/rest/v1/financeiro_movimentos?cliente_id=eq.${global.id}&order=mes_referencia.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
      });
      console.log(await resMov.json());
    }

  } catch (err) {
    console.error("Error:", err);
  }
}

run();
