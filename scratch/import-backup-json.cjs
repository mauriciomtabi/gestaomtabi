const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const NEW_URL = 'https://lirbmymfsdktxdvbnrrg.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcmJteW1mc2RrdHhkdmJucnJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTkyODUzNCwiZXhwIjoyMDk3NTA0NTM0fQ.ebsWZ12HXqnFCKhafN266cH4vVrfQFrLQW6Cyt79j-c';

const db = createClient(NEW_URL, NEW_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const backupFilePath = path.join(__dirname, 'backup-data.json');

// Ordem correta para evitar erros de Foreign Key
const TABLES_ORDER = [
  'sys_config',
  'station_nicknames',
  'vehicles',
  'providers',
  'profiles',
  'attendance',
  'audit_logs',
  'face_descriptors',
  'monthly_evaluations',
  'fuel_supplies',
  'fuel_audit_logs',
  'service_swaps'
];

async function importTable(tableName, rows) {
  if (!rows || rows.length === 0) {
    console.log(`⏭️  ${tableName}: Sem dados para importar`);
    return;
  }

  console.log(`📥 Importando ${tableName} (${rows.length} registros)...`);
  
  // Como estamos migrando dados oficiais, fazemos upsert para evitar duplicidade se rodado mais de uma vez
  // Alguns registros podem não ter coluna 'id', mas a maioria tem
  const batchSize = 100;
  let imported = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    let batch = rows.slice(i, i + batchSize);
    
    // Remove colunas que não existem no novo schema para evitar erros
    if (tableName === 'audit_logs') {
      batch = batch.map(row => {
        const { created_at, ...rest } = row;
        return rest;
      });
    }
    if (tableName === 'profiles') {
      batch = batch.map(row => {
        const { updated_at, ...rest } = row;
        return rest;
      });
    }
    
    // Tenta fazer upsert
    const upsertOptions = tableName === 'sys_config' ? { onConflict: 'key' } : undefined;
    const { error } = await db.from(tableName).upsert(batch, upsertOptions);
    
    if (error) {
      console.log(`   ⚠️ Erro no lote ${i}-${i + batch.length} da tabela ${tableName}: ${error.message}`);
      errorCount += batch.length;
      
      // Tentar um a um em caso de erro para ver o motivo
      for (const row of batch) {
        const upsertOptionsSingle = tableName === 'sys_config' ? { onConflict: 'key' } : undefined;
        const { error: singleError } = await db.from(tableName).upsert([row], upsertOptionsSingle);
        if (singleError) {
          console.error(`   ❌ Erro no registro id=${row.id || 'N/A'}: ${singleError.message}`);
        } else {
          imported++;
          errorCount--;
        }
      }
    } else {
      imported += batch.length;
    }
  }

  console.log(`✅ ${tableName}: ${imported} registros importados com sucesso (${errorCount} erros).`);
}

async function main() {
  if (!fs.existsSync(backupFilePath)) {
    console.error(`❌ Arquivo de backup não encontrado em: ${backupFilePath}`);
    console.error('Cole o JSON de backup gerado pela query no arquivo scratch/backup-data.json primeiro!');
    process.exit(1);
  }

  console.log('🚀 Iniciando restauração do banco de dados...');
  console.log(`Destino: ${NEW_URL}\n`);

  let backupData;
  try {
    const rawData = fs.readFileSync(backupFilePath, 'utf8');
    // Em caso de copiar do SQL Editor do Supabase, o resultado pode vir com uma estrutura como:
    // [{"backup": { ... }}] ou apenas { ... }
    let parsed = JSON.parse(rawData);
    if (Array.isArray(parsed) && parsed.length > 0) {
      backupData = parsed[0].backup || parsed[0];
    } else {
      backupData = parsed.backup || parsed;
    }
  } catch (err) {
    console.error('❌ Falha ao analisar o JSON do arquivo de backup:', err.message);
    process.exit(1);
  }

  for (const table of TABLES_ORDER) {
    const rows = backupData[table];
    await importTable(table, rows);
  }

  console.log('\n🎉 Processo de restauração de tabelas públicas finalizado!');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
