/**
 * SCRIPT DE IMPORTAÇÃO DE CSVs PARA O NOVO PROJETO SUPABASE
 * 
 * Como usar:
 * 1. Salve os CSVs exportados do projeto antigo nesta pasta (scratch/)
 *    com os nomes: providers.csv, attendance.csv, etc.
 * 2. Execute: node scratch/import-csvs.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const db = createClient(NEW_URL, NEW_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Parser CSV simples que lida com campos entre aspas e vírgulas
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  
  const parseRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      const val = values[idx]?.trim() ?? null;
      // Converter strings vazias e 'null' para null
      obj[h.trim()] = (val === '' || val === 'null' || val === 'NULL') ? null : val;
    });
    rows.push(obj);
  }
  
  return rows;
}

async function importTable(tableName, csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.log(`  ⏭️  ${tableName}: arquivo ${path.basename(csvPath)} não encontrado, pulando`);
    return 0;
  }
  
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(content);
  
  if (rows.length === 0) {
    console.log(`  ⏭️  ${tableName}: 0 linhas no CSV`);
    return 0;
  }
  
  console.log(`  📥 ${tableName}: ${rows.length} registros...`);
  
  const batchSize = 100;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    const { error } = await db.from(tableName).upsert(batch, { 
      onConflict: 'id',
      ignoreDuplicates: false 
    });
    
    if (error) {
      console.log(`     ⚠️  Lote ${i}-${i+batchSize}: ${error.message.substring(0, 80)}`);
      errors++;
      // Tentar inserir um por um para identificar o problema
      for (const row of batch) {
        const { error: e2 } = await db.from(tableName).upsert([row], { onConflict: 'id' });
        if (!e2) imported++;
        else errors++;
      }
    } else {
      imported += batch.length;
    }
  }
  
  console.log(`     ✅ ${imported} importados, ${errors} erros`);
  return imported;
}

async function importUsers(csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.log(`  ⏭️  users: arquivo não encontrado`);
    return;
  }
  
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(content);
  console.log(`  📥 users: ${rows.length} usuários...`);
  
  let created = 0, skipped = 0;
  for (const user of rows) {
    const { error } = await db.auth.admin.createUser({
      email: user.email,
      password: 'Acesso@CBM2026',
      email_confirm: true,
      user_metadata: { name: user.name || '', war_name: user.war_name || '' }
    });
    
    if (error) {
      if (error.message.includes('already') || error.message.includes('exists')) {
        skipped++;
      } else {
        console.log(`     ⚠️  ${user.email}: ${error.message}`);
      }
    } else {
      created++;
    }
  }
  console.log(`     ✅ ${created} criados, ${skipped} já existiam`);
}

async function main() {
  console.log('📦 IMPORTAÇÃO DE DADOS DO PROJETO ANTIGO\n');
  console.log(`   Destino: ${NEW_URL}\n`);
  
  const csvDir = './scratch';
  
  // Ordem importante: tabelas pai antes de filhas
  const tables = [
    { name: 'providers',           file: 'providers.csv' },
    { name: 'audit_logs',          file: 'audit_logs.csv' },
    { name: 'attendance',          file: 'attendance.csv' },
    { name: 'vehicles',            file: 'vehicles.csv' },
    { name: 'fuel_supplies',       file: 'fuel_supplies.csv' },
    { name: 'fuel_audit_logs',     file: 'fuel_audit_logs.csv' },
    { name: 'face_descriptors',    file: 'face_descriptors.csv' },
    { name: 'monthly_evaluations', file: 'monthly_evaluations.csv' },
    { name: 'station_nicknames',   file: 'station_nicknames.csv' },
    { name: 'sys_config',          file: 'sys_config.csv' },
    { name: 'profiles',            file: 'profiles.csv' },
  ];
  
  // Importar usuários primeiro se existir
  await importUsers(path.join(csvDir, 'users.csv'));
  
  let totalImported = 0;
  for (const t of tables) {
    const count = await importTable(t.name, path.join(csvDir, t.file));
    totalImported += count;
  }
  
  // service_swaps por último (depende de auth.users)
  const swapsCount = await importTable('service_swaps', path.join(csvDir, 'service_swaps.csv'));
  totalImported += swapsCount;
  
  console.log(`\n🎉 CONCLUÍDO! Total importado: ${totalImported} registros`);
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('   1. Acesse gestaocbmrs.vercel.app');
  console.log('   2. Login: mtabi.adm@gmail.com / Admin@CBM2026');
  console.log('   3. Crie as senhas dos outros usuários em Configurações');
}

main().catch(e => { console.error('❌ Fatal:', e.message); process.exit(1); });
