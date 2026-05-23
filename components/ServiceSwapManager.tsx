import React, { useState, useEffect, useMemo } from 'react';
import { ServiceSwap, Operator } from '../types';
import { getServiceSwaps, createServiceSwap, evaluateServiceSwap, getAllProfiles } from '../services/supabaseService';
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
  AlertCircle, 
  ArrowUpDown, 
  UserCheck, 
  HelpCircle,
  FileText
} from 'lucide-react';

interface Props {
  currentUser: Operator;
  setNotification: (msg: string, type: 'success' | 'error') => void;
}

const ServiceSwapManager: React.FC<Props> = ({ currentUser, setNotification }) => {
  const [swaps, setSwaps] = useState<ServiceSwap[]>([]);
  const [profiles, setProfiles] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal de Avaliação (Aprovar/Reprovar)
  const [evaluationModal, setEvaluationModal] = useState<{
    isOpen: boolean;
    swap: ServiceSwap | null;
    action: 'aprovado' | 'reprovado';
    observation: string;
  }>({
    isOpen: false,
    swap: null,
    action: 'aprovado',
    observation: ''
  });

  // Filtros e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'aprovado' | 'reprovado'>('todos');
  const [activeTab, setActiveTab] = useState<'todas' | 'minhas' | 'aprovar'>('todas');

  // Form State
  const [formData, setFormData] = useState({
    substitutoId: '',
    funcao: 'Linha' as 'CG' | 'COV' | 'Linha' | 'COBOM',
    data: '',
    horarioInicio: '08:00',
    horarioFim: '08:00'
  });

  // Carregar dados iniciais
  const loadData = async () => {
    setLoading(true);
    try {
      const [swapsData, profilesData] = await Promise.all([
        getServiceSwaps(),
        getAllProfiles()
      ]);
      setSwaps(swapsData);
      setProfiles(profilesData);
    } catch (err) {
      console.error("Erro ao carregar dados de trocas:", err);
      setNotification("Erro ao carregar registros do servidor.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mapear perfis para acesso rápido por ID
  const profilesMap = useMemo(() => {
    return profiles.reduce((acc, p) => {
      if (p.id) acc[p.id] = p;
      return acc;
    }, {} as Record<string, Operator>);
  }, [profiles]);

  // Lista de substitutos elegíveis (todos exceto o escalado)
  const eligibleSubstitutes = useMemo(() => {
    return profiles.filter(p => p.id !== currentUser.id);
  }, [profiles, currentUser]);

  // Resolver nomes de exibição nos registros
  const enrichedSwaps = useMemo(() => {
    return swaps.map(s => {
      const escalado = profilesMap[s.escaladoId];
      const substituto = profilesMap[s.substitutoId];
      const aprovador = s.aprovadorId ? profilesMap[s.aprovadorId] : null;

      return {
        ...s,
        escaladoName: escalado ? `${escalado.rank} ${escalado.warName}` : 'Militar Removido',
        substitutoName: substituto ? `${substituto.rank} ${substituto.warName}` : 'Militar Removido',
        aprovadorName: aprovador ? `${aprovador.rank} ${aprovador.warName}` : undefined
      };
    });
  }, [swaps, profilesMap]);

  // Filtrar e pesquisar permutas
  const filteredSwaps = useMemo(() => {
    return enrichedSwaps.filter(s => {
      // 1. Filtro de Tab
      if (activeTab === 'minhas' && s.escaladoId !== currentUser.id && s.substitutoId !== currentUser.id) {
        return false;
      }
      if (activeTab === 'aprovar' && s.status !== 'pendente') {
        return false;
      }

      // 2. Filtro de Status
      if (statusFilter !== 'todos' && s.status !== statusFilter) {
        return false;
      }

      // 3. Filtro de Busca (Nomes, Função, Observação)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const escaladoMatch = s.escaladoName?.toLowerCase().includes(query);
        const substitutoMatch = s.substitutoName?.toLowerCase().includes(query);
        const funcaoMatch = s.funcao.toLowerCase().includes(query);
        const obsMatch = s.observacao?.toLowerCase().includes(query);
        const dateMatch = s.data.includes(query);
        
        return escaladoMatch || substitutoMatch || funcaoMatch || obsMatch || dateMatch;
      }

      return true;
    });
  }, [enrichedSwaps, activeTab, statusFilter, searchTerm, currentUser.id]);

  // Enviar nova troca de serviço
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.id) {
      setNotification("Erro: Sessão do usuário inválida.", "error");
      return;
    }
    if (!formData.substitutoId) {
      setNotification("Por favor, selecione o substituto.", "error");
      return;
    }
    if (!formData.data) {
      setNotification("Por favor, preencha a data da troca.", "error");
      return;
    }

    setSaving(true);
    try {
      const newSwap: Partial<ServiceSwap> = {
        escaladoId: currentUser.id,
        substitutoId: formData.substitutoId,
        funcao: formData.funcao,
        data: formData.data,
        horarioInicio: formData.horarioInicio,
        horarioFim: formData.horarioFim,
        status: 'pendente'
      };

      const result = await createServiceSwap(newSwap);
      if (result) {
        setNotification("Solicitação de troca registrada com sucesso!", "success");
        setIsModalOpen(false);
        setFormData({
          substitutoId: '',
          funcao: 'Linha',
          data: '',
          horarioInicio: '08:00',
          horarioFim: '08:00'
        });
        await loadData();
      } else {
        throw new Error("Erro no retorno da criação do registro.");
      }
    } catch (err: any) {
      console.error("Erro ao registrar troca de serviço:", err);
      setNotification(err.message || "Erro ao salvar a solicitação.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Avaliar (Aprovar / Reprovar) a troca de serviço
  const handleEvaluate = async () => {
    if (!evaluationModal.swap || !currentUser.id) return;
    setEvaluating(true);
    try {
      const result = await evaluateServiceSwap(
        evaluationModal.swap.id,
        evaluationModal.action,
        currentUser.id,
        evaluationModal.observation
      );

      if (result) {
        setNotification(
          `Troca de serviço ${evaluationModal.action === 'aprovado' ? 'aprovada' : 'reprovada'} com sucesso!`,
          "success"
        );
        setEvaluationModal({ isOpen: false, swap: null, action: 'aprovado', observation: '' });
        await loadData();
      } else {
        throw new Error("Erro ao atualizar avaliação.");
      }
    } catch (err: any) {
      console.error("Erro ao avaliar troca de serviço:", err);
      setNotification(err.message || "Erro ao avaliar a solicitação.", "error");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase">
            Troca de <span className="text-red-600">Serviço</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
            Gestão de permutas e substituições de escalas de serviço
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Solicitar Troca
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm justify-between">
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl max-w-md w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab('todas'); setStatusFilter('todos'); }}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-[10px] font-black uppercase transition-all duration-200 ${activeTab === 'todas' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
          >
            Todas as Trocas
          </button>
          <button
            onClick={() => { setActiveTab('minhas'); setStatusFilter('todos'); }}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-[10px] font-black uppercase transition-all duration-200 ${activeTab === 'minhas' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
          >
            Minhas Solicitações
          </button>
          {currentUser.isAdmin && (
            <button
              onClick={() => { setActiveTab('aprovar'); setStatusFilter('pendente'); }}
              className={`flex-1 sm:flex-initial py-2 px-4 rounded-lg text-[10px] font-black uppercase transition-all duration-200 relative ${activeTab === 'aprovar' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
            >
              Aprovações
              {swaps.filter(s => s.status === 'pendente').length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {swaps.filter(s => s.status === 'pendente').length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Filtros rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab !== 'aprovar' && (
            <div className="flex bg-slate-50 border border-slate-150 p-0.5 rounded-lg text-[9px] font-black uppercase">
              {(['todos', 'pendente', 'aprovado', 'reprovado'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md transition-all ${statusFilter === st ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {st === 'todos' ? 'Todos' : st === 'pendente' ? 'Pendente' : st === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Busca e Barra de Ferramentas */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por escalado, substituto, função, data ou observação..."
          className="w-full bg-white border border-slate-150 rounded-2xl pl-12 pr-4 py-3.5 text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-sm shadow-sm"
        />
      </div>

      {/* Grid de Solicitações */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Carregando Trocas de Serviço...</p>
        </div>
      ) : filteredSwaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-center px-4">
          <div className="bg-slate-100 p-4 rounded-full text-slate-400 mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-slate-800 font-black text-sm uppercase">Nenhuma troca de serviço encontrada</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-md font-medium">
            Não há registros que correspondam aos filtros selecionados. Tente ajustar os termos de busca ou clique em "Solicitar Troca" para criar um novo registro.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSwaps.map((swap) => {
            const isEscalado = swap.escaladoId === currentUser.id;
            const isSubstituto = swap.substitutoId === currentUser.id;
            
            return (
              <div 
                key={swap.id}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Lado Esquerdo: Status e Info da Escala */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">
                    {swap.status === 'pendente' && (
                      <span className="inline-flex items-center justify-center p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
                        <Clock size={20} />
                      </span>
                    )}
                    {swap.status === 'aprovado' && (
                      <span className="inline-flex items-center justify-center p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                        <CheckCircle2 size={20} />
                      </span>
                    )}
                    {swap.status === 'reprovado' && (
                      <span className="inline-flex items-center justify-center p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
                        <XCircle size={20} />
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                        swap.funcao === 'CG' ? 'bg-red-100 text-red-700' :
                        swap.funcao === 'COV' ? 'bg-blue-100 text-blue-700' :
                        swap.funcao === 'Linha' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {swap.funcao}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        • {new Date(swap.data + 'T00:00:00').toLocaleDateString('pt-BR')} ({swap.horarioInicio}h - {swap.horarioFim}h)
                      </span>
                    </div>

                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Original (Escalado):</span>
                        <span className={`text-xs font-bold ${isEscalado ? 'text-blue-600 underline decoration-2' : 'text-slate-800'}`}>
                          {swap.escaladoName}
                        </span>
                      </div>
                      <div className="hidden sm:block text-slate-300">|</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Substituto:</span>
                        <span className={`text-xs font-bold ${isSubstituto ? 'text-blue-600 underline decoration-2' : 'text-slate-800'}`}>
                          {swap.substitutoName}
                        </span>
                      </div>
                    </div>

                    {/* Observação / Detalhes da Avaliação */}
                    {(swap.observacao || swap.aprovadorName) && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        {swap.aprovadorName && (
                          <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                            <UserCheck size={12} />
                            Avaliado por: <span className="text-slate-700">{swap.aprovadorName}</span> em {swap.dataAprovacao ? new Date(swap.dataAprovacao).toLocaleDateString('pt-BR') : ''}
                          </p>
                        )}
                        {swap.observacao && (
                          <p className="text-xs text-slate-600 font-medium italic flex items-start gap-1">
                            <MessageSquare size={12} className="shrink-0 mt-0.5 text-slate-400" />
                            "{swap.observacao}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Lado Direito: Ações */}
                {currentUser.isAdmin && swap.status === 'pendente' && (
                  <div className="flex items-center gap-2 border-t pt-4 md:border-t-0 md:pt-0 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => setEvaluationModal({
                        isOpen: true,
                        swap,
                        action: 'aprovado',
                        observation: ''
                      })}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1"
                    >
                      <Check size={14} /> Aprovar
                    </button>
                    <button
                      onClick={() => setEvaluationModal({
                        isOpen: true,
                        swap,
                        action: 'reprovado',
                        observation: ''
                      })}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1"
                    >
                      <X size={14} /> Reprovar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro de Troca de Serviço */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-lg uppercase">Nova Troca de Serviço</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Preencha os dados do plantão a permutar</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Escalado (Estático) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Escalado (Você)</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 font-bold text-sm flex items-center gap-2">
                  <User size={16} />
                  <span>{currentUser.rank} {currentUser.warName}</span>
                </div>
              </div>

              {/* Substituto (Select) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Substituto</label>
                <div className="relative">
                  <select
                    required
                    value={formData.substitutoId}
                    onChange={(e) => setFormData({ ...formData, substitutoId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-bold text-sm appearance-none"
                  >
                    <option value="" disabled>Selecione o substituto...</option>
                    {eligibleSubstitutes.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.rank} {p.warName} ({p.name})
                      </option>
                    ))}
                  </select>
                  <ArrowUpDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Função */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1 block">Função</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CG', 'COV', 'Linha', 'COBOM'] as const).map((fun) => (
                    <button
                      key={fun}
                      type="button"
                      onClick={() => setFormData({ ...formData, funcao: fun })}
                      className={`py-3 rounded-xl font-black text-xs uppercase transition-all border ${
                        formData.funcao === fun 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {fun}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data (Calendário e Digitação) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Data do Plantão</label>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Selecione ou digite no calendário</span>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-bold text-sm"
                  />
                </div>
              </div>

              {/* Horário Início e Fim */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Horário de Início</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="time"
                      required
                      value={formData.horarioInicio}
                      onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-bold text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Horário de Fim</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="time"
                      required
                      value={formData.horarioFim}
                      onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Ações */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-98"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-98 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} /> Gravando...
                    </>
                  ) : (
                    "Enviar Solicitação"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Avaliação de Troca de Serviço */}
      {evaluationModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-100 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-lg uppercase flex items-center gap-1.5">
                  {evaluationModal.action === 'aprovado' ? (
                    <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={20} /> Aprovar Troca</span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1.5"><XCircle size={20} /> Reprovar Troca</span>
                  )}
                </h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Confirmação de decisão administrativa</p>
              </div>
              <button 
                onClick={() => setEvaluationModal({ isOpen: false, swap: null, action: 'aprovado', observation: '' })}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Original (Escalado):</span>
                  <span className="text-slate-800 font-bold">{evaluationModal.swap?.escaladoName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Substituto:</span>
                  <span className="text-slate-800 font-bold">{evaluationModal.swap?.substitutoName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Data & Hora:</span>
                  <span className="text-slate-800 font-bold">
                    {evaluationModal.swap ? new Date(evaluationModal.swap.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''} das {evaluationModal.swap?.horarioInicio}h às {evaluationModal.swap?.horarioFim}h
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase">Função:</span>
                  <span className="text-slate-800 font-bold">{evaluationModal.swap?.funcao}</span>
                </div>
              </div>

              {/* Observação / Justificativa */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Observação / Justificativa (Opcional)</label>
                <textarea
                  value={evaluationModal.observation}
                  onChange={(e) => setEvaluationModal({ ...evaluationModal, observation: e.target.value })}
                  placeholder="Escreva alguma observação administrativa sobre esta decisão..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none font-bold text-sm resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEvaluationModal({ isOpen: false, swap: null, action: 'aprovado', observation: '' })}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-98 shadow-sm"
              >
                Voltar
              </button>
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className={`px-5 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-98 flex items-center gap-2 ${
                  evaluationModal.action === 'aprovado' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {evaluating ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Processando...
                  </>
                ) : (
                  evaluationModal.action === 'aprovado' ? "Confirmar Aprovação" : "Confirmar Reprovação"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceSwapManager;
