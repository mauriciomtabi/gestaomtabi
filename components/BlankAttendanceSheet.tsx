import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Provider } from '../types';
import { ArrowLeft, FileDown, Printer } from 'lucide-react';

interface Props {
  provider: Provider;
  onClose: () => void;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const BlankAttendanceSheet: React.FC<Props> = ({ provider, onClose }) => {
  const currentDate = new Date();
  const [targetMonth, setTargetMonth] = useState(months[currentDate.getMonth()]);
  const [targetYear, setTargetYear] = useState(currentDate.getFullYear().toString());

  const handleGeneratePDF = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { 
          size: A4 portrait; 
          margin: 0; 
        }
        body, html, #root, main { 
          background-color: white !important; 
          margin: 0 !important; 
          padding: 0 !important;
          height: auto !important;
          overflow: visible !important;
          border: none !important;
        }
        nav { display: none !important; }
        .no-print { display: none !important; }
        ::-webkit-scrollbar { display: none !important; }
        * { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
          box-shadow: none !important; 
        }
        body > *:not(.print-wrapper) {
          display: none !important;
        }
        .print-wrapper {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          display: block !important;
        }
        .print-page {
          margin: 0 !important;
          padding: 1.5cm !important;
          border: none !important;
          width: 210mm !important;
          height: 297mm !important;
          overflow: hidden !important;
        }
        div, main { overflow: visible !important; height: auto !important; }
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      window.print();
      setTimeout(() => document.head.removeChild(style), 1000);
    }, 100);
  };

  // 10 linhas em branco para preenchimento (exatamente igual à imagem de referência)
  const emptyRows = Array.from({ length: 10 });

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 md:p-8 overflow-y-auto print-wrapper print:bg-white print:p-0">
      <div className="bg-slate-100 rounded-[2rem] overflow-hidden shadow-2xl max-w-4xl w-full flex flex-col relative my-auto print:rounded-none print:shadow-none print:max-w-none">
        
        {/* Barra de Ações Fixa no Topo (no-print) */}
        <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-sm px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 bg-white"
            >
              <ArrowLeft size={18} />
            Voltar
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Gerar Folha de Frequência</h1>
            <p className="text-slate-500 text-xs font-bold">Preview do documento para impressão/PDF.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <select 
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="text-slate-400 font-bold">/</span>
            <input 
              type="number" 
              value={targetYear}
              onChange={(e) => setTargetYear(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 w-24 text-center"
            />
          </div>
          
          <button 
            onClick={handleGeneratePDF}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md font-black text-sm"
          >
            <Printer size={18} />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Papel A4 Oficial */}
      <div className="w-full py-8 md:py-8 overflow-visible print:p-0 print:py-0 print:border-none print:shadow-none print:bg-white flex justify-center items-start bg-slate-100">
        <div 
          id="blank-sheet-content" 
          className="bg-white min-w-[21cm] max-w-[21cm] p-[1.5cm] md:p-[2cm] shadow-xl border border-slate-200 print-page print:border-none print:shadow-none print:m-0 print:p-[1cm] print:max-w-none print:w-full"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', color: '#000' }}
        >
          {/* Cabeçalho */}
          <div className="flex items-center gap-4 mb-6 outline-none" contentEditable suppressContentEditableWarning>
            <img 
              src="/brasao.png" 
              alt="Brasão" 
              style={{ width: '65px', height: 'auto', display: 'block' }}
            />
            <div className="flex flex-col">
              <div style={{ fontSize: '7.5pt', letterSpacing: '0.02em', lineHeight: '1' }}>ESTADO DO RIO GRANDE DO SUL</div>
              <div className="font-bold" style={{ fontSize: '15pt', letterSpacing: '-0.02em', lineHeight: '1.1' }}>PODER JUDICIÁRIO</div>
            </div>
          </div>

          <div className="mb-4 leading-tight outline-none" contentEditable suppressContentEditableWarning>
            <div>Comarca de Sapucaia do Sul – Vara de Execução Criminais</div>
            <div>Programa Prestação de Serviços à Comunidade (PSC)</div>
          </div>

          {/* Tabela Principal */}
          <table className="w-full border-collapse mb-8" style={{ border: '1px solid black' }}>
            <tbody>
              {/* Título */}
              <tr>
                <td colSpan={5} className="font-bold text-center uppercase py-1" style={{ border: '1px solid black', fontSize: '11pt' }}>
                  FOLHA DE FREQUÊNCIA
                </td>
              </tr>
              
              {/* Informações 1 (Processo e Mês) */}
              <tr>
                <td colSpan={5} className="p-0" style={{ border: '1px solid black' }}>
                  <div className="flex w-full">
                    <div className="flex-1 py-0.5 px-2 border-r border-black flex items-center gap-1 overflow-hidden whitespace-nowrap">
                      <span className="font-bold">Processo nº:</span> 
                      <span className="outline-none" contentEditable suppressContentEditableWarning>{provider.processNumber || '____________________'}</span>
                    </div>
                    <div className="flex-1 py-0.5 px-2 flex items-center gap-1 overflow-hidden whitespace-nowrap">
                      <span className="font-bold">Mês de cumprimento:</span> 
                      <span className="outline-none bg-yellow-200/50 print:bg-transparent" contentEditable suppressContentEditableWarning>{targetMonth} / {targetYear}</span>
                    </div>
                  </div>
                </td>
              </tr>
              
              {/* Nome */}
              <tr>
                <td colSpan={5} className="py-0.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Nome do Prestador:</span> <span className="outline-none bg-yellow-200/50 print:bg-transparent" contentEditable suppressContentEditableWarning>{provider.name}</span>
                </td>
              </tr>
              
              {/* Telefone */}
              <tr>
                <td colSpan={5} className="py-0.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Telefone:</span> <span className="outline-none" contentEditable suppressContentEditableWarning>{provider.phone || '____________________'}</span>
                </td>
              </tr>
              
              {/* Endereço */}
              <tr>
                <td colSpan={5} className="py-0.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Endereço:</span> <span className="outline-none" contentEditable suppressContentEditableWarning>{provider.address || '____________________'}</span>
                </td>
              </tr>
              
              {/* Entidade */}
              <tr>
                <td colSpan={5} className="py-0.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Entidade Conveniada:</span> <span className="outline-none" contentEditable suppressContentEditableWarning>Corpo de Bombeiros Militar de Sapucaia do Sul</span>
                </td>
              </tr>
              
              {/* E-mail */}
              <tr>
                <td colSpan={5} className="py-0.5 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">E-mail Entidade Conveniada:</span> <span className="outline-none" contentEditable suppressContentEditableWarning>sapucaiadosul@cbm.rs.gov.br</span>
                </td>
              </tr>

              {/* Cabeçalho da Grade */}
              <tr className="font-bold text-center" style={{ fontSize: '10pt' }}>
                <td className="py-0.5 w-[15%]" style={{ border: '1px solid black' }}>Data</td>
                <td className="py-0.5 w-[11%]" style={{ border: '1px solid black' }}>Chegada</td>
                <td className="py-0.5 w-[11%]" style={{ border: '1px solid black' }}>Saída</td>
                <td className="py-0.5 w-[30%]" style={{ border: '1px solid black' }}>Assinatura do prestador</td>
                <td className="py-0.5 w-[33%]" style={{ border: '1px solid black' }}>
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span>Assinatura do</span>
                    <span>responsável</span>
                  </div>
                </td>
              </tr>

              {/* Linhas Vazias */}
              {emptyRows.map((_, idx) => (
                <tr key={idx} style={{ height: '36px' }}>
                  <td style={{ border: '1px solid black' }}></td>
                  <td style={{ border: '1px solid black' }}></td>
                  <td style={{ border: '1px solid black' }}></td>
                  <td style={{ border: '1px solid black' }}></td>
                  <td style={{ border: '1px solid black' }}></td>
                </tr>
              ))}
              
              {/* Total Horas */}
              <tr>
                <td colSpan={5} className="py-1 px-2" style={{ border: '1px solid black' }}>
                  <span className="font-bold">Total de horas:</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Questionário Rodapé */}
          <div className="space-y-4" style={{ fontSize: '11pt' }}>
            <div className="flex flex-col">
              <span>Faltas no período?</span>
              <span>Sim ( &nbsp; ) &nbsp;&nbsp; Não ( &nbsp; )</span>
            </div>

            <div className="flex flex-col">
              <span>Apresentou bom comportamento?</span>
              <span>Sim ( &nbsp; ) &nbsp;&nbsp; Não ( &nbsp; )</span>
            </div>

            <div className="flex flex-col">
              <span>Cometeu atos indisciplinares?</span>
              <span>Sim ( &nbsp; ) &nbsp;&nbsp; Não ( &nbsp; )</span>
            </div>

            <div className="flex flex-col">
              <span>A qualidade do serviço prestado foi satisfatória?</span>
              <span>Sim ( &nbsp; ) &nbsp;&nbsp; Não ( &nbsp; )</span>
            </div>
          </div>

        </div>
      </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default BlankAttendanceSheet;
