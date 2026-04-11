
import React, { useState, useMemo } from 'react';
import { Provider, AttendanceRecord, MonthlySummary } from '../types';
import { formatMinutesToHHMM, formatDateBR, getLatestVisit } from '../utils/timeUtils';
import {  FileDown, Filter, Calendar as CalendarIcon, Loader2, AlertCircle , FileText } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface Props {
  providers: Provider[];
  attendance: AttendanceRecord[];
}

const months = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const ReportOfficial: React.FC<Props> = ({ providers, attendance }) => {
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [isGenerating, setIsGenerating] = useState(false);

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Extrair anos únicos dos prestadores para o filtro
  const availableYears = useMemo(() => {
    const years = providers
      .map(p => p.referralDate?.split('-')[0])
      .filter((y): y is string => !!y);
    return Array.from(new Set(years)).sort((a: string, b: string) => b.localeCompare(a));
  }, [providers]);

  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      const [pYear, pMonth] = p.referralDate ? p.referralDate.split('-') : [null, null];
      const matchesYear = selectedYear === 'Todos' || pYear === selectedYear;
      const matchesMonth = selectedMonth === 'Todos' || pMonth === selectedMonth;

      return matchesYear && matchesMonth;
    });
  }, [providers, selectedYear, selectedMonth]);

  const consolidatedData: MonthlySummary[] = filteredProviders.map(p => {
    const pAttendance = attendance.filter(a => a.providerId === p.id);
    const totalWorked = pAttendance.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const totalRequired = p.totalHoursToFulfill * 60;
    
    return {
      providerId: p.id,
      providerName: p.name,
      lastVisit: getLatestVisit(pAttendance),
      totalWorkedMinutes: totalWorked,
      totalToFulfillMinutes: totalRequired,
      remainingMinutes: Math.max(0, totalRequired - totalWorked)
    };
  });

  const getMonthLabel = () => {
    if (selectedMonth === 'Todos') {
      return new Date().toLocaleDateString('pt-BR', { month: 'long' });
    }
    return months.find(m => m.value === selectedMonth)?.label.toLowerCase() || "novembro";
  };

  const handleGeneratePDF = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
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
        div, main { overflow: visible !important; height: auto !important; }
      }
    `;
    document.head.appendChild(style);
    
    // Imprimir via navegador nativo (Zero erros de CORS e qualidade vetorizada!)
    setTimeout(() => {
      window.print();
      // Remover os estilos logo após a janela fechar
      setTimeout(() => document.head.removeChild(style), 1000);
    }, 100);
  };

  const selectClasses = "bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer";

  return (
    <div className="space-y-8 bg-slate-100 p-4 md:p-10 rounded-xl shadow-inner border border-slate-200 min-h-screen print:bg-white print:p-0 print:border-none print:shadow-none">
      
      {/* Barra de Filtros (no-print) */}
      <div className="no-print space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Relatório Oficial</h2>
            <p className="text-sm text-slate-500 font-medium">Exportação em PDF com formatação institucional.</p>
          </div>
          <button 
            onClick={handleGeneratePDF}
            className={`w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 font-black text-sm active:scale-95`}
          >
            <FileDown size={20} />
            Gerar PDF (Ofício)
          </button>
        </div>

        {/* Aviso de Scroll no Mobile */}
        <div className="md:hidden flex items-center gap-2 bg-amber-50 border border-amber-100 p-3 rounded-2xl text-amber-700 animate-pulse">
          <AlertCircle size={16} />
          <span className="text-[10px] font-black uppercase tracking-wider">Dica: Deslize o relatório para o lado para ver tudo</span>
        </div>

        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 flex-1 md:flex-none">
              <Filter size={16} className="text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">Filtrar Período:</span>
              
              <div className="flex gap-3 flex-wrap">
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className={selectClasses}
                >
                  <option value="Todos">Ano: Todos</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={selectClasses}
                >
                  <option value="Todos">Mês: Todos</option>
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {(selectedYear !== 'Todos' || selectedMonth !== 'Todos') && (
              <button 
                onClick={() => { setSelectedYear('Todos'); setSelectedMonth('Todos'); }}
                className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase px-4 py-2 hover:bg-blue-50 rounded-xl transition-all"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Papel A4 Oficial - Container para o PDF */}
      <div className="w-full pb-12 md:pb-0 overflow-visible print:border-none print:shadow-none print:m-0 print:p-0">
        <div id="official-document-content" className="min-w-[21cm] max-w-[21cm] mx-auto bg-white p-[1.5cm] md:p-[2cm] text-black shadow-2xl md:shadow-lg animate-in zoom-in-95 duration-700 print:shadow-none print:m-0 print:p-[1.5cm] print:max-w-none print:w-full" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5' }}>
          
          {/* Brasão e Cabeçalho */}
        <div className="text-center mb-10 flex flex-col items-center">
          <img 
            src="https://i.postimg.cc/MZM3gq2k/image.png" 
            style={{ 
              width: '100px', 
              height: 'auto', 
              display: 'block',
              marginBottom: '12px'
            }}
            alt="Brasão do Estado" 
          />
          <div className="font-bold uppercase leading-tight" style={{ fontSize: '10pt' }}>
            <p>ESTADO DO RIO GRANDE DO SUL</p>
            <p>SECRETARIA DA SEGURANÇA PÚBLICA</p>
            <p>CORPO DE BOMBEIROS MILITAR</p>
            <p>8º BATALHÃO DE BOMBEIRO MILITAR</p>
            <p>1ª COMPANHIA DE BOMBEIRO MILITAR</p>
            <p>3º PELBM SAPUCAIA DO SUL</p>
          </div>
          <div className="uppercase mt-2" style={{ fontSize: '9pt' }}>
            HENRIQUE DIAS, Nº 58, BAIRRO SANTA CATARINA – SAPUCAIA DO SUL – CEP 93.214-130
          </div>
          <div style={{ fontSize: '9pt' }}>
            Fone: (51)3474-0211 – E-mail: sapucaiadosul@cbm.rs.gov.br
          </div>
        </div>

        {/* Número do Ofício */}
        <div className="mb-4">
          Ofício nº <span contentEditable suppressContentEditableWarning className="outline-none transition-all cursor-text focus:bg-blue-50 border-b-2 border-dashed border-slate-300 hover:border-blue-400 pb-0.5 print:border-none" title="Clique para editar o número do ofício">088/3ºPelBM/1ªCiaBM/8ºBBM/2025</span>.
        </div>

        {/* Data - Alinhada à direita */}
        <div className="text-right mb-16">
          Sapucaia do Sul, {today}.
        </div>

        {/* Destinatário */}
        <div className="mb-6">
          <p>Ao Fórum da Comarca de Sapucaia do Sul</p>
          <p>Vara de Execuções Criminais</p>
          <p>Av. João Pereira de Vargas, nº 431 – Centro</p>
          <p>93220-090 – Sapucaia do Sul – RS</p>
        </div>

        {/* Assunto */}
        <div className="mb-10">
          Assunto: Prestador de Serviço Comunitário
        </div>

        {/* Texto do Ofício */}
        <div className="text-justify space-y-6">
          <div className="flex gap-4">
            <span className="shrink-0">1.</span>
            <p>
              Ao cumprimentá-los cordialmente, encaminho, em anexo, a folha de frequência referente 
              à prestação de serviço comunitário dos prestadores relacionados, contendo, ainda, a data do último 
              comparecimento destes a esta instituição, no mês de {getMonthLabel()}.
            </p>
          </div>
          <div className="flex gap-4">
            <span className="shrink-0">2.</span>
            <p>
              Cordiais saudações, renovo votos de estima e distinta consideração.
            </p>
          </div>
        </div>

        {/* Assinatura */}
        <div className="mt-32 text-center flex flex-col items-center">
          <div className="font-bold uppercase">
            RONALDO GONCZOROSKI DE OLIVEIRA – 1º Sgt QPBM
          </div>
          <div style={{ fontSize: '11pt' }}>
            Comandante do Corpo de Bombeiros Militar de Sapucaia do Sul
          </div>
        </div>

        {/* Anexo - Lista de Frequência */}
        <div className="mt-20 pt-10 border-t border-slate-100 border-dashed" style={{ pageBreakBefore: 'always' }}>
          <h3 className="text-center font-bold text-lg mb-8 uppercase text-black">Frequência Prestadores Serviço Comunitário</h3>
          
          <table className="w-full border-collapse border border-black text-[10pt] text-black">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-black px-4 py-2 text-left font-bold uppercase">PRESTADORES DE SERVIÇO</th>
                <th className="border border-black px-4 py-2 text-center w-44 font-bold uppercase leading-tight">ÚLTIMO<br />COMPARECIMENTO</th>
                <th className="border border-black px-4 py-2 text-center w-48 font-bold uppercase leading-tight">
                  <span className="whitespace-nowrap">TOTAL DE HORAS</span><br />
                  <span className="whitespace-nowrap">CUMPRIDAS</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {consolidatedData.map((row) => (
                <tr key={row.providerId}>
                  <td className="border border-black px-4 py-2 uppercase font-medium">{row.providerName}</td>
                  <td className="border border-black px-4 py-2 text-center">{formatDateBR(row.lastVisit)}</td>
                  <td className="border border-black px-4 py-2 text-center font-bold">{formatMinutesToHHMM(row.totalWorkedMinutes)}</td>
                </tr>
              ))}
              {consolidatedData.length === 0 && (
                <tr>
                  <td colSpan={3} className="border border-black px-4 py-8 text-center text-black italic">
                    Nenhum registro encontrado para o período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);
};

export default ReportOfficial;
