const fs = require('fs');
const path = require('path');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\Operador\\.gemini\\antigravity\\brain\\15c1209e-3011-4748-987d-e04778ab0716\\.system_generated\\logs\\transcript_full.jsonl';
const outputPath = path.join(__dirname, 'backup-data.json');

async function extractBackup() {
  if (!fs.existsSync(transcriptPath)) {
    console.error('Arquivo de transcript não encontrado:', transcriptPath);
    process.exit(1);
  }

  console.log('Lendo transcript_full.jsonl para extrair o JSON de backup...');

  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lastUserInputLine = null;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      // Procurar pela mensagem do usuário que contem os dados de backup
      if (
        (parsed.type === 'USER_INPUT' || parsed.source === 'USER_EXPLICIT') && 
        parsed.content && 
        parsed.content.includes('"backup"') && 
        parsed.content.includes('"providers"')
      ) {
        lastUserInputLine = parsed.content;
      }
    } catch (e) {
      // Ignorar erros de parsing de linhas incompletas
    }
  }

  if (!lastUserInputLine) {
    console.error('Não foi possível encontrar a mensagem com o JSON de backup no log.');
    process.exit(1);
  }

  console.log('Mensagem de backup encontrada. Extraindo JSON...');
  
  // Limpar texto em volta do JSON se houver (o input do usuário geralmente começa com '[' e termina com ']')
  let jsonStart = lastUserInputLine.indexOf('[');
  let jsonEnd = lastUserInputLine.lastIndexOf(']');
  
  if (jsonStart === -1 || jsonEnd === -1) {
    // Tenta com '{' e '}' caso o usuário não tenha enviado como array
    jsonStart = lastUserInputLine.indexOf('{');
    jsonEnd = lastUserInputLine.lastIndexOf('}');
  }

  if (jsonStart === -1 || jsonEnd === -1) {
    console.error('Não foi possível delimitar o JSON na mensagem do usuário.');
    process.exit(1);
  }

  const jsonText = lastUserInputLine.substring(jsonStart, jsonEnd + 1);
  
  try {
    // Validar se o JSON é sintaticamente correto
    const parsedBackup = JSON.parse(jsonText);
    fs.writeFileSync(outputPath, JSON.stringify(parsedBackup, null, 2), 'utf8');
    console.log(`JSON de backup extraído e salvo com sucesso em: ${outputPath}`);
    
    // Mostrar algumas informações de contagem
    let backupObj = parsedBackup;
    if (Array.isArray(parsedBackup) && parsedBackup.length > 0) {
      backupObj = parsedBackup[0].backup || parsedBackup[0];
    } else if (parsedBackup.backup) {
      backupObj = parsedBackup.backup;
    }
    
    console.log('Resumo do backup encontrado:');
    for (const key of Object.keys(backupObj)) {
      if (Array.isArray(backupObj[key])) {
        console.log(`  - ${key}: ${backupObj[key].length} registros`);
      }
    }
  } catch (err) {
    console.error('Erro ao analisar ou salvar o JSON de backup extraído:', err.message);
    // Salvar o texto bruto mesmo assim para análise caso falhe por truncamento ou caractere inválido
    const debugPath = path.join(__dirname, 'backup-raw-error.txt');
    fs.writeFileSync(debugPath, jsonText, 'utf8');
    console.log(`Texto bruto salvo em ${debugPath} para depuração.`);
  }
}

extractBackup();
