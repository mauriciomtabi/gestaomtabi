import { readFileSync } from 'fs';
const content = readFileSync('components/Clientes.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('selecione') || line.toLowerCase().includes('lista')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
