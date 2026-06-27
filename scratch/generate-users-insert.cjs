const fs = require('fs');
const path = require('path');

const csvPath = 'C:\\Users\\Operador\\Downloads\\CSV\\Supabase Snippet Untitled query.csv';
const sqlOutputPath = path.join(__dirname, 'insert-users.sql');

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
      obj[h.trim()] = (val === '' || val === 'null' || val === 'NULL') ? null : val;
    });
    rows.push(obj);
  }
  
  return rows;
}

try {
  const content = fs.readFileSync(csvPath, 'utf8');
  const users = parseCSV(content);
  console.log(`Lidos ${users.length} usuários do CSV.`);
  
  let sql = `-- =====================================================\n`;
  sql += `-- SQL PARA IMPORTAR OS USUÁRIOS PRESERVANDO AS SENHAS\n`;
  sql += `-- Execute este arquivo no SQL Editor do projeto NOVO (lirbmymfsdktxdvbnrrg)\n`;
  sql += `-- =====================================================\n\n`;
  
  sql += `-- 1. Limpar administrador temporário que possui ID diferente se ele existir\n`;
  sql += `DELETE FROM auth.users WHERE email = 'mtabi.adm@gmail.com';\n`;
  sql += `DELETE FROM public.profiles WHERE email = 'mtabi.adm@gmail.com';\n\n`;
  
  sql += `-- 2. Inserir usuários na tabela auth.users\n`;
  sql += `INSERT INTO auth.users (\n`;
  sql += `  instance_id, id, aud, role, email, encrypted_password,\n`;
  sql += `  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,\n`;
  sql += `  created_at, updated_at, confirmation_token, recovery_token,\n`;
  sql += `  email_change_token_new, email_change, is_super_admin, phone, phone_confirmed_at,\n`;
  sql += `  phone_change, phone_change_token, phone_change_sent_at, email_change_sent_at,\n`;
  sql += `  is_sso_user, deleted_at\n`;
  sql += `)\nVALUES\n`;
  
  const escapeSql = (str) => {
    if (str === null || str === undefined || str === '') return 'NULL';
    // Se for boolean ou número ou JSON
    return `'${str.replace(/'/g, "''")}'`;
  };
  
  const userValues = users.map(u => {
    const id = u.id;
    const email = u.email;
    const encrypted_password = u.encrypted_password;
    const email_confirmed_at = u.email_confirmed_at ? `'${u.email_confirmed_at}'` : 'NULL';
    const raw_user_meta_data = escapeSql(u.raw_user_meta_data);
    const raw_app_meta_data = escapeSql(u.raw_app_meta_data);
    const created_at = u.created_at ? `'${u.created_at}'` : 'NOW()';
    
    return `  ('00000000-0000-0000-0000-000000000000', '${id}', 'authenticated', 'authenticated', '${email}', '${encrypted_password}', ${email_confirmed_at}, ${raw_user_meta_data}, ${raw_app_meta_data}, ${created_at}, ${created_at}, '', '', '', '', false, NULL, NULL, '', '', NULL, NULL, false, NULL)`;
  });
  
  sql += userValues.join(',\n') + ';\n\n';
  
  sql += `-- 3. Inserir identidades na tabela auth.identities para cada usuário\n`;
  sql += `-- Isso é necessário para que o Supabase reconheça o método de login de cada usuário\n`;
  sql += `INSERT INTO auth.identities (\n`;
  sql += `  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at\n`;
  sql += `)\nVALUES\n`;
  
  const identityValues = users.map(u => {
    const id = u.id;
    const email = u.email;
    const identity_data = JSON.stringify({ sub: id, email: email });
    const created_at = u.created_at ? `'${u.created_at}'` : 'NOW()';
    return `  ('${id}', '${id}', '${identity_data.replace(/'/g, "''")}', 'email', '${email}', ${created_at}, ${created_at}, ${created_at})`;
  });
  
  sql += identityValues.join(',\n') + ';\n';
  
  fs.writeFileSync(sqlOutputPath, sql, 'utf8');
  console.log(`SQL gerado com sucesso em: ${sqlOutputPath}`);
} catch (err) {
  console.error('Erro ao ler CSV ou gerar SQL:', err);
}
