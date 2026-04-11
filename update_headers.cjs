const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/Operador/.gemini/antigravity/scratch/CBM-Sapucaia-do-Sul-main/components';

const fixHeader = (file, title, subtitle, iconName, oldHeaderRegex, addIconImport) => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace Header
  const newHeader = `<div className="flex items-center gap-4 mb-2">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/30">
            <${iconName} size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">${title}</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">${subtitle}</p>
          </div>
        </div>`;
  
  content = content.replace(oldHeaderRegex, newHeader);

  // Add Icon Import if missing
  if (addIconImport && !content.includes(iconName + ',')) {
    // try to find lucide-react import
    if (content.includes('lucide-react')) {
      content = content.replace(/import \{(.*?)\}(.*?)'lucide-react'/, `import { $1, ${iconName} }$2'lucide-react'`);
    } else {
      content = `import { ${iconName} } from 'lucide-react';\n` + content;
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${file}`);
};

// FuelSupplyManager.tsx
fixHeader(
  'FuelSupplyManager.tsx',
  'Gestão de Abastecimento',
  'Controle de combustível e manutenção de frota.',
  'Fuel',
  /<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">\s*<div>\s*<h2 className="text-2xl font-black flex items-center gap-2 text-slate-800">\s*<Fuel className="text-blue-600" \/>\s*Gestão de Abastecimento\s*<\/h2>\s*<p className="text-sm text-slate-500 font-medium mt-1">Controle de combustível e manutenção de frota\.<\/p>\s*<\/div>/g,
  false
);

// ReportOfficial.tsx
fixHeader(
  'ReportOfficial.tsx',
  'Relatório Oficial',
  'Exportação em PDF com formatação institucional.',
  'FileText',
  /<div>\s*<h2 className="text-2xl font-black text-slate-800">Relatório Oficial<\/h2>\s*<p className="text-sm font-medium text-slate-500">Exportação em PDF com formatação institucional.<\/p>\s*<\/div>/g,
  true
);

// HelpCenter.tsx
fixHeader(
  'HelpCenter.tsx',
  'Central de Ajuda e Documentação',
  'Base de conhecimento oficial e suporte passo a passo do sistema.',
  'BookOpen',
  /<div>\s*<h2 className="text-2xl font-black flex items-center gap-2 text-slate-800">\s*<BookOpen className="text-blue-600" \/>\s*Central de Ajuda e Documentação\s*<\/h2>\s*<p className="text-sm font-medium text-slate-500 mt-1">Base de conhecimento oficial e suporte passo a passo do sistema.<\/p>\s*<\/div>/g,
  true
);

