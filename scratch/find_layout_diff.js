import { execSync } from 'child_process';
const diff = execSync('git diff components/Clientes.tsx', { encoding: 'utf8' });
// Print chunks of diff that contain layout changes (e.g. search for grid-cols)
const lines = diff.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('grid-cols') || lines[i].includes('selectedCliente') || lines[i].includes('Lado Esquerdo') || lines[i].includes('filteredClientes.map')) {
    console.log(`--- Line ${i} ---`);
    console.log(lines.slice(Math.max(0, i-5), Math.min(lines.length, i+15)).join('\n'));
    console.log('-----------------');
    i += 15;
  }
}
