import React, { useState, useMemo } from 'react';
import { FuelSupply, Vehicle, StationNickname } from '../types';
import { FileDown, Calendar as CalendarIcon, Loader2, AlertCircle, FileText, Filter } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { getStationDisplayName } from '../utils/fuelUtils';

interface Props {
  supplies: FuelSupply[];
  vehicles: Vehicle[];
  stationNicknames: StationNickname[];
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

const FuelReport: React.FC<Props> = ({ supplies, vehicles, stationNicknames }) => {
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentYear = new Date().getFullYear().toString();
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [quinzena, setQuinzena] = useState<1 | 2>(1);
  const [opmName, setOpmName] = useState('3º PelBM Sapucaia do Sul');
  const [isGenerating, setIsGenerating] = useState(false);

  const nicknameMap = useMemo(() => {
    return stationNicknames.reduce((acc, curr) => {
      acc[curr.originalName] = curr.nickname;
      return acc;
    }, {} as Record<string, string>);
  }, [stationNicknames]);

  // Extract unique years from the data to populate the selector
  const availableYears = useMemo(() => {
    const years = supplies
      .map(s => s.date.split('-')[0])
      .filter((y): y is string => !!y);
    years.push(currentYear);
    return Array.from(new Set<string>(years)).sort((a, b) => b.localeCompare(a));
  }, [supplies, currentYear]);

  // Determine the date range
  const dateRange = useMemo(() => {
    const yearNum = parseInt(selectedYear);
    const monthNum = parseInt(selectedMonth); // 1 to 12

    let startDate = new Date(yearNum, monthNum - 1, 10);
    let endDate = new Date(yearNum, monthNum - 1, 24);

    if (quinzena === 1) {
      // 25 of previous month to 09 of selected month
      let prevMonthObj = new Date(yearNum, monthNum - 2, 25);
      startDate = prevMonthObj;
      endDate = new Date(yearNum, monthNum - 1, 9);
    }

    return { startDate, endDate };
  }, [selectedYear, selectedMonth, quinzena]);

  // Filter supplies inside the date range
  const filteredSupplies = useMemo(() => {
    return supplies.filter(s => {
      const supplyDate = new Date(s.date);
      // Ensure we compare the date properly (stripping time from the boundary checks can be useful, 
      // but if we compare at 00:00:00 start and 23:59:59 end it's safer)
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      
      return supplyDate >= start && supplyDate <= end;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [supplies, dateRange]);

  const expandedRows = useMemo(() => {
    const rows: {
      id: string;
      date: string;
      plate: string;
      location: string;
      driver: string;
      liters: number;
      fuelType: string;
      pricePerLiter: number;
      totalValue: number;
    }[] = [];

    for (const s of filteredSupplies) {
      if (s.entryType === 'manutencao' && s.items && s.items.length > 0) {
        for (const item of s.items) {
          rows.push({
            id: `${s.id}-${item.description}`,
            date: s.date,
            plate: s.plate,
            location: s.location,
            driver: s.driver,
            liters: item.quantity,
            fuelType: item.description,
            pricePerLiter: item.unitValue,
            totalValue: item.totalValue
          });
        }
      } else {
        rows.push({
          id: s.id,
          date: s.date,
          plate: s.plate,
          location: s.location,
          driver: s.driver,
          liters: s.liters,
          fuelType: s.fuelType,
          pricePerLiter: s.pricePerLiter,
          totalValue: s.totalValue
        });
      }
    }
    return rows;
  }, [filteredSupplies]);

  const totalLiters = expandedRows.reduce((sum, r) => sum + r.liters, 0);
  const totalValue = expandedRows.reduce((sum, r) => sum + r.totalValue, 0);

  const formatPlate = (plate: string) => {
    if (!plate) return '';
    const clean = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length === 7) {
      return `${clean.slice(0, 3)}${clean.slice(3)}`; // Formato exibido no print parece não ter hífen e usar direto, ex: JCO7I25
    }
    return plate;
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);

    try {
      const element = document.getElementById('print-container');
      
      // WORKAROUND: Tailwind v4 insere cores oklch() globais.
      // html2canvas trava ao tentar ler o background/color do document.body se forem oklch.
      // Por 1 segundo, forçamos o body a usar HEX absoluto puro.
      const originalBodyBg = document.body.style.backgroundColor;
      const originalBodyColor = document.body.style.color;
      const originalDocBg = document.documentElement.style.backgroundColor;
      
      document.documentElement.style.backgroundColor = '#ffffff';
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
      
      // O html2canvas nativamente engrossa bordas (2px) se elas colidirem (border-collapse).
      // Eu já corrigi a marcação HTML para ser top/left na tabela e bottom/right nas células, evitando sobreposição!


      const opt = {
        margin: [10, 10, 10, 10],
        filename: `ControleCombustivel_${selectedYear}_${selectedMonth}_Q${quinzena}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 3, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff' // Força background do canvas
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
      
      // Restaura estilos originais assim que PDF é gerado
      document.documentElement.style.backgroundColor = originalDocBg;
      document.body.style.backgroundColor = originalBodyBg;
      document.body.style.color = originalBodyColor;
      
      // limpa background
      
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Houve um erro ao gerar o PDF. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const monthLabel = months.find(m => m.value === selectedMonth)?.label || '';

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <Filter size={18} className="text-blue-600" />
          Filtros do Relatório
        </h2>
        <button
          onClick={handleGeneratePDF}
          disabled={isGenerating || filteredSupplies.length === 0}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/30 font-black text-xs uppercase tracking-wider disabled:bg-slate-300 disabled:shadow-none"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
          {isGenerating ? 'Gerando...' : 'Gerar PDF Oficial'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Ano</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-700 outline-none"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Mês Referência</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-700 outline-none"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Quinzena</label>
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setQuinzena(1)}
              className={`py-2 text-[11px] font-black uppercase rounded-lg transition-all ${quinzena === 1 ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              1ª Quinzena
            </button>
            <button 
              onClick={() => setQuinzena(2)}
              className={`py-2 text-[11px] font-black uppercase rounded-lg transition-all ${quinzena === 2 ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              2ª Quinzena
            </button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Definir OPM Padrão</label>
          <input 
            type="text" 
            value={opmName} 
            onChange={e => setOpmName(e.target.value)} 
            placeholder="Ex: 3º PelBM Sapucaia do Sul"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm font-bold text-slate-700 outline-none uppercase"
          />
        </div>
      </div>
      
      {filteredSupplies.length === 0 && (
        <div className="mb-6 flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-xl text-xs font-bold border border-amber-100">
          <AlertCircle size={16} />
          Nenhum abastecimento encontrado para este período.
        </div>
      )}

      {/* Relatório Visível em Tela (Preview real do PDF) */}
      <div className="w-full overflow-x-auto bg-slate-100 rounded-3xl border border-slate-200 p-4 md:p-8 flex justify-center shadow-inner relative">
        
        {/* Wrapper visual da folha (isola classes oklch de shadow/border do Tailwind v4 que quebram o html2canvas) */}
        <div className="shadow-xl shrink-0 border border-slate-200 bg-white" style={{ width: '1122px', minHeight: '793px' }}>
          
          {/* O container que será efetivamente capturado (APENAS ESTILOS INLINE EM HEX/RGB PARA EVITAR OKLCH) */}
          <div id="print-container" className="px-10 pt-10 font-sans w-full h-full" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
            
            {/* Cabeçalho */}
            <div className="flex justify-between items-start mb-6 w-full">
              <div className="text-[12px] font-bold leading-[1.3] uppercase" style={{ width: '35%' }}>
                <p>CORPO DE BOMBEIROS MILITAR</p>
                <p>8º BATALHÃO DE BOMBEIRO MILITAR</p>
                <p>1ª CiaBM / {opmName}</p>
                <p className="mt-1">
                  <span className="font-bold">De: </span> 
                  {dateRange.startDate.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                  <span className="font-bold"> à </span>
                  {dateRange.endDate.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                </p>
              </div>
              
              <div className="text-center w-full mt-2" style={{ width: '65%' }}>
                <p className="text-[14px] font-bold">Relatório de Controle de Consumo de Combustível e Lubrificantes</p>
                <p className="text-[14px] font-bold mt-1">{quinzena}ª Quinzena - {monthLabel}</p>
              </div>
            </div>

            {/* Tabela */}
            <table className="w-full text-center text-[12px] font-sans" style={{ borderTop: '1px solid black', borderLeft: '1px solid black', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', width: '19%', padding: '8px 4px', lineHeight: '1', verticalAlign: 'middle' }}>OPM</th>
                  <th className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', width: '10%', padding: '8px 4px', lineHeight: '1', verticalAlign: 'middle' }}>Vtr</th>
                  <th className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', width: '10%', padding: '8px 4px', lineHeight: '1', verticalAlign: 'middle' }}>Data</th>
                  <th className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', width: '16%', padding: '8px 4px', lineHeight: '1', verticalAlign: 'middle' }}>Posto Combustível</th>
                  <th className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', width: '12%', padding: '8px 4px', lineHeight: '1', verticalAlign: 'middle' }}>Motorista</th>
                  <th className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', width: '8%', padding: '8px 4px', lineHeight: '1', verticalAlign: 'middle' }}>Qtde Litros</th>
                  <th className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', width: '10%', padding: '8px 4px', lineHeight: '1', verticalAlign: 'middle' }}>Tipo Combustível</th>
                  <th className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', width: '8%', padding: '8px 4px', lineHeight: '1', verticalAlign: 'middle' }}>Valor Unitário</th>
                  <th className="font-bold whitespace-nowrap" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', width: '15%', padding: '8px 4px', lineHeight: '1', verticalAlign: 'middle' }}>Valor Abastecido</th>
                </tr>
              </thead>
              <tbody>
                {expandedRows.map((r, idx) => {
                  const supplyDate = new Date(r.date);
                  
                  const getShortenedFuelType = (type: string) => {
                    if (!type) return '';
                    const upperType = type.toUpperCase();
                    if (upperType.includes('DIESEL')) return 'DIESEL';
                    if (upperType.includes('GASOLINA')) return 'GASOLINA';
                    if (upperType.includes('ARLA')) return 'ARLA';
                    if (upperType.includes('ETANOL')) return 'ETANOL';
                    return upperType;
                  };
                  
                  return (
                    <tr key={r.id || idx}>
                      <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                        {opmName}
                      </td>
                      <td className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                        {formatPlate(r.plate)}
                      </td>
                      <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                        {supplyDate.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                      </td>
                      <td className="uppercase" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                        {getStationDisplayName(r.location, nicknameMap)}
                      </td>
                      <td className="uppercase font-bold text-[11px]" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                        {r.driver}
                      </td>
                      <td className="font-bold whitespace-nowrap" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                        {r.liters.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="uppercase" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                        {getShortenedFuelType(r.fuelType)}
                      </td>
                      <td className="whitespace-nowrap" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                        R$ {r.pricePerLiter.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="font-bold whitespace-nowrap" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                        R$ {r.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                
                {/* Espaços em branco para manter a estética de tabela Excel caso haja poucos itens */}
                {Array.from({ length: Math.max(0, 10 - expandedRows.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} style={{ height: '28px' }}>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}></td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}></td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}></td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}></td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}></td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}></td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}></td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}></td>
                    <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black' }}></td>
                  </tr>
                ))}
                
                {/* Linha de Total */}
                <tr>
                  <td colSpan={5} className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'right', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                    
                  </td>
                  <td className="font-bold whitespace-nowrap" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', backgroundColor: '#f3f4f6', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                    {totalLiters.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="font-bold" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'right', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                    
                  </td>
                  <td className="font-bold whitespace-nowrap" style={{ borderBottom: '1px solid black', borderRight: '1px solid black', textAlign: 'center', backgroundColor: '#f3f4f6', padding: '4px 4px 12px 4px', lineHeight: '1', verticalAlign: 'middle' }}>
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Anexos - 1 registro por página, dimensões fixas em px para evitar cortes */}
            {(() => {
              const anexosList = filteredSupplies.filter(s => s.attachmentData || s.ticketLogData);
              if (anexosList.length === 0) return null;

              // A4 landscape útil c/ margens 10mm = ~190mm = ~718px a 96dpi
              // Usamos 680px conservador para garantir que NUNCA transborde
              const PAGE_H = 680;
              const HEADER_H = 36;
              const IMG_MAX_H = PAGE_H - HEADER_H - 32; // 32px = padding + gap

              return anexosList.map((s, idx) => (
                <div
                  key={`anexo-${s.id || idx}`}
                  style={{
                    pageBreakBefore: 'always',
                    pageBreakInside: 'avoid',
                    breakBefore: 'page',
                    breakInside: 'avoid',
                    height: `${PAGE_H}px`,
                    maxHeight: `${PAGE_H}px`,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    paddingTop: '12px',
                  }}
                >
                  {/* Cabeçalho */}
                  <div style={{ height: `${HEADER_H}px`, flexShrink: 0, borderBottom: '2px solid #1e3a5f', marginBottom: '8px', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e3a5f', margin: 0 }}>
                      Comprovantes de Abastecimento
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                      {new Date(s.date).toLocaleDateString('pt-BR')} &nbsp;|&nbsp; Vtr: {formatPlate(s.plate)}
                    </span>
                  </div>

                  {/* Imagens lado a lado, altura fixa em px */}
                  <div style={{ display: 'flex', gap: '12px', height: `${IMG_MAX_H}px`, overflow: 'hidden' }}>
                    {s.attachmentData && !s.attachmentData.includes('pdf') && !s.attachmentType?.includes('pdf') && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1.5px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', height: '100%' }}>
                        <div style={{ backgroundColor: '#1e3a5f', color: '#fff', textAlign: 'center', padding: '5px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                          Nota Fiscal
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                          <img src={s.attachmentData} alt="Nota Fiscal" style={{ maxWidth: '100%', maxHeight: `${IMG_MAX_H - 30}px`, objectFit: 'contain', display: 'block' }} />
                        </div>
                      </div>
                    )}
                    {s.ticketLogData && !s.ticketLogData.includes('pdf') && !s.ticketLogType?.includes('pdf') && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1.5px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', height: '100%' }}>
                        <div style={{ backgroundColor: '#374151', color: '#fff', textAlign: 'center', padding: '5px 0', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                          Ticket Log
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
                          <img src={s.ticketLogData} alt="Ticket Log" style={{ maxWidth: '100%', maxHeight: `${IMG_MAX_H - 30}px`, objectFit: 'contain', display: 'block' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()}
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuelReport;
