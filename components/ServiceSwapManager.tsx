
import React, { useState, useEffect, useMemo } from 'react';
import { ServiceSwap, Operator } from '../types';
import { getServiceSwaps, createServiceSwap, evaluateServiceSwap, getAllProfiles, cancelServiceSwap } from '../services/supabaseService';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Check,
  MessageSquare,
  ArrowUpDown,
  UserCheck,
  FileText,
  ArrowLeftRight,
  LayoutDashboard,
  ChevronRight,
} from 'lucide-react';

interface Props {
  currentUser: Operator;
  setNotification: (msg: string, type: 'success' | 'error') => void;
}

const FUNCOES = ['CG', 'COV', 'Linha', 'COBOM'] as const;
type Funcao = typeof FUNCOES[number];

const STATUS_LABELS: Record<string, string> = {
  todos: 'Todos',
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  cancelado: 'Cancelado',
};

const funcaoBadgeClass = (funcao: string) => {
  switch (funcao) {
    case 'CG':    return 'bg-red-100 text-red-700 border border-red-200';
    case 'COV':   return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'Linha': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'COBOM': return 'bg-purple-100 text-purple-700 border border-purple-200';
    default:      return 'bg-slate-100 text-slate-700';
  }
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'pendente':  return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'aprovado':  return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'reprovado': return 'bg-red-50 text-red-700 border border-red-200';
    case 'cancelado': return 'bg-slate-100 text-slate-500 border border-slate-200';
    default:          return 'bg-slate-50 text-slate-600';
  }
};

const ServiceSwapManager: React.FC<Props> = ({ currentUser, setNotification }) => {
  const [swaps, setSwaps] = useState<ServiceSwap[]>([]);
  const [profiles, setProfiles] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [evaluationModal, setEvaluationModal] = useState<{
    isOpen: boolean;
    swap: (ServiceSwap & { escaladoName?: string; substitutoName?: string }) | null;
    action: 'aprovado' | 'reprovado';
    observation: string;
  }>({ isOpen: false, swap: null, action: 'aprovado', observation: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'aprovado' | 'reprovado'>('todos');
  const [activeTab, setActiveTab] = useState<'todas' | 'minhas' | 'aprovar'>('todas');

  const [formData, setFormData] = useState({
    substitutoId: '',
    funcao: 'Linha' as Funcao,
    data: '',
    horarioInicio: '08:00',
    horarioFim: '08:00',
  });

  const [substituteSearch, setSubstituteSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [cancelSwapId, setCancelSwapId] = useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [swapsData, profilesData] = await Promise.all([getServiceSwaps(), getAllProfiles()]);
      setSwaps(swapsData);
      setProfiles(profilesData);
    } catch (err) {
      console.error('Erro ao carregar dados de trocas:', err);
      setNotification('Erro ao carregar registros do servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const profilesMap = useMemo(() =>
    profiles.reduce((acc, p) => { if (p.id) acc[p.id] = p; return acc; }, {} as Record<string, Operator>),
  [profiles]);

  const eligibleSubstitutes = useMemo(() =>
    profiles.filter(p => p.id !== currentUser.id),
  [profiles, currentUser]);

  const filteredSubstitutes = useMemo(() => {
    const query = substituteSearch.toLowerCase().trim();
    if (!query) return eligibleSubstitutes;
    return eligibleSubstitutes.filter(p => 
      p.rank.toLowerCase().includes(query) ||
      p.warName.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query)
    );
  }, [eligibleSubstitutes, substituteSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        if (!formData.substitutoId) {
          setSubstituteSearch('');
        } else {
          const selected = profilesMap[formData.substitutoId];
          if (selected) {
            setSubstituteSearch(`${selected.rank} ${selected.warName} (${selected.name})`);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [formData.substitutoId, profilesMap]);

  const handleSelectSubstitute = (sub: Operator) => {
    setFormData(prev => ({ ...prev, substitutoId: sub.id || '' }));
    setSubstituteSearch(sub.id ? `${sub.rank} ${sub.warName} (${sub.name})` : '');
    setIsDropdownOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSubstituteSearch(val);
    setFormData(prev => ({ ...prev, substitutoId: '' }));
    setIsDropdownOpen(true);
  };

  const handleClearSelection = () => {
    setSubstituteSearch('');
    setFormData(prev => ({ ...prev, substitutoId: '' }));
    setIsDropdownOpen(false);
  };

  const enrichedSwaps = useMemo(() =>
    swaps.map(s => {
      const escalado   = profilesMap[s.escaladoId];
      const substituto = profilesMap[s.substitutoId];
      const aprovador  = s.aprovadorId ? profilesMap[s.aprovadorId] : null;
      return {
        ...s,
        escaladoName:   escalado   ? `${escalado.rank} ${escalado.warName}`   : 'Militar Removido',
        substitutoName: substituto ? `${substituto.rank} ${substituto.warName}` : 'Militar Removido',
        aprovadorName:  aprovador  ? `${aprovador.rank} ${aprovador.warName}`  : undefined,
      };
    }),
  [swaps, profilesMap]);

  const pendingCount = swaps.filter(s => s.status === 'pendente').length;

  const filteredSwaps = useMemo(() => {
    return enrichedSwaps.filter(s => {
      if (activeTab === 'minhas' && s.escaladoId !== currentUser.id && s.substitutoId !== currentUser.id) return false;
      if (activeTab === 'aprovar' && s.status !== 'pendente') return false;
      if (statusFilter !== 'todos' && s.status !== statusFilter) return false;
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        return (
          s.escaladoName?.toLowerCase().includes(q) ||
          s.substitutoName?.toLowerCase().includes(q) ||
          s.funcao.toLowerCase().includes(q) ||
          s.observacao?.toLowerCase().includes(q) ||
          s.data.includes(q)
        );
      }
      return true;
    });
  }, [enrichedSwaps, activeTab, statusFilter, searchTerm, currentUser.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.id) { setNotification('Sessão inválida.', 'error'); return; }
    if (!formData.substitutoId) { setNotification('Selecione o substituto.', 'error'); return; }
    if (!formData.data) { setNotification('Preencha a data da troca.', 'error'); return; }

    setSaving(true);
    try {
      const result = await createServiceSwap({
        escaladoId:    currentUser.id,
        substitutoId:  formData.substitutoId,
        funcao:        formData.funcao,
        data:          formData.data,
        horarioInicio: formData.horarioInicio,
        horarioFim:    formData.horarioFim,
        status:        'pendente',
      } as Partial<ServiceSwap>);

      if (result) {
        setNotification('Solicitação registrada com sucesso!', 'success');
        setIsModalOpen(false);
        setFormData({ substitutoId: '', funcao: 'Linha', data: '', horarioInicio: '08:00', horarioFim: '08:00' });
        setSubstituteSearch('');
        await loadData();
      } else throw new Error('Erro no retorno da criação.');
    } catch (err: any) {
      setNotification(err.message || 'Erro ao salvar a solicitação.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEvaluate = async () => {
    if (!evaluationModal.swap || !currentUser.id) return;
    setEvaluating(true);
    try {
      const result = await evaluateServiceSwap(
        evaluationModal.swap.id,
        evaluationModal.action,
        currentUser.id,
        evaluationModal.observation,
      );
      if (result) {
        setNotification(
          `Troca ${evaluationModal.action === 'aprovado' ? 'aprovada' : 'reprovada'} com sucesso!`,
          'success',
        );
        setEvaluationModal({ isOpen: false, swap: null, action: 'aprovado', observation: '' });
        await loadData();
      } else throw new Error('Erro ao atualizar avaliação.');
    } catch (err: any) {
      setNotification(err.message || 'Erro ao avaliar a solicitação.', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelSwapId) return;
    try {
      const result = await cancelServiceSwap(cancelSwapId);
      if (result) {
        setNotification('Solicitação de troca cancelada com sucesso!', 'success');
        await loadData();
      } else throw new Error('Erro ao cancelar a troca.');
    } catch (err: any) {
      setNotification(err.message || 'Erro ao cancelar a solicitação.', 'error');
    } finally {
      setCancelSwapId(null);
    }
  };

  /* ─────────────── RENDER ─────────────── */
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 md:pb-0">

      {/* ── HEADER ── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/30">
            <ArrowLeftRight size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Troca de Serviço</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Registro e aprovação de permutas de escala.</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 font-black text-sm active:scale-95"
        >
          <Plus size={18} />
          Nova Solicitação
        </button>
      </header>

      {/* ── MAIN TABS ── */}
      <div className="flex px-2 md:px-0 gap-2 border-b-2 border-slate-200 pb-4 overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'todas',  label: 'Todas as Trocas',    icon: FileText },
          { id: 'minhas', label: 'Minhas Solicitações', icon: User },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id as any); setStatusFilter('todos'); }}
            className={`group flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-slate-900 text-white shadow-lg scale-100'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 scale-95'
            }`}
          >
            <Icon size={18} />
            <span className={activeTab === id ? 'inline' : 'hidden md:inline group-hover:inline'}>{label}</span>
          </button>
        ))}

        {currentUser.isAdmin && (
          <button
            onClick={() => { setActiveTab('aprovar'); setStatusFilter('pendente'); }}
            className={`group relative flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'aprovar'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-200 scale-100'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 scale-95'
            }`}
          >
            <CheckCircle2 size={18} />
            <span className={activeTab === 'aprovar' ? 'inline' : 'hidden md:inline group-hover:inline'}>Aprovações</span>
            {pendingCount > 0 && (
              <span className="ml-1.5 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow shrink-0">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── FILTERS CARD ── */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por escalado, substituto, função ou data..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all text-sm font-medium"
          />
        </div>

        {/* Status Filter (hidden on "aprovar" tab) */}
        {activeTab !== 'aprovar' && (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-100 w-full md:w-auto">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <span className="hidden sm:inline text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent border-0 text-xs font-bold text-slate-600 outline-none cursor-pointer"
            >
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Clear filters */}
        {(searchTerm !== '' || statusFilter !== 'todos') && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('todos'); }}
            className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase px-2 shrink-0"
          >
            Limpar
          </button>
        )}
      </div>

      {/* ── LIST ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm gap-4">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Carregando registros...</p>
        </div>
      ) : filteredSwaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-center px-6">
          <div className="bg-slate-100 p-5 rounded-full text-slate-300 mb-4">
            <ArrowLeftRight size={36} />
          </div>
          <h3 className="text-slate-700 font-black text-sm uppercase mb-1">Nenhuma troca encontrada</h3>
          <p className="text-slate-400 text-xs max-w-sm font-medium">
            {activeTab === 'minhas'
              ? 'Você ainda não possui solicitações de troca de serviço.'
              : activeTab === 'aprovar'
              ? 'Não há trocas aguardando aprovação no momento.'
              : 'Nenhum registro corresponde aos filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Horário</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Escalado</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Substituto</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Avaliação</th>
                  {(currentUser.isAdmin || filteredSwaps.some(s => s.escaladoId === currentUser.id && ['pendente', 'aprovado'].includes(s.status))) && (
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSwaps.map(swap => {
                  const isEscalado   = swap.escaladoId   === currentUser.id;
                  const isSubstituto = swap.substitutoId === currentUser.id;
                  return (
                    <tr key={swap.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${statusBadgeClass(swap.status)}`}>
                          {swap.status === 'pendente'  && <Clock size={11} />}
                          {swap.status === 'aprovado'  && <CheckCircle2 size={11} />}
                          {swap.status === 'reprovado' && <XCircle size={11} />}
                          {STATUS_LABELS[swap.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${funcaoBadgeClass(swap.funcao)}`}>
                          {swap.funcao}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block text-xs font-bold text-slate-800">
                          {new Date(swap.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {swap.horarioInicio}h → {swap.horarioFim}h
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${isEscalado ? 'text-blue-600' : 'text-slate-700'}`}>
                          {swap.escaladoName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${isSubstituto ? 'text-blue-600' : 'text-slate-700'}`}>
                          {swap.substitutoName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {swap.aprovadorName ? (
                          <div className="text-[10px] text-slate-500 font-bold space-y-0.5">
                            <p className="flex items-center gap-1"><UserCheck size={11} className="text-slate-400" /> {swap.aprovadorName}</p>
                            {swap.observacao && (
                              <p className="flex items-start gap-1 italic text-slate-400">
                                <MessageSquare size={10} className="shrink-0 mt-0.5" />
                                {swap.observacao}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold italic">—</span>
                        )}
                      </td>
                      {(currentUser.isAdmin || filteredSwaps.some(s => s.escaladoId === currentUser.id && ['pendente', 'aprovado'].includes(s.status))) && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                            {swap.status === 'pendente' && currentUser.isAdmin && (
                              <>
                                <button
                                  onClick={() => setEvaluationModal({ isOpen: true, swap, action: 'aprovado', observation: '' })}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1"
                                >
                                  <Check size={12} /> Aprovar
                                </button>
                                <button
                                  onClick={() => setEvaluationModal({ isOpen: true, swap, action: 'reprovado', observation: '' })}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1"
                                >
                                  <X size={12} /> Reprovar
                                </button>
                              </>
                            )}
                            {((['pendente', 'aprovado'].includes(swap.status) && (swap.escaladoId === currentUser.id || currentUser.isAdmin)) ||
                              (swap.status === 'reprovado' && currentUser.isAdmin)) && (
                              <button
                                onClick={() => setCancelSwapId(swap.id)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1"
                              >
                                <XCircle size={12} /> Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredSwaps.map(swap => {
              const isEscalado   = swap.escaladoId   === currentUser.id;
              const isSubstituto = swap.substitutoId === currentUser.id;
              return (
                <div key={swap.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${statusBadgeClass(swap.status)}`}>
                      {swap.status === 'pendente'  && <Clock size={11} />}
                      {swap.status === 'aprovado'  && <CheckCircle2 size={11} />}
                      {swap.status === 'reprovado' && <XCircle size={11} />}
                      {STATUS_LABELS[swap.status]}
                    </span>
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${funcaoBadgeClass(swap.funcao)}`}>
                      {swap.funcao}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {new Date(swap.data + 'T00:00:00').toLocaleDateString('pt-BR')} · {swap.horarioInicio}h→{swap.horarioFim}h
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Escalado</p>
                      <p className={`font-bold truncate ${isEscalado ? 'text-blue-600' : 'text-slate-800'}`}>{swap.escaladoName}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Substituto</p>
                      <p className={`font-bold truncate ${isSubstituto ? 'text-blue-600' : 'text-slate-800'}`}>{swap.substitutoName}</p>
                    </div>
                  </div>

                  {(swap.aprovadorName || swap.observacao) && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1">
                      {swap.aprovadorName && (
                        <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                          <UserCheck size={11} className="text-slate-400" /> {swap.aprovadorName}
                        </p>
                      )}
                      {swap.observacao && (
                        <p className="text-[10px] text-slate-400 italic flex items-start gap-1">
                          <MessageSquare size={10} className="shrink-0 mt-0.5" /> {swap.observacao}
                        </p>
                      )}
                    </div>
                  )}

                  {((['pendente', 'aprovado'].includes(swap.status) && (swap.escaladoId === currentUser.id || currentUser.isAdmin)) ||
                    (swap.status === 'reprovado' && currentUser.isAdmin)) && (
                    <div className="flex flex-col gap-2 pt-1">
                      {swap.status === 'pendente' && currentUser.isAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEvaluationModal({ isOpen: true, swap, action: 'aprovado', observation: '' })}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Check size={13} /> Aprovar
                          </button>
                          <button
                            onClick={() => setEvaluationModal({ isOpen: true, swap, action: 'reprovado', observation: '' })}
                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <X size={13} /> Reprovar
                          </button>
                        </div>
                      )}
                      {((['pendente', 'aprovado'].includes(swap.status) && (swap.escaladoId === currentUser.id || currentUser.isAdmin)) ||
                        (swap.status === 'reprovado' && currentUser.isAdmin)) && (
                        <button
                          onClick={() => setCancelSwapId(swap.id)}
                          className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <XCircle size={13} /> Cancelar Solicitação
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {filteredSwaps.length} registro{filteredSwaps.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL — Nova Solicitação de Troca
      ════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-xl shadow-md shadow-blue-600/20">
                  <ArrowLeftRight size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase">Nova Troca de Serviço</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Preencha os dados da permuta</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">

                {/* Escalado (read-only) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Escalado (Você)</label>
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 font-bold text-sm flex items-center gap-2">
                    <User size={15} className="text-slate-400" />
                    <span>{currentUser.rank} {currentUser.warName}</span>
                  </div>
                </div>

                {/* Substituto (com Autocomplete) */}
                <div className="space-y-1.5" ref={dropdownRef}>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Substituto *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Digite para buscar o substituto..."
                      value={substituteSearch}
                      onChange={handleSearchChange}
                      onFocus={() => setIsDropdownOpen(true)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                    />
                    
                    {formData.substitutoId ? (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                        title="Limpar seleção"
                      >
                        <X size={16} />
                      </button>
                    ) : (
                      <ArrowUpDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    )}

                    <input type="hidden" value={formData.substitutoId} required />

                    {/* Floating Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[1200] max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredSubstitutes.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                            Nenhum militar encontrado
                          </div>
                        ) : (
                          filteredSubstitutes.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectSubstitute(p)}
                              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all border-b border-slate-50 last:border-0 flex flex-col gap-0.5"
                            >
                              <span className="text-slate-900 font-black uppercase text-[11px]">{p.rank} {p.warName}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{p.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Função */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Função *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {FUNCOES.map(fun => (
                      <button
                        key={fun}
                        type="button"
                        onClick={() => setFormData({ ...formData, funcao: fun })}
                        className={`py-3 rounded-xl font-black text-xs uppercase transition-all border ${
                          formData.funcao === fun
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-200'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {fun}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Data do Plantão *</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <input
                      type="date"
                      required
                      value={formData.data}
                      onChange={e => setFormData({ ...formData, data: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                {/* Horários */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Horário de Início', key: 'horarioInicio' },
                    { label: 'Horário de Fim',    key: 'horarioFim'    },
                  ].map(({ label, key }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">{label} *</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                        <input
                          type="time"
                          required
                          value={formData[key as keyof typeof formData] as string}
                          onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-200 active:scale-95 flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? <><Loader2 className="animate-spin" size={15} /> Enviando...</> : 'Enviar Solicitação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL — Avaliação (Aprovar / Reprovar)
      ════════════════════════════════════════ */}
      {evaluationModal.isOpen && evaluationModal.swap && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-100 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b ${evaluationModal.action === 'aprovado' ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-100 bg-red-50/40'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${evaluationModal.action === 'aprovado' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-red-600 shadow-red-200'} shadow-md`}>
                  {evaluationModal.action === 'aprovado' ? <Check size={18} className="text-white" /> : <X size={18} className="text-white" />}
                </div>
                <div>
                  <h3 className={`font-black text-base uppercase ${evaluationModal.action === 'aprovado' ? 'text-emerald-800' : 'text-red-800'}`}>
                    {evaluationModal.action === 'aprovado' ? 'Aprovar Troca' : 'Reprovar Troca'}
                  </h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Confirmação administrativa</p>
                </div>
              </div>
              <button
                onClick={() => setEvaluationModal({ isOpen: false, swap: null, action: 'aprovado', observation: '' })}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white/60 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Summary card */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                {[
                  { label: 'Escalado',   value: evaluationModal.swap.escaladoName },
                  { label: 'Substituto', value: evaluationModal.swap.substitutoName },
                  { label: 'Função',     value: evaluationModal.swap.funcao },
                  { label: 'Data',       value: new Date(evaluationModal.swap.data + 'T00:00:00').toLocaleDateString('pt-BR') },
                  { label: 'Horário',    value: `${evaluationModal.swap.horarioInicio}h → ${evaluationModal.swap.horarioFim}h` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
                    <span className="text-xs font-bold text-slate-800 text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* Observação */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Observação (Opcional)</label>
                <textarea
                  value={evaluationModal.observation}
                  onChange={e => setEvaluationModal({ ...evaluationModal, observation: e.target.value })}
                  placeholder="Escreva uma observação sobre esta decisão..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium text-sm resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEvaluationModal({ isOpen: false, swap: null, action: 'aprovado', observation: '' })}
                className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className={`px-6 py-3 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-60 ${
                  evaluationModal.action === 'aprovado'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                }`}
              >
                {evaluating
                  ? <><Loader2 className="animate-spin" size={15} /> Processando...</>
                  : evaluationModal.action === 'aprovado' ? 'Confirmar Aprovação' : 'Confirmar Reprovação'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL — Confirmação de Cancelamento
      ════════════════════════════════════════ */}
      {cancelSwapId && (
        <div className="fixed inset-0 bg-slate-950/80 z-[4000] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <XCircle size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cancelar Registro?</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">Esta ação é irreversível e alterará permanentemente o status da troca de serviço para cancelado.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setCancelSwapId(null)} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Voltar</button>
                <button onClick={confirmCancel} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95">Confirmar Cancelamento</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceSwapManager;
