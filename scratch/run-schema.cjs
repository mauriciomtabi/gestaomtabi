// Script para executar o schema SQL no Supabase via API REST
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://rpnyobdmaaanyuquywiv.supabase.co';
// Service Role Key necessária para DDL — precisa ser obtida do painel do Supabase
// Por ora, vamos usar a Management API para rodar SQL
const sql = fs.readFileSync('./supabase_schema.sql', 'utf8');

console.log('SQL Schema carregado. Tamanho:', sql.length, 'bytes');
console.log('\n=== CONTEÚDO DO SCHEMA ===');
console.log(sql);
console.log('\n=== Para executar, acesse o SQL Editor do Supabase e cole o SQL acima ===');
console.log('URL: https://supabase.com/dashboard/project/rpnyobdmaaanyuquywiv/sql/new');
