
import React, { useState, useMemo, useEffect } from 'react';
import { Provider, AttendanceRecord } from '../types';
import {  Plus, ChevronRight, Search, Calendar, Clock, Target, Hourglass, Percent, Filter, ChevronLeft, ArrowDownAZ, AlertCircle , Users } from 'lucide-react';
import { formatDateBR, getLatestVisit, formatMinutesToHHMM, getDaysInactivity, formatInactivityMessage } from '../utils/timeUtils';

interface Props {
  providers: Provider[];
  attendance: AttendanceRecord[];
  onSelect: (id: string) => void;
  onAdd: () => void;
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

const ITEMS_PER_PAGE = 50;

type SortOption = 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc';

const ProviderList: React.FC<Props> = ({ providers, attendance, onSelect, onAdd }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'returned'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [sortOrder, setSortOrder] = useState<SortOption>('name-asc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedYear, selectedMonth, activeTab, sortOrder]);

  const availableYears = useMemo(() => {
    const years = providers
      .map(p => p.referralDate?.split('-')[0])
      .filter((y): y is string => !!y);
    return Array.from(new Set(years)).sort((a: string, b: string) => b.localeCompare(a));
  }, [providers]);

  const getStatusLabel = (status: Provider['status']) => {
    switch(status) {
      case 'active': return 'ATIVO';
      case 'completed': return 'FINALIZADO';
      case 'suspended': return 'SUSPENSO';
      case 'returned': return 'DEVOLVIDO';
      default: return (status as any).toUpperCase();
    }
  };

  const baseFilteredProviders = useMemo(() => {
    return providers.filter(p => {
      const name = p.name || '';
      const processNumber = p.processNumber || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            processNumber.includes(searchTerm);
      
      const [pYear, pMonth] = p.referralDate ? p.referralDate.split('-') : [null, null];
      const matchesYear = selectedYear === 'Todos' || pYear === selectedYear;
      const matchesMonth = selectedMonth === 'Todos' || pMonth === selectedMonth;

      return matchesSearch && matchesYear && matchesMonth;
    });
  }, [providers, searchTerm, selectedYear, selectedMonth]);

  const counts = useMemo(() => ({
    active: baseFilteredProviders.filter(p => p.status === 'active' || p.status === 'suspended').length,
    completed: baseFilteredProviders.filter(p => p.status === 'completed').length,
    returned: baseFilteredProviders.filter(p => p.status === 'returned').length
  }), [baseFilteredProviders]);

  const filteredProviders = useMemo(() => {
    let result = baseFilteredProviders.filter(p => {
      return p.status === activeTab || (activeTab === 'active' && p.status === 'suspended');
    });

    // Aplicação da Ordenação
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '', 'pt-BR', { sensitivity: 'base' });
        case 'date-desc':
          return (b.referralDate || '').localeCompare(a.referralDate || '');
        case 'date-asc':
          return (a.referralDate || '').localeCompare(b.referralDate || '');
        default:
          return 0;
      }
    });

    return result;
  }, [baseFilteredProviders, activeTab, sortOrder]);

  const totalPages = Math.ceil(filteredProviders.length / ITEMS_PER_PAGE);
  const paginatedProviders = filteredProviders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const TabButton = ({ id, label, count }: { id: typeof activeTab, label: string, count: number }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 text-[11px] font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
    >
      {label} <span className="ml-1 opacity-50">({count})</span>
    </button>
  );

  const selectClasses = "bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/30">
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Prestadores</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Gerenciamento e controle de frequência.</p>
          </div>
        </div>
        <button 
          onClick={onAdd}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 font-black text-sm active:scale-95"
        >
          <Plus size={20} />
          Novo Cadastro
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou processo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100 flex-1 sm:flex-none">
              <Filter size={14} className="text-slate-400" />
              <span className="hidden sm:inline text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Período:</span>
              
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

            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100 flex-1 sm:flex-none">
              <ArrowDownAZ size={14} className="text-slate-400" />
              <span className="hidden sm:inline text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Ordem:</span>
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value as SortOption)}
                className={selectClasses}
              >
                <option value="name-asc">Alfabética (A-Z)</option>
                <option value="name-desc">Alfabética (Z-A)</option>
                <option value="date-desc">Recentes Primeiro</option>
                <option value="date-asc">Antigos Primeiro</option>
              </select>
            </div>
            
            {(selectedYear !== 'Todos' || selectedMonth !== 'Todos' || searchTerm !== '') && (
              <button 
                onClick={() => { setSelectedYear('Todos'); setSelectedMonth('Todos'); setSearchTerm(''); }}
                className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase px-3"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <TabButton id="active" label="Ativos" count={counts.active} />
          <TabButton id="completed" label="Finalizados" count={counts.completed} />
          <TabButton id="returned" label="Devolvidos" count={counts.returned} />
        </div>

        <div className="divide-y divide-slate-50">
          {paginatedProviders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Search size={32} />
              </div>
              <p className="text-slate-400 font-bold italic">Nenhum prestador encontrado.</p>
            </div>
          ) : (
            <>
              {paginatedProviders.map(provider => {
                const pAttendance = attendance.filter(a => a.providerId === provider.id);
                const lastVisitDate = getLatestVisit(pAttendance);
                const inactivityDays = getDaysInactivity(lastVisitDate);
                
                const totalWorkedMinutes = pAttendance.reduce((acc, curr) => acc + curr.durationMinutes, 0);
                const totalRequiredMinutes = (provider.totalHoursToFulfill || 40) * 60;
                const remainingMinutes = Math.max(0, totalRequiredMinutes - totalWorkedMinutes);
                const progressPercent = Math.min(100, (totalWorkedMinutes / totalRequiredMinutes) * 100);
                
                return (
                  <div 
                    key={provider.id}
                    onClick={() => onSelect(provider.id)}
                    className="p-4 md:p-6 hover:bg-slate-50 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between group gap-4 animate-in fade-in duration-300"
                  >
                    <div className="flex gap-4 items-center flex-1">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                        {provider.profilePhoto ? (
                          <img src={provider.profilePhoto} alt={provider.name || 'Prestador'} className="w-full h-full object-cover" />
                        ) : (
                          (provider.name || '?').charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 leading-tight truncate uppercase tracking-tight">{provider.name || 'Sem Nome'}</h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">PROC: {provider.processNumber || '-'}</p>
                        
                        {inactivityDays >= 7 && provider.status === 'active' && (
                          <p className="text-[9px] font-black text-red-500 uppercase mt-1 md:hidden flex items-center gap-1">
                            <AlertCircle size={10} />
                            {formatInactivityMessage(inactivityDays)}
                          </p>
                        )}
                        
                        <div className="mt-3 w-full max-w-[200px] h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                          <div 
                            className={`h-full transition-all duration-700 ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 md:gap-5 bg-slate-50/50 p-3 md:p-0 md:bg-transparent rounded-xl md:rounded-none">
                      <div className="flex flex-col items-center min-w-[50px]">
                        <span className="text-[8px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                          <Target size={10} /> Total
                        </span>
                        <span className="text-xs font-bold text-slate-700">{(provider.totalHoursToFulfill || 0)}h</span>
                      </div>

                      <div className="flex flex-col items-center min-w-[50px]">
                        <span className="text-[8px] font-black text-emerald-500 uppercase mb-1 flex items-center gap-1">
                          <Clock size={10} /> Feito
                        </span>
                        <span className="text-xs font-black text-emerald-600">{formatMinutesToHHMM(totalWorkedMinutes)}</span>
                      </div>

                      <div className="flex flex-col items-center min-w-[50px]">
                        <span className="text-[8px] font-black text-blue-500 uppercase mb-1 flex items-center gap-1">
                          <Hourglass size={10} /> Falta
                        </span>
                        <span className="text-xs font-black text-blue-700">{formatMinutesToHHMM(remainingMinutes)}</span>
                      </div>

                      <div className="flex flex-col items-center min-w-[50px]">
                        <span className="text-[8px] font-black text-indigo-500 uppercase mb-1 flex items-center gap-1">
                          <Percent size={10} /> Progresso
                        </span>
                        <span className={`text-xs font-black ${progressPercent >= 100 ? 'text-emerald-600' : 'text-indigo-700'}`}>
                          {Math.round(progressPercent)}%
                        </span>
                      </div>

                      <div className="hidden md:flex flex-col items-end min-w-[120px]">
                        {inactivityDays >= 7 && provider.status === 'active' && (
                          <span className="text-[8px] font-black text-red-500 uppercase mb-1 flex items-center gap-1 animate-pulse">
                            <AlertCircle size={10} />
                            {formatInactivityMessage(inactivityDays)}
                          </span>
                        )}
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border mb-1.5 ${
                          provider.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 
                          provider.status === 'returned' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {getStatusLabel(provider.status)}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 flex items-center gap-1">
                          <Calendar size={10} />
                          {lastVisitDate ? formatDateBR(lastVisitDate) : 'Sem registros'}
                        </span>
                      </div>

                      <div className="hidden md:flex bg-white p-2 rounded-xl border border-slate-200 group-hover:border-blue-300 group-hover:text-blue-600 transition-all shadow-sm">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                  </div>
                );
              })}

              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(1, prev - 1)); }}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="flex gap-1 overflow-x-auto max-w-[200px] md:max-w-none no-scrollbar">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={(e) => { e.stopPropagation(); setCurrentPage(page); }}
                          className={`min-w-[36px] h-9 rounded-xl text-[11px] font-black transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(totalPages, prev + 1)); }}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderList;
