
import React, { useState, useMemo } from 'react';
import { Provider, AttendanceRecord, MonthlySummary } from '../types';
import { formatMinutesToHHMM, formatDateBR, getLatestVisit } from '../utils/timeUtils';
import {  FileDown, Filter, Calendar as CalendarIcon, Loader2, AlertCircle , FileText } from 'lucide-react';

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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Extrair anos únicos baseados na data de prestação de serviço
  const availableYears = useMemo(() => {
    const years = attendance
      .map(a => a.date.split('-')[0])
      .filter((y): y is string => !!y);
    const currYear = new Date().getFullYear().toString();
    years.push(currYear);
    return Array.from(new Set(years)).sort((a: string, b: string) => b.localeCompare(a));
  }, [attendance]);

  const filteredProviders = useMemo(() => {
    if (selectedYear === 'Todos' && selectedMonth === 'Todos') {
      return providers;
    }
    
    return providers.filter(p => {
      // 1. Se tem assiduidade no mês, sempre aparece
      const pAttendance = attendance.filter(a => a.providerId === p.id);
      const hasAttendanceThisMonth = pAttendance.some(a => {
        const dateParts = a.date.split('T')[0].split('-');
        const aYear = dateParts[0];
        const aMonth = dateParts[1];
        const matchesYear = selectedYear === 'Todos' || aYear === selectedYear;
        const matchesMonth = selectedMonth === 'Todos' || aMonth === selectedMonth;
        return matchesYear && matchesMonth;
      });

      if (hasAttendanceThisMonth) return true;

      // 2. Se não tem assiduidade no mês, avaliamos o status
      // Identificamos o ano/mês do filtro (se for 'Todos', assumimos como o último possível para não excluir)
      const filterYearNum = selectedYear === 'Todos' ? 9999 : parseInt(selectedYear);
      const filterMonthNum = selectedMonth === 'Todos' ? 12 : parseInt(selectedMonth);

      // Data de Cadastro (para garantir que não exiba prestadores ANTES de eles entrarem no sistema)
      let enrollmentDate = new Date('2000-01-01');
      const enrollmentLog = p.history?.find(l => l.action === 'CADASTRO');
      if (enrollmentLog) {
        enrollmentDate = new Date(enrollmentLog.timestamp);
      } else if (p.history && p.history.length > 0) {
        // Fallback para o primeiro log 
        enrollmentDate = new Date(p.history[p.history.length - 1].timestamp);
      }
      
      const enrolledYear = enrollmentDate.getFullYear();
      const enrolledMonth = enrollmentDate.getMonth() + 1;
      
      // Se ele se cadastrou num mês/ano DEPOIS do filtro, com certeza não aparece.
      if (enrolledYear > filterYearNum || (enrolledYear === filterYearNum && enrolledMonth > filterMonthNum)) {
        return false;
      }

      // Se está ativo e a data filtrada é depois do cadastro dele, ele aparece (mesmo sem horas)
      if (p.status === 'active' || p.status === 'suspended') {
         return true;
      }

      // Se for concluído ou devolvido, achamos a data de conclusão/devolução
      let statusChangeDate: Date | null = null;
      if (p.status === 'completed') {
         const log = p.history?.find(l => l.action === 'STATUS_ALTERADO' || (l.details && l.details.toLowerCase().includes('concluído')));
         if (log) statusChangeDate = new Date(log.timestamp);
      } else if (p.status === 'returned') {
         const log = p.history?.find(l => l.action === 'DEVOLUÇÃO' || (l.details && l.details.toLowerCase().includes('devolvido')));
         if (log) statusChangeDate = new Date(log.timestamp);
      }

      if (statusChangeDate) {
         const changeYear = statusChangeDate.getFullYear();
         const changeMonth = statusChangeDate.getMonth() + 1;
         
         // Aparece até o mês em que concluiu/devolveu.
         // Ou seja, a data do filtro deve ser menor ou igual à data de mudança.
         const isBeforeOrSameAsChange = filterYearNum < changeYear || (filterYearNum === changeYear && filterMonthNum <= changeMonth);
         
         return isBeforeOrSameAsChange;
      }

      // Fallback
      return false;
    });
  }, [providers, attendance, selectedYear, selectedMonth]);

  const consolidatedData: MonthlySummary[] = filteredProviders.map(p => {
    let pAttendance = attendance.filter(a => a.providerId === p.id);

    // Se houver um filtro de tempo, ignora presenças futuras para o cálculo do total de horas e do último comparecimento daquele relatório
    if (selectedYear !== 'Todos' && selectedMonth !== 'Todos') {
      const limitMonth = parseInt(selectedMonth);
      const limitYear = parseInt(selectedYear);
      
      pAttendance = pAttendance.filter(a => {
        const dateParts = a.date.split('T')[0].split('-');
        const aYear = parseInt(dateParts[0]);
        const aMonth = parseInt(dateParts[1]);
        
        if (aYear < limitYear) return true;
        if (aYear === limitYear && aMonth <= limitMonth) return true;
        return false;
      });
    } else if (selectedYear !== 'Todos' && selectedMonth === 'Todos') {
      const limitYear = parseInt(selectedYear);
      pAttendance = pAttendance.filter(a => {
        const dateParts = a.date.split('T')[0].split('-');
        const aYear = parseInt(dateParts[0]);
        return aYear <= limitYear;
      });
    }

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
  }).sort((a, b) => (a.providerName || '').localeCompare(b.providerName || ''));

  const getMonthLabel = () => {
    if (selectedMonth === 'Todos') {
      return new Date().toLocaleDateString('pt-BR', { month: 'long' });
    }
    return months.find(m => m.value === selectedMonth)?.label.toLowerCase() || "novembro";
  };

  const handleGeneratePDF = () => {
    const content = document.getElementById('official-document-content');
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Popup bloqueado. Permita popups para este site e tente novamente.');
      return;
    }

    const parentStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(
      '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8" /><title>Oficio</title>' +
      parentStyles +
      '<style>' +
      '@page { size: A4 portrait; margin: 1.5cm 2cm; }' +
      '* { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      'html, body { margin: 0; padding: 0; background: white !important; font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; color: #000 !important; }' +
      'table { border-collapse: collapse; width: 100%; }' +
      'th, td { border: 1px solid black; padding: 4px 12px; }' +
      'thead tr { background-color: #f8fafc !important; }' +
      '#official-document-content { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; max-width: none !important; min-width: auto !important; }' +
      '</style></head><body>' +
      content.innerHTML +
      '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 500);
    }, 800);
  };

  const selectClasses = "bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 md:pb-0 print:bg-white print:p-0 print:border-none print:shadow-none">
      
      {/* Barra de Filtros (no-print) */}
      <div className="no-print space-y-4">
        {/* Dica: desmarcar cabeçalhos e rodapés */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-3 rounded-2xl text-amber-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span className="text-[11px] font-bold leading-relaxed">
            <strong>Dica de impressão:</strong> No diálogo que abrir, desmarque a opção <strong>"Cabeçalhos e rodapés"</strong> para remover data, URL e número de página do impresso.
          </span>
        </div>

        {/* Aviso de Scroll no Mobile */}
        <div className="md:hidden flex items-center gap-2 bg-amber-50 border border-amber-100 p-3 rounded-2xl text-amber-700 animate-pulse">
          <AlertCircle size={16} />
          <span className="text-[10px] font-black uppercase tracking-wider">Dica: Deslize o relatório para o lado para ver tudo</span>
        </div>

        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
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

            <button 
              onClick={handleGeneratePDF}
              className={`w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 font-black text-sm active:scale-95 disabled:bg-slate-300 disabled:shadow-none no-print ml-auto`}
            >
              <FileDown size={20} />
              Gerar PDF (Ofício)
            </button>
          </div>
        </div>
      </div>


      {/* Papel A4 Oficial - Container para o PDF */}
      <div className="w-full pb-12 md:pb-0 overflow-visible print:border-none print:shadow-none print:m-0 print:p-0">
        <div id="official-document-content" className="min-w-[21cm] max-w-[21cm] mx-auto p-[1.5cm] md:p-[2cm] shadow-2xl md:shadow-lg animate-in zoom-in-95 duration-700 print:shadow-none print:m-0 print:p-[1.5cm] print:max-w-none print:w-full" style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt', lineHeight: '1.5' }}>
          
          {/* Brasão e Cabeçalho */}
        <div className="text-center mb-10 flex flex-col items-center outline-none" contentEditable suppressContentEditableWarning>
          <img 
            src="/brasao.png" 
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
        <div className="mb-4 outline-none" contentEditable suppressContentEditableWarning>
          Ofício nº 088/3ºPelBM/1ªCiaBM/8ºBBM/2025.
        </div>

        {/* Data - Alinhada à direita */}
        <div className="text-right mb-16 outline-none" contentEditable suppressContentEditableWarning>
          Sapucaia do Sul, {today}.
        </div>

        {/* Destinatário */}
        <div className="mb-6 outline-none" contentEditable suppressContentEditableWarning>
          <p>Ao Fórum da Comarca de Sapucaia do Sul</p>
          <p>Vara de Execuções Criminais</p>
          <p>Av. João Pereira de Vargas, nº 431 – Centro</p>
          <p>93220-090 – Sapucaia do Sul – RS</p>
        </div>

        {/* Assunto */}
        <div className="mb-10 outline-none" contentEditable suppressContentEditableWarning>
          Assunto: Prestador de Serviço Comunitário
        </div>

        {/* Texto do Ofício */}
        <div className="text-justify space-y-6 outline-none" contentEditable suppressContentEditableWarning>
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
        <div className="mt-32 text-center flex flex-col items-center outline-none" contentEditable suppressContentEditableWarning>
          <div className="font-bold uppercase">
            RONALDO GONCZOROSKI DE OLIVEIRA – 1º Sgt QPBM
          </div>
          <div style={{ fontSize: '11pt' }}>
            Comandante do Corpo de Bombeiros Militar de Sapucaia do Sul
          </div>
        </div>

        {/* Anexo - Lista de Frequência */}
        <div className="mt-20 pt-10" style={{ pageBreakBefore: 'always' }}>
          <h3 className="text-center font-bold text-lg mb-8 uppercase" style={{ color: '#000000' }}>Frequência Prestadores Serviço Comunitário</h3>
          
          <table className="w-full border-collapse text-[10pt]" style={{ border: '1px solid black', color: '#000000' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th className="px-4 py-2 text-left font-bold uppercase" style={{ border: '1px solid black' }}>PRESTADORES DE SERVIÇO</th>
                <th className="px-4 py-2 text-center w-44 font-bold uppercase leading-tight" style={{ border: '1px solid black' }}>ÚLTIMO<br />COMPARECIMENTO</th>
                <th className="px-4 py-2 text-center w-48 font-bold uppercase leading-tight" style={{ border: '1px solid black' }}>
                  <span className="whitespace-nowrap">TOTAL DE HORAS</span><br />
                  <span className="whitespace-nowrap">CUMPRIDAS</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {consolidatedData.map((row) => (
                <tr key={row.providerId}>
                  <td className="px-4 py-2 uppercase font-medium" style={{ border: '1px solid black' }}>{row.providerName}</td>
                  <td className="px-4 py-2 text-center" style={{ border: '1px solid black' }}>{formatDateBR(row.lastVisit)}</td>
                  <td className="px-4 py-2 text-center font-bold" style={{ border: '1px solid black' }}>{formatMinutesToHHMM(row.totalWorkedMinutes)}</td>
                </tr>
              ))}
              {consolidatedData.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center italic" style={{ border: '1px solid black', color: '#000000' }}>
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
