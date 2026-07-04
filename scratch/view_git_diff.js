import { execSync } from 'child_process';
const diff = execSync('git diff components/Clientes.tsx', { encoding: 'utf8' });
// Print first 300 lines of diff
console.log(diff.split('\n').slice(0, 300).join('\n'));
