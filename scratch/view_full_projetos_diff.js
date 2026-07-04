import { execSync } from 'child_process';
const diff = execSync('git diff components/Projetos.tsx', { encoding: 'utf8' });
const lines = diff.split('\n');
console.log(`Total lines of diff: ${lines.length}`);
// Find all additions that mention "SELECIONE NA LISTA" or "Adicionar" or similar
lines.forEach((line, idx) => {
  if (line.startsWith('+') && (line.toLowerCase().includes('ferramenta') || line.toLowerCase().includes('lista') || line.toLowerCase().includes('adicionar'))) {
    console.log(`${idx}: ${line}`);
  }
});
