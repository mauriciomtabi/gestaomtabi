import React from 'react';
import { Provider, AttendanceRecord, FuelSupply, Vehicle, StationNickname } from '../types';
import { formatMinutesToHHMM, getLatestVisit, getDaysInactivity } from '../utils/timeUtils';
import { normalizeFuelType, getStationDisplayName } from '../utils/fuelUtils';
import { Users, Clock, AlertCircle, CheckCircle, Calendar, ArrowUpRight, ShieldAlert, Fuel, DollarSign, Droplets, TrendingUp, LayoutDashboard, Car, MapPin, FilterX, BarChart as BarChartIcon, UserPlus, FileCheck, CornerDownLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, LabelList } from 'recharts';

interface Props {
  providers: Provider[];
  attendance: AttendanceRecord[];
  fuelSupplies: FuelSupply[];
  vehicles: Vehicle[];
  stationNicknames: StationNickname[];
  onNavigateProvider: (p: Provider) => void;
  onNavigateFuel: () => void;
}

const Dashboard: React.FC<Props> = ({ providers, attendance, fuelSupplies, vehicles, stationNicknames, onNavigateProvider, onNavigateFuel }) => {
  const [activeTab, setActiveTab] = React.useState<'geral' | 'prestadores' | 'abastecimento'>('geral');
  
  // Abastecimento Filters
  const [filterFuelType, setFilterFuelType] = React.useState<string | null>(null);
  const [filterStation, setFilterStation] = React.useState<string | null>(null);
  const [filterVehicle, setFilterVehicle] = React.useState<string | null>(null);
  const [filterMonths, setFilterMonths] = React.useState<string[]>([]);

  // Prestadores Filters
  const [providerMonth, setProviderMonth] = React.useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const nicknameMap = React.useMemo(() => {
    return stationNicknames.reduce((acc, curr) => {
      acc[curr.originalName] = curr.nickname;
      return acc;
    }, {} as Record<string, string>);
  }, [stationNicknames]);

  // FUEL COMPUTATIONS
  const suppliesExcludingMonth = React.useMemo(() => {
    return fuelSupplies.filter(s => {
      if (filterFuelType && normalizeFuelType(s.fuelType) !== filterFuelType) return false;
      if (filterStation && getStationDisplayName(s.location, nicknameMap) !== filterStation) return false;
      if (filterVehicle && s.plate !== filterVehicle) return false;
      return true;
    });
  }, [fuelSupplies, filterFuelType, filterStation, filterVehicle, nicknameMap]);

  const filteredFuelSupplies = React.useMemo(() => {
    return suppliesExcludingMonth.filter(s => {
      if (filterMonths.length > 0) {
        const date = new Date(s.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!filterMonths.includes(monthYear)) return false;
      }
      return true;
    });
  }, [suppliesExcludingMonth, filterMonths]);

  // PROVIDER COMPUTATIONS
  const totalWorkedMinutes = attendance.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const activeProviders = providers.filter(p => p.status === 'active');
  const completedCount = providers.filter(p => p.status === 'completed').length;
  
  const providerStatsInMonth = React.useMemo(() => {
    // Novos (Entram): referralDate no período
    const novos = providers.filter(p => p.referralDate && p.referralDate.startsWith(providerMonth)).length;
    
    // Finalizados: mudou status via audit log no período
    const finalizados = providers.filter(p => p.history?.some(h => 
      (h.action === 'STATUS_ALTERADO' || h.action === 'CADASTRO') && 
      h.details.includes('CONCLUÍDO') && 
      h.timestamp.startsWith(providerMonth)
    )).length;

    // Devolvidos: mudou status para devolvido no período
    const devolvidos = providers.filter(p => p.history?.some(h => 
      h.action === 'DEVOLUÇÃO' && 
      h.timestamp.startsWith(providerMonth)
    )).length;

    return { novos, finalizados, devolvidos };
  }, [providers, providerMonth]);

  const attendancesInMonth = React.useMemo(() => 
    attendance.filter(a => a.date.startsWith(providerMonth)),
  [attendance, providerMonth]);

  // Tabela: Horas por Dia da Semana (Seg a Sáb)
  const attendanceByDayOfWeek = React.useMemo(() => {
    const days = ['Dom', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    // Vamos pular domingo na view se não for comum, mas no painel geral manteremos todos.
    const data = days.map((day, idx) => ({ name: day, prestadores: 0, index: idx }));
    
    // Precisamos contar prestadores únicos (por dia) para a métrica "Comparecem por dia da semana"
    // Ou seja, quantas assinaturas acontecem naquele dia.
    attendancesInMonth.forEach(a => {
      const datePart = a.date.split('T')[0];
      const d = new Date(`${datePart}T12:00:00`);
      if (!isNaN(d.getDay())) {
        data[d.getDay()].prestadores += 1;
      }
    });

    // Reordenar para começar na Segunda-Feira e remover o Domingo (se ficar muito lixo, mas o ideal é deixar).
    const reordered = [...data.slice(1), data[0]];
    return reordered;
  }, [attendancesInMonth]);

  // Tabela: Horas Trabalhadas por Dia do Mês
  const hoursPerDay = React.useMemo(() => {
    const [yearStr, monthStr] = providerMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const data = Array.from({length: daysInMonth}, (_, i) => {
      const dayStr = String(i + 1).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      return { date: dateStr, day: i + 1, horas: 0, label: dayStr };
    });

    attendancesInMonth.forEach(a => {
      const datePart = a.date.split('T')[0]; // "YYYY-MM-DD"
      const match = data.find(d => d.date === datePart);
      if (match) {
        match.horas += (a.durationMinutes / 60);
      }
    });

    return data;
  }, [attendancesInMonth, providerMonth]);

  // Fuel Stats
  const totalFuelCost = filteredFuelSupplies.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalLiters = filteredFuelSupplies.reduce((acc, curr) => acc + curr.liters, 0);
  const avgPricePerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;
  
  const inactivityAlerts = activeProviders.map(p => {
    const pAttendance = attendance.filter(a => a.providerId === p.id);
    const lastDate = getLatestVisit(pAttendance);
    const days = getDaysInactivity(lastDate);
    return { provider: p, days, lastDate };
  }).filter(item => item.days >= 10);

  const closeToFinishAlerts = activeProviders.map(p => {
    const pAttendance = attendance.filter(a => a.providerId === p.id);
    const totalMinutes = pAttendance.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const targetMinutes = (p.totalHoursToFulfill || 0) * 60;
    const progress = targetMinutes > 0 ? (totalMinutes / targetMinutes) * 100 : 0;
    return { provider: p, progress };
  }).filter(item => item.progress >= 90 && item.progress < 100);

  // Charts Data Fuel
  const fuelByType = filteredFuelSupplies.reduce((acc: Record<string, { name: string, total: number, liters: number }>, curr) => {
    const normalized = normalizeFuelType(curr.fuelType);
    if (!acc[normalized]) acc[normalized] = { name: normalized, total: 0, liters: 0 };
    acc[normalized].total += curr.totalValue;
    acc[normalized].liters += curr.liters;
    return acc;
  }, {});

  const fuelByTypeData = Object.values(fuelByType).map((f: any) => ({
    name: f.name,
    avgPrice: f.liters > 0 ? f.total / f.liters : 0,
    total: f.total,
    liters: f.liters
  }));

  const valueByLocation = filteredFuelSupplies.reduce((acc: Record<string, number>, curr) => {
    const loc = curr.location || 'Outros';
    const displayName = getStationDisplayName(loc, nicknameMap);
    acc[displayName] = (acc[displayName] || 0) + curr.totalValue;
    return acc;
  }, {} as Record<string, number>);

  const valueByLocationData = Object.entries(valueByLocation)
    .map(([displayName, total]) => {
      let shortName = displayName.toUpperCase()
        .replace(/^POSTO\s+/g, '')
        .replace(/^AUTO\s+POSTO\s+/g, '')
        .replace(/^SIM\s+/g, '')
        .replace(/LTDA.*$/g, '')
        .trim();
      if (shortName.length > 15) shortName = shortName.substring(0, 12) + '...';
      
      return { name: shortName, displayName, fullName: displayName, value: total };
    })
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 5);

  const costByVehicle = filteredFuelSupplies.reduce((acc: Record<string, number>, curr) => {
    acc[curr.plate] = (acc[curr.plate] || 0) + curr.totalValue;
    return acc;
  }, {});

  const costByVehicleData = Object.entries(costByVehicle)
    .map(([plate, value]) => {
      const vehicle = vehicles.find(v => v.plate === plate);
      
      const vehicleSupplies = fuelSupplies
        .filter(s => s.plate === plate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      let kmL = 0;
      if (vehicleSupplies.length >= 2) {
        const last = vehicleSupplies[0];
        const prev = vehicleSupplies[1];
        const kmDiff = last.km - prev.km;
        if (kmDiff > 0 && last.liters > 0) {
          kmL = kmDiff / last.liters;
        }
      }

      return { 
        name: plate, 
        value: value as number,
        photo: vehicle?.photo,
        fleetCode: vehicle?.fleetCode,
        kmL
      };
    })
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 5);

  const bestVehicle = [...costByVehicleData]
    .filter(v => v.kmL > 0)
    .sort((a, b) => b.kmL - a.kmL)[0];

  const monthlySpending = suppliesExcludingMonth.reduce((acc: Record<string, number>, curr) => {
    const date = new Date(curr.date);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[monthYear] = (acc[monthYear] || 0) + curr.totalValue;
    return acc;
  }, {});

  const monthlySpendingData = Object.entries(monthlySpending)
    .map(([month, value]) => {
      const [year, m] = month.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return { 
        month, 
        label: `${monthNames[parseInt(m) - 1]}/${year.slice(2)}`, 
        value: value as number 
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  const CHART_COLORS = ['#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#dc2626'];

  const clearFilters = () => {
    setFilterFuelType(null);
    setFilterStation(null);
    setFilterVehicle(null);
    setFilterMonths([]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* HEADER COLOURED BACKGROUND BANNER */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-50%] left-[-10%] w-[80%] h-[150%] bg-blue-600 rounded-full blur-[120px]"></div>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md">
                <LayoutDashboard className="text-white" size={24} />
              </div>
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none">
              Painel de Controle
            </h2>
            <p className="text-blue-300 text-xs md:text-sm font-bold uppercase tracking-[0.2em] max-w-lg">
              Sistema Integrado de Gestão Administrativa
            </p>
          </div>
          
          <div className="flex bg-white/10 p-4 rounded-3xl border border-white/20 backdrop-blur-md shrink-0 flex-col items-end justify-center self-start md:self-end">
            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
              <Calendar size={12} /> Data Atual
            </p>
            <p className="text-xl font-black">{new Date().toLocaleDateString('pt-BR')}</p>
            <p className="text-sm font-bold text-blue-400">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex px-2 md:px-4 gap-2 border-b-2 border-slate-200 pb-4 overflow-x-auto no-scrollbar scroll-smooth">
        <button 
          onClick={() => setActiveTab('geral')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'geral' ? 'bg-slate-900 text-white shadow-lg scale-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 scale-95'}`}
        >
          <LayoutDashboard size={18} />
          Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('prestadores')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'prestadores' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 scale-95'}`}
        >
          <Users size={18} />
          Prestadores
        </button>
        <button 
          onClick={() => setActiveTab('abastecimento')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'abastecimento' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 scale-95'}`}
        >
          <Fuel size={18} />
          Abastecimento
        </button>
      </div>

      <div className="min-h-[500px]">
        {/* ======================= ABA VISÃO GERAL ======================= */}
        {activeTab === 'geral' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-8 space-y-6">
                {/* Stats Rápidos Geração Combinada */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Users} label="Total Ativos" value={activeProviders.length.toString()} color="blue" />
                  <StatCard icon={Clock} label="Horas Cumpridas" value={formatMinutesToHHMM(totalWorkedMinutes)} color="blue" />
                  <StatCard icon={DollarSign} label="Gasto Mensal" value={`R$ ${monthlySpendingData.length > 0 ? Math.round(monthlySpendingData[monthlySpendingData.length-1].value) : 0}`} color="emerald" />
                  <StatCard icon={Droplets} label="Litros Histórico" value={`${Math.round(totalLiters)}L`} color="emerald" />
                </div>

                {/* Histórico Recente */}
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden h-full">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Clock size={16} className="text-blue-600" />
                      Fluxo de Atividade Recente
                    </h3>
                  </div>
                  <div className="p-4 grid grid-cols-1 gap-2">
                    {(() => {
                      const activities = [
                        ...attendance.map(a => ({ type: 'attendance' as const, data: a, date: new Date(a.date.includes('T') ? a.date : `${a.date}T12:00:00`) })),
                        ...fuelSupplies.map(f => ({ type: 'fuel' as const, data: f, date: new Date(f.date.includes('T') ? f.date : `${f.date}T12:00:00`) }))
                      ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

                      if (activities.length === 0) {
                        return (
                          <div className="py-12 text-center">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Sem lançamentos recentes</p>
                          </div>
                        );
                      }

                      return activities.map(activity => {
                        if (activity.type === 'attendance') {
                          const record = activity.data as AttendanceRecord;
                          const p = providers.find(prov => prov.id === record.providerId);
                          return (
                            <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-slate-50 transition-all rounded-2xl group gap-3 border border-transparent hover:border-slate-100">
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="w-10 h-10 bg-blue-50/50 rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-blue-100 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                  {(p?.name || '?').charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-black text-slate-800 text-[11px] uppercase truncate">{p?.name || 'Desconhecido'}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(record.date.includes('T') ? record.date : `${record.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                                    <span className="text-[8px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                      {record.entryTime || '--:--'} às {record.exitTime || '--:--'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-xl text-[10px] font-black">
                                  +{formatMinutesToHHMM(record.durationMinutes)}
                                </span>
                                <button onClick={() => p && onNavigateProvider(p)} className="p-2 bg-slate-50 hover:bg-blue-50 focus:bg-blue-100 rounded-xl text-slate-400 group-hover:text-blue-600 transition-all">
                                  <ArrowUpRight size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        } else {
                          const supply = activity.data as FuelSupply;
                          const vehicle = vehicles.find(v => v.plate === supply.plate);
                          return (
                            <div key={supply.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-slate-50 transition-all rounded-2xl group gap-3 border border-transparent hover:border-slate-100">
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="w-12 h-10 bg-emerald-50/50 rounded-xl overflow-hidden border border-emerald-100 shrink-0 flex items-center justify-center shadow-sm group-hover:border-emerald-200 transition-all">
                                  {vehicle?.photo ? <img src={vehicle.photo} alt={supply.plate} className="w-full h-full object-contain p-0.5" /> : <Car size={16} className="text-emerald-300" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-black text-slate-800 text-[11px] uppercase truncate">
                                    {supply.plate.replace(/\s/g, '').length === 7 ? `${supply.plate.replace(/\s/g, '').slice(0, 3)} ${supply.plate.replace(/\s/g, '').slice(3)}` : supply.plate} 
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(supply.date.includes('T') ? supply.date : `${supply.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                                    <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Abastecimento</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <span className="text-slate-800 px-3 py-1 text-[11px] font-black">
                                  R$ {supply.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                                <button onClick={onNavigateFuel} className="p-2 bg-slate-50 hover:bg-blue-50 focus:bg-blue-100 rounded-xl text-slate-400 group-hover:text-blue-600 transition-all">
                                  <ArrowUpRight size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        }
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: Alertas */}
              <div className="lg:col-span-4 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <ShieldAlert size={16} className="text-red-500" />
                    Alertas (Prestadores)
                  </h4>
                  {inactivityAlerts.length + closeToFinishAlerts.length > 0 && (
                    <span className="bg-red-100 text-red-600 text-[9px] font-black px-2.5 py-1 rounded-full border border-red-200">
                      {inactivityAlerts.length + closeToFinishAlerts.length} AVISOS
                    </span>
                  )}
                </div>
                <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-3">
                  {inactivityAlerts.length === 0 && closeToFinishAlerts.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shadow-sm">
                        <CheckCircle className="text-emerald-500" size={20} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma Pendência</p>
                    </div>
                  ) : (
                    <>
                      {inactivityAlerts.map(item => (
                        <div key={item.provider.id} className="flex gap-3 p-4 bg-red-50/50 rounded-2xl border border-red-100 group transition-all hover:bg-red-50 hover:shadow-md cursor-pointer" onClick={() => onNavigateProvider(item.provider)}>
                          <div className="bg-red-600 shadow-sm shadow-red-200 p-2.5 rounded-xl text-white shrink-0 h-fit">
                            <AlertCircle size={16} />
                          </div>
                          <div className="min-w-0 py-0.5">
                            <p className="text-[10px] font-black text-red-900 uppercase truncate leading-none mb-1">{item.provider.name}</p>
                            <p className="text-[9px] text-red-600 font-bold leading-tight">Ausente há {item.days >= 999 ? 'muito tempo' : `${item.days} dias`}. Última vez em: {item.lastDate ? new Date(item.lastDate.includes('T') ? item.lastDate : `${item.lastDate}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem registros'}</p>
                          </div>
                        </div>
                      ))}
                      {closeToFinishAlerts.map(item => (
                        <div key={item.provider.id} className="flex gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 group transition-all hover:bg-blue-50 hover:shadow-md cursor-pointer" onClick={() => onNavigateProvider(item.provider)}>
                          <div className="bg-blue-600 shadow-sm shadow-blue-200 p-2.5 rounded-xl text-white shrink-0 h-fit">
                            <CheckCircle size={16} />
                          </div>
                          <div className="min-w-0 py-0.5">
                            <p className="text-[10px] font-black text-blue-900 uppercase truncate leading-none mb-1">{item.provider.name}</p>
                            <p className="text-[9px] text-blue-600 font-bold leading-tight">Prestes a terminar: {Math.round(item.progress)}% da pena cumprida.</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================= ABA PRESTADORES ======================= */}
        {activeTab === 'prestadores' && (
          <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
            {/* Header / Filtro Mensal */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Indicadores de Desempenho</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Produtividade e fluxo de trabalho</p>
              </div>
              <div className="flex flex-col items-start gap-1">
                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">Filtrar Período</label>
                <div className="relative">
                  <input 
                    type="month" 
                    value={providerMonth}
                    onChange={(e) => setProviderMonth(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-blue-800 font-black text-sm px-4 py-2 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none w-[180px]"
                  />
                </div>
              </div>
            </div>

            {/* Trinca de Indicadores do Mês */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={UserPlus} label="Novos Entrantes" value={providerStatsInMonth.novos.toString()} color="blue" className="!h-auto !py-6" />
              <StatCard icon={FileCheck} label="Finalizados no Período" value={providerStatsInMonth.finalizados.toString()} color="emerald" className="!h-auto !py-6" />
              <StatCard icon={CornerDownLeft} label="Devolvidos/Retornados" value={providerStatsInMonth.devolvidos.toString()} color="amber" className="!h-auto !py-6" />
            </div>

            {/* Gráficos de Frequencia */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico 1: Por Dia da Semana */}
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BarChartIcon size={14} className="text-blue-600" />
                  Fluxo Semanal (Comparecimentos)
                </h4>
                <div className="h-64 w-full">
                  {!attendanceByDayOfWeek.some(d => d.prestadores > 0) ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-[10px] text-slate-400 italic font-bold">Sem dados no período</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceByDayOfWeek} margin={{ top: 10, left: -25, right: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 800 }}
                          formatter={(val: number) => [`${val} assinaturas`, 'Frequência']}
                        />
                        <Bar dataKey="prestadores" radius={[6, 6, 0, 0]} barSize={28}>
                          {attendanceByDayOfWeek.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.prestadores > 0 ? '#3b82f6' : '#cbd5e1'} />
                          ))}
                          <LabelList dataKey="prestadores" position="top" style={{ fontSize: '9px', fontWeight: 900, fill: '#64748b' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfico 2: Horas Diárias */}
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-500" />
                  Horas Trabalhadas (Por Dia do Mês)
                </h4>
                <div className="h-64 w-full">
                  {!hoursPerDay.some(d => d.horas > 0) ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-[10px] text-slate-400 italic font-bold">Sem dados no período</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hoursPerDay} margin={{ top: 10, left: -25, right: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} interval="preserveStartEnd" minTickGap={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 800 }}
                          formatter={(val: number) => [`${val.toFixed(1)} horas`, 'Total Carga']}
                          labelFormatter={(label) => `Dia ${label}`}
                        />
                        <Bar dataKey="horas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================= ABA ABASTECIMENTO ======================= */}
        {activeTab === 'abastecimento' && (
          <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-500">
             
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Análise de Frota</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Monitoramento financeiro de combustíveis</p>
              </div>
              {(filterFuelType || filterStation || filterVehicle || filterMonths.length > 0) && (
                <button 
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all"
                >
                  <FilterX size={14} />
                  Limpar Filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Monthly Spending Chart */}
              <div className="lg:col-span-12 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <TrendingUp size={14} className="text-blue-600" />
                  Gasto Histórico
                </h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  {monthlySpendingData.map(item => (
                    <button
                      key={item.month}
                      onClick={() => setFilterMonths(prev => 
                        prev.includes(item.month) 
                          ? prev.filter(m => m !== item.month) 
                          : [...prev, item.month]
                      )}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                        filterMonths.includes(item.month)
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md cursor-pointer'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 cursor-pointer'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="h-64 w-full">
                  {monthlySpendingData.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic text-center py-12">Sem dados históricos</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlySpendingData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(val) => `R$ ${val}`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 800 }}
                          formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Gasto']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#2563eb" 
                          strokeWidth={4} 
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            const isActive = filterMonths.includes(payload.month);
                            return (
                              <circle 
                                key={`dot-${payload.month}`}
                                cx={cx} 
                                cy={cy} 
                                r={isActive ? 8 : 6} 
                                fill={isActive ? '#1e40af' : '#2563eb'} 
                                strokeWidth={isActive ? 4 : 2} 
                                stroke="#fff" 
                                className="cursor-pointer"
                                onClick={() => {
                                  // Emular clique do botão de filtro
                                }}
                              />
                            );
                          }} 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Stats e Veiculo Eficiente */}
              <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <StatCard icon={DollarSign} label="Gasto no Filtro" value={`R$ ${totalFuelCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} color="slate" />
                <StatCard icon={Droplets} label="Litros no Filtro" value={`${Math.round(totalLiters)}L`} color="slate" />
                <StatCard icon={TrendingUp} label="Preço Médio (Total)" value={`R$ ${avgPricePerLiter.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="slate" />
                {bestVehicle && (
                  <div className="bg-emerald-600 p-4 rounded-3xl shadow-lg shadow-emerald-200 flex flex-col justify-between group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-default">
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 rounded-xl bg-white/20 text-white border border-white/30">
                        <TrendingUp size={16} />
                      </div>
                      <span className="text-[8px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 uppercase tracking-widest">Melhor Média</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-8 bg-white/20 rounded-lg overflow-hidden border border-white/30 flex items-center justify-center shrink-0">
                        {bestVehicle.photo ? (
                          <img src={bestVehicle.photo} alt={bestVehicle.name} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <Car size={14} className="text-white/50" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-[8px] font-black text-white/70 uppercase tracking-[0.15em] mb-0.5">Veículo Eficiente</p>
                        <p className="text-sm font-black text-white tracking-tight truncate">{bestVehicle.name}</p>
                        <p className="text-[10px] font-black text-white leading-none mt-1">{bestVehicle.kmL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM/L</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Indicadores: Media, Postos, Veiculos */}
              <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Media por Combustivel */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Fuel size={14} className="text-blue-600" />
                    Média por Combustível
                  </h4>
                  <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-64">
                    {fuelByTypeData.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-8">Sem dados</p>
                    ) : (
                      fuelByTypeData.map((item, idx) => (
                        <button 
                          key={item.name} 
                          onClick={() => setFilterFuelType(filterFuelType === item.name ? null : item.name)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${filterFuelType === item.name ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-200 cursor-pointer'}`}
                        >
                          <div className="flex flex-col items-start text-left">
                            <span className={`text-[10px] font-black uppercase leading-tight ${filterFuelType === item.name ? 'text-white' : 'text-slate-600'}`}>{item.name}</span>
                            <span className={`text-[8px] font-bold uppercase tracking-tight ${filterFuelType === item.name ? 'text-white/70' : 'text-slate-400'}`}>
                              {item.liters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}L • R$ {item.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <span className={`text-sm font-black ${filterFuelType === item.name ? 'text-white' : 'text-slate-900'}`}>R$ {item.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Gasto por Posto */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MapPin size={14} className="text-blue-600" />
                    Gasto por Posto (Top 5)
                  </h4>
                  <div className="h-48 w-full max-h-64">
                    {valueByLocationData.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-8">Sem dados</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={valueByLocationData} 
                          layout="vertical" 
                          margin={{ left: -20, right: 20 }}
                          onClick={(data) => {
                            if (data && data.activePayload) {
                              const displayName = data.activePayload[0].payload.displayName;
                              setFilterStation(filterStation === displayName ? null : displayName);
                            }
                          }}
                        >
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }}
                            formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Total']}
                          />
                          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={12} cursor="pointer">
                            {valueByLocationData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={filterStation === entry.displayName ? '#1e40af' : CHART_COLORS[index % CHART_COLORS.length]} 
                                opacity={filterStation && filterStation !== entry.displayName ? 0.3 : 1}
                              />
                            ))}
                            <LabelList 
                              dataKey="value" 
                              position="right" 
                              formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`}
                              style={{ fontSize: '9px', fontWeight: 900, fill: '#64748b' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Gasto por Veiculo */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col h-full">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Car size={14} className="text-blue-600" />
                    Gasto por Veículo (Top 5)
                  </h4>
                  <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar max-h-64">
                    {costByVehicleData.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic text-center py-8">Sem dados</p>
                    ) : (
                      costByVehicleData.map((item, idx) => (
                        <button 
                          key={item.name} 
                          onClick={() => setFilterVehicle(filterVehicle === item.name ? null : item.name)}
                          className={`w-full flex items-center justify-between p-2 rounded-2xl border transition-all group cursor-pointer ${filterVehicle === item.name ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-8 rounded-lg overflow-hidden border flex items-center justify-center shrink-0 ${filterVehicle === item.name ? 'bg-white/20 border-white/30' : 'bg-white border-slate-200'}`}>
                              {item.photo ? (
                                <img src={item.photo} alt={item.name} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Car size={14} className={filterVehicle === item.name ? 'text-white' : 'text-slate-300'} />
                              )}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className={`text-[10px] font-black uppercase leading-none ${filterVehicle === item.name ? 'text-white' : 'text-slate-800'}`}>{item.name}</span>
                              <span className={`text-[8px] font-bold uppercase mt-0.5 ${filterVehicle === item.name ? 'text-blue-200' : 'text-slate-400'}`}>{item.fleetCode || '-'}</span>
                              {item.kmL > 0 && (
                                <span className={`text-[9px] font-black mt-1 ${filterVehicle === item.name ? 'text-white' : 'text-blue-600'}`}>{item.kmL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} KM/L</span>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-black ${filterVehicle === item.name ? 'text-white' : 'text-slate-900'}`}>R$ {item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
};

// COMPONENTES AUXILIARES
const StatCard = ({ icon: Icon, label, value, color, className }: { icon: any, label: string, value: string, color: string, className?: string }) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white",
    amber: "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white",
    slate: "bg-slate-50 text-slate-600 border-slate-100 group-hover:bg-slate-800 group-hover:text-white"
  };

  return (
    <div className={`bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${className || ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-xl border transition-all duration-300 ${colorClasses[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5 leading-tight">{label}</p>
        <p className="text-xl font-black text-slate-900 tracking-tight truncate">{value}</p>
      </div>
    </div>
  );
};

export default Dashboard;
