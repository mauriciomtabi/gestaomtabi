import { readFileSync } from 'fs';
const content = readFileSync('components/Clientes.tsx', 'utf8');
const lines = content.split('\n');
console.log("Searching in Clientes.tsx...");
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('ferramenta')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
