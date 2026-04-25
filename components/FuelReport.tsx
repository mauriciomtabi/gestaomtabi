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

  const totalLiters = filteredSupplies.reduce((sum, s) => sum + s.liters, 0);
  const totalValue = filteredSupplies.reduce((sum, s) => sum + s.totalValue, 0);

  const formatPlate = (plate: string) => {
    if (!plate) return '';
    const clean = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length === 7) {
      return `${clean.slice(0, 3)}${clean.slice(3)}`; // Formato exibido no print parece não ter hífen e usar direto, ex: JCO7I25
    }
    return plate;
  };

  const handleGeneratePDF = () => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page { size: A4 landscape; margin: 0; }
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
    
    setTimeout(() => {
      window.print();
      setTimeout(() => document.head.removeChild(style), 1000);
    }, 100);
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
          disabled={filteredSupplies.length === 0}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/30 font-black text-xs uppercase tracking-wider disabled:bg-slate-300 disabled:shadow-none no-print"
        >
          <FileDown size={16} />
          Imprimir / PDF Oficial
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
      <div className="w-full overflow-x-auto bg-slate-100 rounded-3xl border border-slate-200 p-4 md:p-8 flex justify-center shadow-inner relative print:p-0 print:border-none print:bg-white print:shadow-none">
        
        {/* Wrapper visual da folha */}
        <div className="shadow-xl shrink-0 border border-slate-200 bg-white print:border-none print:shadow-none" style={{ width: '1122px', minHeight: '793px' }}>
          
          <div id="print-container" className="p-10 font-sans w-full h-full print:p-0">
            
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

            <table className="w-full text-center text-[12px] font-sans border-collapse" style={{ border: '1px solid black' }}>
              <thead>
                <tr className="border-b border-black">
                  <th className="py-2 px-2 border-r border-black font-bold" style={{ width: '19%' }}>OPM</th>
                  <th className="py-2 px-2 border-r border-black font-bold" style={{ width: '10%' }}>Vtr</th>
                  <th className="py-2 px-2 border-r border-black font-bold" style={{ width: '10%' }}>Data</th>
                  <th className="py-2 px-2 border-r border-black font-bold" style={{ width: '16%' }}>Posto Combustível</th>
                  <th className="py-2 px-2 border-r border-black font-bold" style={{ width: '12%' }}>Motorista</th>
                  <th className="py-2 px-2 border-r border-black font-bold" style={{ width: '8%' }}>Qtde Litros</th>
                  <th className="py-2 px-2 border-r border-black font-bold" style={{ width: '10%' }}>Tipo Combustível</th>
                  <th className="py-2 px-2 border-r border-black font-bold" style={{ width: '8%' }}>Valor Unitário</th>
                  <th className="py-2 px-2 font-bold whitespace-nowrap" style={{ width: '15%' }}>Valor Abastecido</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplies.map((s, idx) => {
                  const supplyDate = new Date(s.date);
                  
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
                    <tr key={s.id || idx} className="border-b border-black">
                      <td className="py-1.5 px-2 border-r border-black text-center align-middle">
                        {opmName}
                      </td>
                      <td className="py-1.5 px-2 font-bold border-r border-black text-center align-middle">
                        {formatPlate(s.plate)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-black text-center align-middle">
                        {supplyDate.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                      </td>
                      <td className="py-1.5 px-2 uppercase border-r border-black text-center align-middle">
                        {getStationDisplayName(s.location, nicknameMap)}
                      </td>
                      <td className="py-1.5 px-2 uppercase font-bold text-[11px] border-r border-black text-center align-middle">
                        {s.driver}
                      </td>
                      <td className="py-1.5 px-2 font-bold whitespace-nowrap border-r border-black text-center align-middle">
                        {s.liters.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-2 uppercase border-r border-black text-center align-middle">
                        {getShortenedFuelType(s.fuelType)}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap border-r border-black text-center align-middle">
                        R$ {s.pricePerLiter.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-2 font-bold whitespace-nowrap text-center align-middle border-none">
                        R$ {s.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
                
                {/* Espaços em branco para manter a estética de tabela Excel caso haja poucos itens */}
                {Array.from({ length: Math.max(0, 10 - filteredSupplies.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-b border-black">
                    <td className="py-3 px-2 border-r border-black"></td>
                    <td className="py-3 px-2 border-r border-black"></td>
                    <td className="py-3 px-2 border-r border-black"></td>
                    <td className="py-3 px-2 border-r border-black"></td>
                    <td className="py-3 px-2 border-r border-black"></td>
                    <td className="py-3 px-2 border-r border-black"></td>
                    <td className="py-3 px-2 border-r border-black"></td>
                    <td className="py-3 px-2 border-r border-black"></td>
                    <td className="py-3 px-2 border-none"></td>
                  </tr>
                ))}
                
                {/* Linha de Total */}
                <tr>
                  <td colSpan={5} className="font-bold border-r border-black text-right py-2 px-2 align-middle">
                    
                  </td>
                  <td className="font-bold whitespace-nowrap border-r border-black text-center align-middle bg-slate-100 py-2 px-2 print:bg-gray-200" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    {totalLiters.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="font-bold border-r border-black text-right py-2 px-2 align-middle">
                    
                  </td>
                  <td className="font-bold whitespace-nowrap text-center align-middle border-none bg-slate-100 py-2 px-2 print:bg-gray-200" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuelReport;
