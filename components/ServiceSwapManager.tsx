
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ServiceSwap, Operator } from '../types';
import { getServiceSwaps, createServiceSwap, evaluateServiceSwap, getAllProfiles, cancelServiceSwap, acceptServiceSwap, rejectServiceSwap, updateServiceSwapPayment, updateServiceSwapDetails } from '../services/supabaseService';
import ServiceSwapReport from './ServiceSwapReport';
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

interface UnifiedSwapRequest {
  id: string;
  funcao: 'CG' | 'COV' | 'Linha' | 'COBOM';
  status: 'aguardando_substituto' | 'recusado_substituto' | 'pendente' | 'aprovado' | 'reprovado' | 'cancelado';
  createdAt: string;
  ida: ServiceSwap & { escaladoName?: string; substitutoName?: string; aprovadorName?: string };
  volta?: ServiceSwap & { escaladoName?: string; substitutoName?: string; aprovadorName?: string };
}

interface Props {
  currentUser: Operator;
  setNotification: (msg: string, type: 'success' | 'error') => void;
}

const FUNCOES = ['CG', 'COV', 'Linha', 'COBOM'] as const;
type Funcao = typeof FUNCOES[number];

const STATUS_LABELS: Record<string, string> = {
  todos: 'Todos',
  aguardando_substituto: 'Aguardando Substituto',
  recusado_substituto: 'Recusado pelo Substituto',
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
    case 'aguardando_substituto': return 'bg-sky-50 text-sky-700 border border-sky-200';
    case 'recusado_substituto':   return 'bg-rose-50 text-rose-700 border border-rose-200';
    case 'pendente':              return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'aprovado':              return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'reprovado':             return 'bg-red-50 text-red-700 border border-red-200';
    case 'cancelado':             return 'bg-slate-100 text-slate-500 border border-slate-200';
    default:                      return 'bg-slate-50 text-slate-600';
  }
};

const ServiceSwapManager: React.FC<Props> = ({ currentUser, setNotification }) => {
  const [swaps, setSwaps] = useState<ServiceSwap[]>([]);
  const [profiles, setProfiles] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [evaluationModal, setEvaluationModal] = useState<{
    isOpen: boolean;
    swap: (ServiceSwap & { escaladoName?: string; substitutoName?: string }) | null;
    action: 'aprovado' | 'reprovado';
    observation: string;
  }>({ isOpen: false, swap: null, action: 'aprovado', observation: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusFilterDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (statusFilterDropdownRef.current && !statusFilterDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [activeTab, setActiveTab] = useState<'todas' | 'minhas' | 'aprovar'>('todas');

  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    swapId: string | null;
    reason: string;
  }>({ isOpen: false, swapId: null, reason: '' });

  const [acceptModal, setAcceptModal] = useState<{
    isOpen: boolean;
    swap: (ServiceSwap & { escaladoName?: string; substitutoName?: string }) | null;
  }>({ isOpen: false, swap: null });

  const [formData, setFormData] = useState({
    escaladoId: currentUser.id || '',
    substitutoId: '',
    funcao: 'Linha' as Funcao,
    data: '',
    horarioInicio: '08:00',
    horarioFim: '08:00',
    dataPagamento: '',
    horarioInicioPagamento: '08:00',
    horarioFimPagamento: '08:00',
  });

  const [informarPagamentoAgora, setInformarPagamentoAgora] = useState(false);

  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    swap: ServiceSwap | null;
    dataPagamento: string;
    horarioInicioPagamento: string;
    horarioFimPagamento: string;
  }>({
    isOpen: false,
    swap: null,
    dataPagamento: '',
    horarioInicioPagamento: '08:00',
    horarioFimPagamento: '08:00',
  });

  const [savingPayment, setSavingPayment] = useState(false);
  const isSavingRef = useRef(false);
  const [showPendingPaybacksOnly, setShowPendingPaybacksOnly] = useState(false);

  const [escaladoSearch, setEscaladoSearch] = useState(currentUser.id ? `${currentUser.rank} ${currentUser.warName} (${currentUser.name})` : '');
  const [isEscaladoDropdownOpen, setIsEscaladoDropdownOpen] = useState(false);
  const escaladoDropdownRef = React.useRef<HTMLDivElement>(null);

  const [substituteSearch, setSubstituteSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [cancelSwapId, setCancelSwapId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
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

  const eligibleEscalados = useMemo(() => profiles, [profiles]);

  const filteredEscalados = useMemo(() => {
    const query = escaladoSearch.toLowerCase().trim();
    if (!query) return eligibleEscalados;
    return eligibleEscalados.filter(p =>
      p.rank.toLowerCase().includes(query) ||
      p.warName.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query)
    );
  }, [eligibleEscalados, escaladoSearch]);

  const eligibleSubstitutes = useMemo(() =>
    profiles.filter(p => p.id !== formData.escaladoId),
  [profiles, formData.escaladoId]);

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
      // Clique fora do substituto
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
      // Clique fora do escalado
      if (escaladoDropdownRef.current && !escaladoDropdownRef.current.contains(event.target as Node)) {
        setIsEscaladoDropdownOpen(false);
        if (!formData.escaladoId) {
          setEscaladoSearch('');
        } else {
          const selected = profilesMap[formData.escaladoId];
          if (selected) {
            setEscaladoSearch(`${selected.rank} ${selected.warName} (${selected.name})`);
          }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [formData.substitutoId, formData.escaladoId, profilesMap]);

  const handleSelectEscalado = (esc: Operator) => {
    setFormData(prev => {
      const nextSubId = prev.substitutoId === esc.id ? '' : prev.substitutoId;
      if (prev.substitutoId === esc.id) {
        setSubstituteSearch('');
      }
      return {
        ...prev,
        escaladoId: esc.id || '',
        substitutoId: nextSubId
      };
    });
    setEscaladoSearch(esc.id ? `${esc.rank} ${esc.warName} (${esc.name})` : '');
    setIsEscaladoDropdownOpen(false);
  };

  const handleEscaladoSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEscaladoSearch(val);
    setFormData(prev => ({ ...prev, escaladoId: '' }));
    setIsEscaladoDropdownOpen(true);
  };

  const handleClearEscaladoSelection = () => {
    setEscaladoSearch('');
    setFormData(prev => ({ ...prev, escaladoId: '' }));
    setIsEscaladoDropdownOpen(false);
  };

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

  const enrichedSwaps = useMemo(() => {
    // 1. Mapeamento básico
    const mapped = swaps.map(s => {
      const escalado   = profilesMap[s.escaladoId];
      const substituto = profilesMap[s.substitutoId];
      const aprovador  = s.aprovadorId ? profilesMap[s.aprovadorId] : null;
      return {
        ...s,
        escaladoName:   escalado   ? `${escalado.rank} ${escalado.warName}`   : 'Militar Removido',
        substitutoName: substituto ? `${substituto.rank} ${substituto.warName}` : 'Militar Removido',
        aprovadorName:  aprovador  ? `${aprovador.rank} ${aprovador.warName}`  : undefined,
        pairType:       'solo' as 'solo' | 'ida' | 'volta',
        pairId:         null as string | null
      };
    });

    // 2. Procurar pares para ligar visualmente por proximidade de tempo (createdAt com diferença < 15 segundos)
    for (let i = 0; i < mapped.length; i++) {
      const s1 = mapped[i];
      if (s1.pairType !== 'solo') continue;

      const s2 = mapped.find((item, idx) => 
        idx !== i &&
        item.pairType === 'solo' &&
        item.funcao === s1.funcao &&
        item.escaladoId === s1.substitutoId &&
        item.substitutoId === s1.escaladoId &&
        Math.abs(new Date(item.createdAt).getTime() - new Date(s1.createdAt).getTime()) < 15000
      );

      if (s2) {
        let s1IsIda = true;
        if (s1.data === '1970-01-01') {
          s1IsIda = false;
        } else if (s2.data === '1970-01-01') {
          s1IsIda = true;
        } else {
          s1IsIda = s1.data <= s2.data;
        }

        if (s1IsIda) {
          s1.pairType = 'ida';
          s2.pairType = 'volta';
        } else {
          s1.pairType = 'volta';
          s2.pairType = 'ida';
        }

        s1.pairId = s2.id;
        s2.pairId = s1.id;

        // Sobrescrever a data e horários da volta caso o banco esteja com '1970-01-01' (a pagar),
        // mas a ida correspondente tenha dataPagamento preenchida pelo próprio usuário via RLS
        const ida = s1IsIda ? s1 : s2;
        const volta = s1IsIda ? s2 : s1;
        if (volta.data === '1970-01-01' && ida.dataPagamento && ida.dataPagamento !== '1970-01-01') {
          volta.data = ida.dataPagamento;
          volta.horarioInicio = ida.horarioInicioPagamento || '08:00';
          volta.horarioFim = ida.horarioFimPagamento || '08:00';
        }
      }
    }

    return mapped;
  }, [swaps, profilesMap]);

  const unifiedSwaps = useMemo(() => {
    const list: UnifiedSwapRequest[] = [];
    const processedIds = new Set<string>();

    for (let i = 0; i < enrichedSwaps.length; i++) {
      const s1 = enrichedSwaps[i];
      if (processedIds.has(s1.id)) continue;

      if (s1.pairType !== 'solo' && s1.pairId) {
        const s2 = enrichedSwaps.find(item => item.id === s1.pairId);
        if (s2 && !processedIds.has(s2.id)) {
          const ida = s1.pairType === 'ida' ? s1 : s2;
          const volta = s1.pairType === 'volta' ? s1 : s2;

          // Se qualquer um dos lados estiver cancelado/reprovado/recusado, o status unificado assume a rejeição.
          // Isso garante resiliência a restrições RLS caso apenas uma perna seja atualizada com sucesso no banco.
          let unifiedStatus = ida.status;
          if (ida.status === 'cancelado' || (volta && volta.status === 'cancelado')) {
            unifiedStatus = 'cancelado';
          } else if (ida.status === 'reprovado' || (volta && volta.status === 'reprovado')) {
            unifiedStatus = 'reprovado';
          } else if (ida.status === 'recusado_substituto' || (volta && volta.status === 'recusado_substituto')) {
            unifiedStatus = 'recusado_substituto';
          } else if (ida.status === 'pendente' || (volta && volta.status === 'pendente')) {
            unifiedStatus = 'pendente';
          }

          list.push({
            id: ida.id,
            funcao: s1.funcao,
            status: unifiedStatus as any,
            createdAt: s1.createdAt,
            ida,
            volta,
          });

          processedIds.add(s1.id);
          processedIds.add(s2.id);
          continue;
        }
      }

      list.push({
        id: s1.id,
        funcao: s1.funcao,
        status: s1.status as any,
        createdAt: s1.createdAt,
        ida: s1,
      });
      processedIds.add(s1.id);
    }

    return list;
  }, [enrichedSwaps]);

  const pendingCount = useMemo(() => {
    return unifiedSwaps.filter(u => u.status === 'pendente').length;
  }, [unifiedSwaps]);

  const totalPendingPaybacksCount = useMemo(() => {
    return unifiedSwaps.filter(u => u.volta && u.volta.data === '1970-01-01' && u.status !== 'reprovado' && u.status !== 'cancelado').length;
  }, [unifiedSwaps]);

  const mySubstitutionsPendingCount = useMemo(() => {
    return swaps.filter(s => s.substitutoId === currentUser.id && s.status === 'aguardando_substituto').length;
  }, [swaps, currentUser.id]);

  const filteredUnifiedSwaps = useMemo(() => {
    return unifiedSwaps.filter(u => {
      if (activeTab === 'minhas') {
        const isUserInvolvedInIda = u.ida.escaladoId === currentUser.id || u.ida.substitutoId === currentUser.id;
        const isUserInvolvedInVolta = u.volta ? (u.volta.escaladoId === currentUser.id || u.volta.substitutoId === currentUser.id) : false;
        if (!isUserInvolvedInIda && !isUserInvolvedInVolta) return false;
      }
      if (activeTab === 'aprovar' && u.status !== 'pendente') return false;
      if (statusFilter.length > 0 && !statusFilter.includes(u.status)) return false;
      if (showPendingPaybacksOnly) {
        if (!u.volta || u.volta.data !== '1970-01-01') return false;
      }
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchesIda = 
          u.ida.escaladoName?.toLowerCase().includes(q) ||
          u.ida.substitutoName?.toLowerCase().includes(q) ||
          u.ida.data.includes(q);
        const matchesVolta = u.volta ? (
          u.volta.escaladoName?.toLowerCase().includes(q) ||
          u.volta.substitutoName?.toLowerCase().includes(q) ||
          u.volta.data.includes(q)
        ) : false;
        const matchesGeneral = 
          u.funcao.toLowerCase().includes(q) ||
          u.ida.observacao?.toLowerCase().includes(q);

        if (!matchesIda && !matchesVolta && !matchesGeneral) return false;
      }
      return true;
    });
  }, [unifiedSwaps, activeTab, statusFilter, searchTerm, currentUser.id, showPendingPaybacksOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current) return;
    if (!currentUser.id) { setNotification('Sessão inválida.', 'error'); return; }
    if (!formData.escaladoId) { setNotification('Selecione o escalado.', 'error'); return; }
    if (!formData.substitutoId) { setNotification('Selecione o substituto.', 'error'); return; }
    if (!formData.data) { setNotification('Preencha a data da troca.', 'error'); return; }

    if (informarPagamentoAgora) {
      if (!formData.dataPagamento) { setNotification('Preencha a data da devolução.', 'error'); return; }
      if (!formData.horarioInicioPagamento) { setNotification('Preencha o horário de início da devolução.', 'error'); return; }
      if (!formData.horarioFimPagamento) { setNotification('Preencha o horário de fim da devolução.', 'error'); return; }
    }

    isSavingRef.current = true;
    setSaving(true);
    try {
      // 1. Criar a troca original (A -> B) - agora já pendente direto, aceita pelas duas partes que já combinaram previamente!
      const result = await createServiceSwap({
        escaladoId:    formData.escaladoId,
        substitutoId:  formData.substitutoId,
        funcao:        formData.funcao,
        data:          formData.data,
        horarioInicio: formData.horarioInicio,
        horarioFim:    formData.horarioFim,
        status:        'pendente',
      } as Partial<ServiceSwap>);

      // 2. Se a devolução foi informada, criar a troca invertida (B -> A) já preenchida. Caso contrário, criar a linha em branco para preenchimento posterior.
      if (informarPagamentoAgora && formData.dataPagamento) {
        await createServiceSwap({
          escaladoId:    formData.substitutoId, // Invertido!
          substitutoId:  formData.escaladoId,   // Invertido!
          funcao:        formData.funcao,
          data:          formData.dataPagamento,
          horarioInicio: formData.horarioInicioPagamento,
          horarioFim:    formData.horarioFimPagamento,
          status:        'pendente', // Aceita automaticamente, aguardando aprovação administrativa!
        } as Partial<ServiceSwap>);
      } else {
        await createServiceSwap({
          escaladoId:    formData.substitutoId, // Invertido!
          substitutoId:  formData.escaladoId,   // Invertido!
          funcao:        formData.funcao,
          data:          '1970-01-01', // Data de controle para "A definir" (Pagar depois)
          horarioInicio: '00:00',
          horarioFim:    '00:00',
          status:        'pendente', // Aceita automaticamente, aguardando aprovação administrativa!
        } as any);
      }

      if (result) {
        setNotification('Solicitação enviada para aprovação do administrador!', 'success');
        setIsModalOpen(false);
        setFormData({
          escaladoId: currentUser.id || '',
          substitutoId: '',
          funcao: 'Linha',
          data: '',
          horarioInicio: '08:00',
          horarioFim: '08:00',
          dataPagamento: '',
          horarioInicioPagamento: '08:00',
          horarioFimPagamento: '08:00',
        });
        setEscaladoSearch(currentUser.id ? `${currentUser.rank} ${currentUser.warName} (${currentUser.name})` : '');
        setSubstituteSearch('');
        setInformarPagamentoAgora(false);
        await loadData();
      } else throw new Error('Erro no retorno da criação.');
    } catch (err: any) {
      setNotification(err.message || 'Erro ao salvar a solicitação.', 'error');
    } finally {
      isSavingRef.current = false;
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
        // Encontrar a troca de devolução casada (B -> A) que está pendente de aprovação por proximidade temporal
        const originalSwap = evaluationModal.swap;
        const linkedSwap = swaps.find(s => 
          s.id !== originalSwap.id &&
          s.escaladoId === originalSwap.substitutoId &&
          s.substitutoId === originalSwap.escaladoId &&
          s.funcao === originalSwap.funcao &&
          s.status === 'pendente' &&
          Math.abs(new Date(s.createdAt).getTime() - new Date(originalSwap.createdAt).getTime()) < 15000
        );
        if (linkedSwap) {
          await evaluateServiceSwap(
            linkedSwap.id,
            evaluationModal.action,
            currentUser.id,
            `Avaliado de forma casada com a troca principal: ${evaluationModal.observation || ''}`
          );
        }

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
    if (currentUser.isAdmin && !cancelReason.trim()) {
      setNotification('Por favor, informe o motivo do cancelamento.', 'error');
      return;
    }
    try {
      const originalSwap = swaps.find(s => s.id === cancelSwapId);
      const reasonVal = cancelReason.trim() ? cancelReason.trim() : undefined;
      const result = await cancelServiceSwap(
        cancelSwapId,
        reasonVal,
        currentUser.isAdmin ? currentUser.id : undefined
      );
      if (result) {
        if (originalSwap) {
          // Encontrar a troca de devolução casada (B -> A) e cancelar também!
          const linkedSwap = swaps.find(s => 
            s.id !== originalSwap.id &&
            s.escaladoId === originalSwap.substitutoId &&
            s.substitutoId === originalSwap.escaladoId &&
            s.funcao === originalSwap.funcao &&
            ['aguardando_substituto', 'pendente', 'aprovado'].includes(s.status) &&
            Math.abs(new Date(s.createdAt).getTime() - new Date(originalSwap.createdAt).getTime()) < 15000
          );
          if (linkedSwap) {
            try {
              await cancelServiceSwap(
                linkedSwap.id,
                reasonVal 
                  ? `Cancelada devido ao cancelamento da troca principal: ${reasonVal}` 
                  : 'Cancelada devido ao cancelamento da troca principal',
                currentUser.isAdmin ? currentUser.id : undefined
              );
            } catch (err) {
              console.warn("Erro RLS ao cancelar perna casada (tolerado pois o status resolverá):", err);
            }
          }
        }
        setNotification('Solicitação de troca cancelada com sucesso!', 'success');
        await loadData();
      } else throw new Error('Erro ao cancelar a troca.');
    } catch (err: any) {
      setNotification(err.message || 'Erro ao cancelar a solicitação.', 'error');
    } finally {
      setCancelSwapId(null);
      setCancelReason('');
    }
  };

  const handleAccept = (swap: (ServiceSwap & { escaladoName?: string; substitutoName?: string })) => {
    setAcceptModal({ isOpen: true, swap });
  };

  const confirmAccept = async () => {
    if (!acceptModal.swap) return;
    try {
      const result = await acceptServiceSwap(acceptModal.swap.id);
      if (result) {
        setNotification('Você aceitou a troca de serviço com sucesso!', 'success');
        setAcceptModal({ isOpen: false, swap: null });
        await loadData();
      } else throw new Error('Erro ao aceitar a troca.');
    } catch (err: any) {
      setNotification(err.message || 'Erro ao aceitar a solicitação.', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectModal.swapId || !rejectModal.reason.trim()) {
      setNotification('Por favor, informe a justificativa da recusa.', 'error');
      return;
    }
    try {
      const originalSwap = swaps.find(s => s.id === rejectModal.swapId);
      const result = await rejectServiceSwap(rejectModal.swapId, rejectModal.reason);
      if (result) {
        if (originalSwap) {
          // Encontrar a troca de devolução casada (B -> A) e recusar também!
          const linkedSwap = swaps.find(s => 
            s.id !== originalSwap.id &&
            s.escaladoId === originalSwap.substitutoId &&
            s.substitutoId === originalSwap.escaladoId &&
            s.funcao === originalSwap.funcao &&
            s.status === 'pendente' &&
            Math.abs(new Date(s.createdAt).getTime() - new Date(originalSwap.createdAt).getTime()) < 15000
          );
          if (linkedSwap) {
            await rejectServiceSwap(linkedSwap.id, `Recusada devido à recusa da troca principal: ${rejectModal.reason}`);
          }
        }
        setNotification('Solicitação de troca recusada com sucesso.', 'success');
        setRejectModal({ isOpen: false, swapId: null, reason: '' });
        await loadData();
      } else throw new Error('Erro ao recusar a troca.');
    } catch (err: any) {
      setNotification(err.message || 'Erro ao recusar a solicitação.', 'error');
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModal.swap) return;
    if (!paymentModal.dataPagamento) {
      setNotification('Preencha a data da devolução.', 'error');
      return;
    }
    if (!paymentModal.horarioInicioPagamento) {
      setNotification('Preencha o horário de início.', 'error');
      return;
    }
    if (!paymentModal.horarioFimPagamento) {
      setNotification('Preencha o horário de fim.', 'error');
      return;
    }

    setSavingPayment(true);
    try {
      const selectedSwap = paymentModal.swap;
      
      // Encontrar a outra perna da troca casada (Ida <-> Volta)
      const linkedSwap = swaps.find(s => 
        s.id !== selectedSwap.id &&
        s.escaladoId === selectedSwap.substitutoId &&
        s.substitutoId === selectedSwap.escaladoId &&
        s.funcao === selectedSwap.funcao &&
        Math.abs(new Date(s.createdAt).getTime() - new Date(selectedSwap.createdAt).getTime()) < 15000
      );

      // Identificar quem é a Ida e quem é a Volta na relação por proximidade temporal
      let s1IsIda = true;
      if (selectedSwap.data === '1970-01-01') {
        s1IsIda = false;
      } else if (linkedSwap && linkedSwap.data === '1970-01-01') {
        s1IsIda = true;
      } else if (linkedSwap) {
        s1IsIda = selectedSwap.data <= linkedSwap.data;
      }

      const idaSwap = s1IsIda ? selectedSwap : linkedSwap;
      const voltaSwap = s1IsIda ? linkedSwap : selectedSwap;

      let success = false;

      // 1. Sempre tentar salvar na tabela de pagamento da Ida (onde o usuário tem permissão RLS pois é o original escalado_id)
      if (idaSwap) {
        try {
          await updateServiceSwapPayment(
            idaSwap.id,
            paymentModal.dataPagamento,
            paymentModal.horarioInicioPagamento,
            paymentModal.horarioFimPagamento
          );
          success = true;
        } catch (err) {
          console.warn("Erro RLS ao atualizar pagamento na perna de Ida (tolerado):", err);
        }
      }

      // 2. Tentar também atualizar a Volta diretamente no banco para sincronização
      if (voltaSwap) {
        try {
          await updateServiceSwapDetails(
            voltaSwap.id,
            paymentModal.dataPagamento,
            paymentModal.horarioInicioPagamento,
            paymentModal.horarioFimPagamento
          );
          success = true;
        } catch (err) {
          console.warn("Erro RLS ao atualizar detalhes na perna de Volta (tolerado pois o useMemo resolverá):", err);
        }
      }

      // Se nenhum dos updates de banco deu certo, aí sim disparamos o erro
      if (!success) {
        throw new Error("Não foi possível salvar a devolução devido a permissões de escrita do banco.");
      }

      setNotification('Devolução registrada com sucesso!', 'success');
      setPaymentModal({
        isOpen: false,
        swap: null,
        dataPagamento: '',
        horarioInicioPagamento: '08:00',
        horarioFimPagamento: '08:00'
      });
      await loadData();
    } catch (err: any) {
      setNotification(err.message || 'Erro ao registrar a devolução de plantão.', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  /* ─────────────── RENDER ─────────────── */
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 md:pb-0">

      {/* ── HEADER ── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/30">
            <ArrowLeftRight size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Troca de Serviço</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Registro e aprovação de trocas de escala.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {currentUser.isAdmin && (
            <button
              onClick={() => setShowReport(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-850/20 font-black text-sm active:scale-95"
            >
              <FileText size={18} />
              Relatório PDF
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 font-black text-sm active:scale-95"
          >
            <Plus size={18} />
            Nova Solicitação
          </button>
        </div>
      </header>

      {/* ── MAIN TABS ── */}
      <div className="flex px-2 md:px-0 gap-2 border-b-2 border-slate-200 pb-4 overflow-x-auto no-scrollbar scroll-smooth print:hidden">
        {[
          { id: 'todas',  label: 'Todas as Trocas',    icon: FileText },
          { id: 'minhas', label: 'Minhas Solicitações', icon: User },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id as any); setStatusFilter([]); }}
            className={`group relative flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-slate-900 text-white shadow-lg scale-100'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 scale-95'
            }`}
          >
            <Icon size={18} />
            <span className={activeTab === id ? 'inline' : 'hidden md:inline group-hover:inline'}>{label}</span>
            {id === 'minhas' && mySubstitutionsPendingCount > 0 && (
              <span className="ml-1.5 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white shadow shrink-0 animate-pulse">
                {mySubstitutionsPendingCount}
              </span>
            )}
          </button>
        ))}

        {currentUser.isAdmin && (
          <button
            onClick={() => { setActiveTab('aprovar'); setStatusFilter(['pendente']); }}
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
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center print:hidden">
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

        {/* Toggle Filtro A Pagar */}
        <button
          type="button"
          onClick={() => setShowPendingPaybacksOnly(!showPendingPaybacksOnly)}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all text-xs font-black uppercase tracking-wider shrink-0 w-full md:w-auto justify-center ${
            showPendingPaybacksOnly
              ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-200'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
          }`}
        >
          <Clock size={14} className={showPendingPaybacksOnly ? 'text-white' : 'text-amber-600'} />
          <span>A Pagar ({totalPendingPaybacksCount})</span>
        </button>

        {/* Status Multiselect (hidden on "aprovar" tab) */}
        {activeTab !== 'aprovar' && (
          <div className="relative w-full md:w-auto" ref={statusFilterDropdownRef}>
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="flex items-center justify-between md:justify-start gap-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors px-4 py-3 rounded-2xl w-full md:w-auto text-xs font-bold text-slate-700"
            >
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400 shrink-0" />
                <span className="hidden sm:inline text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Status:</span>
                <span>
                  {statusFilter.length === 0
                    ? 'Todos'
                    : statusFilter.length === 1
                    ? STATUS_LABELS[statusFilter[0]]
                    : `${statusFilter.length} Selecionados`}
                </span>
              </div>
              <ChevronRight
                size={14}
                className={`text-slate-400 transition-transform ${isStatusDropdownOpen ? 'rotate-90' : ''} ml-1`}
              />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Status</span>
                  {statusFilter.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter([])}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {Object.entries(STATUS_LABELS).filter(([val]) => val !== 'todos').map(([val, label]) => {
                    const isChecked = statusFilter.includes(val);
                    return (
                      <label
                        key={val}
                        className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors text-xs font-bold text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setStatusFilter(statusFilter.filter(v => v !== val));
                            } else {
                              setStatusFilter([...statusFilter, val]);
                            }
                          }}
                          className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clear filters */}
        {(searchTerm !== '' || statusFilter.length > 0) && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter([]); }}
            className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase px-2 shrink-0"
          >
            Limpar
          </button>
        )}
      </div>

      {/* ── LIST ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm gap-4 print:hidden">
          <Loader2 className="animate-spin text-blue-600" size={36} />
          <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Carregando registros...</p>
        </div>
      ) : filteredUnifiedSwaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-center px-6 print:hidden">
          <div className="bg-slate-100 p-5 rounded-full text-slate-300 mb-4">
            <ArrowLeftRight size={36} />
          </div>
          <h3 className="text-slate-700 font-black text-sm uppercase mb-1">Nenhuma solicitação encontrada</h3>
          <p className="text-slate-400 text-xs max-w-sm font-medium">
            {activeTab === 'minhas'
              ? 'Você ainda não possui solicitações de troca de serviço.'
              : activeTab === 'aprovar'
              ? 'Não há trocas aguardando aprovação no momento.'
              : 'Nenhum registro corresponde aos filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 print:hidden">
          {filteredUnifiedSwaps.map(u => {
            const isIdaEscalado = u.ida.escaladoId === currentUser.id;
            const isIdaSubstituto = u.ida.substitutoId === currentUser.id;
            const isVoltaEscalado = u.volta ? u.volta.escaladoId === currentUser.id : false;
            const isVoltaSubstituto = u.volta ? u.volta.substitutoId === currentUser.id : false;
            const isUserInvolved = isIdaEscalado || isIdaSubstituto || isVoltaEscalado || isVoltaSubstituto;
            
            return (
              <div 
                key={u.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
              >
                {/* Card Header */}
                <div className="bg-slate-50/70 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${statusBadgeClass(u.status)}`}>
                      {(u.status === 'pendente' || u.status === 'aguardando_substituto') && <Clock size={11} />}
                      {u.status === 'aprovado'  && <CheckCircle2 size={11} />}
                      {(u.status === 'reprovado' || u.status === 'recusado_substituto') && <XCircle size={11} />}
                      {u.status === 'cancelado' && <XCircle size={11} />}
                      {STATUS_LABELS[u.status]}
                    </span>
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${funcaoBadgeClass(u.funcao)}`}>
                      {u.funcao}
                    </span>
                    {u.volta && u.volta.data === '1970-01-01' && u.status !== 'reprovado' && u.status !== 'cancelado' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-md text-[8px] font-black uppercase tracking-wider animate-pulse">
                        ⚠️ Pagamento Pendente
                      </span>
                    )}
                  </div>

                  {/* Admin Evaluation Details */}
                  {u.ida.dataAprovacao && (
                    <div className="text-[10px] text-slate-400 font-bold max-w-xs truncate">
                      Aprovador: <span className="text-slate-600 font-extrabold">{u.ida.aprovadorName || 'Administrador'}</span>
                      {u.ida.observacao && <span className="italic block mt-0.5">"{u.ida.observacao}"</span>}
                    </div>
                  )}

                  {/* Card Actions (Aprovação / Cancelamento) */}
                  <div className="flex items-center gap-2">
                    {u.status === 'pendente' && currentUser.isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEvaluationModal({ isOpen: true, swap: u.ida, action: 'aprovado', observation: '' })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 shadow-sm shadow-emerald-500/10"
                        >
                          <Check size={12} /> Aprovar Solicitação
                        </button>
                        <button
                          onClick={() => setEvaluationModal({ isOpen: true, swap: u.ida, action: 'reprovado', observation: '' })}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 shadow-sm shadow-red-500/10"
                        >
                          <X size={12} /> Reprovar Solicitação
                        </button>
                      </div>
                    )}
                    
                    {u.status !== 'cancelado' && (currentUser.isAdmin || (isUserInvolved && ['aguardando_substituto', 'pendente'].includes(u.status))) && (
                      <button
                        onClick={() => setCancelSwapId(u.ida.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1"
                      >
                        <XCircle size={12} /> Cancelar Solicitação
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Body Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  
                  {/* Lado Esquerdo: IDA */}
                  <div className="p-5 border-l-4 border-l-blue-500 bg-blue-500/[0.02] space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-100/50 pb-2">
                      <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider flex items-center gap-1">
                        📤 Ida (Serviço Original)
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        Criado em: {new Date(u.ida.createdAt).toLocaleDateString('pt-BR')} por {u.ida.escaladoName}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Escalado (Trabalha)</span>
                        <span className="text-xs font-bold text-slate-700">{u.ida.escaladoName}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Substituto (Folga)</span>
                        <span className="text-xs font-bold text-slate-700">{u.ida.substitutoName}</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Data / Horário</span>
                      <span className="block text-xs font-bold text-slate-800">
                        {new Date(u.ida.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {u.ida.horarioInicio}h → {u.ida.horarioFim}h
                      </span>
                    </div>
                  </div>

                  {/* Lado Direito: VOLTA */}
                  {u.volta ? (
                    <div className="p-5 border-l-4 border-l-purple-500 bg-purple-500/[0.02] space-y-3">
                      <div className="flex items-center justify-between border-b border-purple-100/50 pb-2">
                        <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider flex items-center gap-1">
                          📥 Volta (Devolução)
                        </span>
                        
                        {/* Devolução Action Button */}
                        {u.volta.data === '1970-01-01' && ['pendente', 'aprovado'].includes(u.status) && (isUserInvolved || currentUser.isAdmin) && (
                          <button
                            onClick={() => setPaymentModal({
                              isOpen: true,
                              swap: u.volta!,
                              dataPagamento: '',
                              horarioInicioPagamento: '08:00',
                              horarioFimPagamento: '08:00'
                            })}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-black text-[8px] uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                          >
                            <Calendar size={10} /> Definir Data
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Escalado (Trabalha)</span>
                          <span className="text-xs font-bold text-slate-700">{u.volta.escaladoName}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Substituto (Folga)</span>
                          <span className="text-xs font-bold text-slate-700">{u.volta.substitutoName}</span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Data / Horário</span>
                        {u.volta.data === '1970-01-01' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-wider animate-pulse mt-1">
                            ⚠️ A Pagar (Definir)
                          </span>
                        ) : (
                          <>
                            <span className="block text-xs font-bold text-slate-800">
                              {new Date(u.volta.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {u.volta.horarioInicio}h → {u.volta.horarioFim}h
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 bg-slate-50 flex items-center justify-center text-slate-400 text-xs font-bold italic">
                      Sem devolução casada.
                    </div>
                  )}
                  
                </div>
              </div>
            );
          })}
          
          {/* Footer count */}
          <div className="px-6 py-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {filteredUnifiedSwaps.length} solicitação{filteredUnifiedSwaps.length !== 1 ? 'ões casadas' : 'ão casada'}
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
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Preencha os dados da troca</p>
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

                {/* Escalado (com Autocomplete) */}
                <div className="space-y-1.5" ref={escaladoDropdownRef}>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Escalado *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Digite para buscar o escalado..."
                      value={escaladoSearch}
                      onChange={handleEscaladoSearchChange}
                      onFocus={() => setIsEscaladoDropdownOpen(true)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                    />
                    
                    {formData.escaladoId ? (
                      <button
                        type="button"
                        onClick={handleClearEscaladoSelection}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                        title="Limpar seleção"
                      >
                        <X size={16} />
                      </button>
                    ) : (
                      <ArrowUpDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    )}

                    <input type="hidden" value={formData.escaladoId} required />

                    {/* Floating Dropdown Menu */}
                    {isEscaladoDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[1200] max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredEscalados.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                            Nenhum militar encontrado
                          </div>
                        ) : (
                          filteredEscalados.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSelectEscalado(p)}
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

                {/* Checkbox Devolução */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={informarPagamentoAgora}
                      onChange={e => setInformarPagamentoAgora(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Informar devolução de serviço agora</span>
                  </label>
                </div>

                {/* Campos de Devolução Condicionais */}
                {informarPagamentoAgora && (
                  <div className="space-y-5 border-t border-slate-100 pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Data da Devolução *</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                        <input
                          type="date"
                          required={informarPagamentoAgora}
                          value={formData.dataPagamento}
                          onChange={e => setFormData({ ...formData, dataPagamento: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Horário de Início (Devolução) *</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                          <input
                            type="time"
                            required={informarPagamentoAgora}
                            value={formData.horarioInicioPagamento}
                            onChange={e => setFormData({ ...formData, horarioInicioPagamento: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Horário de Fim (Devolução) *</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                          <input
                            type="time"
                            required={informarPagamentoAgora}
                            value={formData.horarioFimPagamento}
                            onChange={e => setFormData({ ...formData, horarioFimPagamento: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                  { label: 'Data',       value: evaluationModal.swap.data ? new Date(evaluationModal.swap.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'A definir' },
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
                <p className="text-slate-500 text-sm mt-2 font-medium">
                  {currentUser.isAdmin
                    ? 'Por favor, informe a justificativa ou motivo para cancelar esta troca de serviço.'
                    : 'Por favor, informe opcionalmente o motivo para cancelar sua solicitação em aberto.'}
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">
                  Motivo do Cancelamento {currentUser.isAdmin && '*'}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder={currentUser.isAdmin ? "Escreva o motivo obrigatório do cancelamento..." : "Escreva o motivo do cancelamento (opcional)..."}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => { setCancelSwapId(null); setCancelReason(''); }} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Voltar</button>
                <button onClick={confirmCancel} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95">Confirmar Cancelamento</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL — Recusa do Substituto (Justificativa)
      ════════════════════════════════════════ */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[4000] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <XCircle size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Recusar Solicitação?</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">Por favor, informe a justificativa ou motivo para recusar esta troca de serviço.</p>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Motivo da Recusa *</label>
                <textarea
                  value={rejectModal.reason}
                  onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="Escreva o motivo da recusa..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-medium text-sm resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setRejectModal({ isOpen: false, swapId: null, reason: '' })} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Voltar</button>
                <button onClick={handleReject} className="flex-1 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95">Confirmar Recusa</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL — Confirmação de Aceite pelo Substituto
      ════════════════════════════════════════ */}
      {acceptModal.isOpen && acceptModal.swap && (
        <div className="fixed inset-0 bg-slate-950/80 z-[4000] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Aceitar Troca de Serviço?</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">Você está assumindo o compromisso de tirar o serviço indicado na escala abaixo no lugar do militar solicitante.</p>
              </div>
              
              {/* Detalhes da Troca */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5 text-left">
                {[
                  { label: 'Escalado',   value: acceptModal.swap.escaladoName },
                  { label: 'Substituto', value: acceptModal.swap.substitutoName },
                  { label: 'Função',     value: acceptModal.swap.funcao },
                  { label: 'Data',       value: acceptModal.swap.data ? new Date(acceptModal.swap.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'A definir' },
                  { label: 'Horário',    value: `${acceptModal.swap.horarioInicio}h → ${acceptModal.swap.horarioFim}h` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
                    <span className="text-xs font-bold text-slate-800 text-right">{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setAcceptModal({ isOpen: false, swap: null })} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Voltar</button>
                <button onClick={confirmAccept} className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95">Confirmar Aceite</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          MODAL — Definir/Editar Devolução
      ════════════════════════════════════════ */}
      {paymentModal.isOpen && paymentModal.swap && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-100 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2.5 rounded-xl shadow-md shadow-blue-600/20 text-white">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase">Informar Devolução</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Pagamento de Horas para o Substituto</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModal({ isOpen: false, swap: null, dataPagamento: '', horarioInicioPagamento: '08:00', horarioFimPagamento: '08:00' })}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdatePayment} className="space-y-5 p-6">
              {/* Resumo da Troca original */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1.5 mb-1.5">Troca Original</p>
                <div className="flex justify-between">
                  <span className="text-slate-400">Escalado:</span>
                  <span className="font-bold text-slate-800">{paymentModal.swap.escaladoName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Substituto:</span>
                  <span className="font-bold text-slate-800">{paymentModal.swap.substitutoName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Função/Plantão:</span>
                  <span className="font-bold text-slate-800">
                    {paymentModal.swap.funcao} em {paymentModal.swap.data ? new Date(paymentModal.swap.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'A definir'} ({paymentModal.swap.horarioInicio && paymentModal.swap.horarioFim ? `${paymentModal.swap.horarioInicio}h → ${paymentModal.swap.horarioFim}h` : 'Horário a definir'})
                  </span>
                </div>
              </div>

              {/* Data da Devolução */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Data da Devolução *</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                  <input
                    type="date"
                    required
                    value={paymentModal.dataPagamento}
                    onChange={e => setPaymentModal({ ...paymentModal, dataPagamento: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                  />
                </div>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Horário de Início *</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <input
                      type="time"
                      required
                      value={paymentModal.horarioInicioPagamento}
                      onChange={e => setPaymentModal({ ...paymentModal, horarioInicioPagamento: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Horário de Fim *</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <input
                      type="time"
                      required
                      value={paymentModal.horarioFimPagamento}
                      onChange={e => setPaymentModal({ ...paymentModal, horarioFimPagamento: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModal({ isOpen: false, swap: null, dataPagamento: '', horarioInicioPagamento: '08:00', horarioFimPagamento: '08:00' })}
                  className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-200 active:scale-95 flex items-center gap-2 disabled:opacity-60"
                >
                  {savingPayment ? <><Loader2 className="animate-spin" size={15} /> Salvando...</> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REPORT DOCUMENT ── */}
      {showReport && (
        <ServiceSwapReport
          swaps={enrichedSwaps}
          currentUser={currentUser}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default ServiceSwapManager;
