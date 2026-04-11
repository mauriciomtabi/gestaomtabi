import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gsdweukrawfmgqprngyl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZHdldWtyYXdmbWdxcHJuZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjE2OTUsImV4cCI6MjA4NTQzNzY5NX0.dTdM1Jyhu0G0skkuBH2flsgnKXbmFtLYTh3wj0TDRiQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const { data: attendance } = await supabase.from('attendance').select('*');
  const { data: providers } = await supabase.from('providers').select('*');
  const p = providers.find(p => p.name.includes('MAURICIO MACIEL'));
  if (p) {
    const records = attendance.filter(a => a.provider_id === p.id);
    console.log("Mauricio records:");
    console.log(records);
  }
}
test();
