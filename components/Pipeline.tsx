import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Search, Calendar, ChevronRight, X, AlertTriangle, User, ShieldAlert, Award, ArrowRight, ArrowLeft, MoreVertical, Edit2, Trash2, ExternalLink, Link } from 'lucide-react';
import { getPipeline, createPipelineLead, updatePipelineLead, deletePipelineLead, getClientes, createCliente, getPipelineAcoesHistorico, createPipelineAcaoHistorico, deletePipelineAcaoHistorico } from '../services/supabaseService';
import { PipelineLead, Cliente, PipelineAcaoHistorico } from '../types';
import { formatDateBR } from '../utils/timeUtils';

const ETAPAS = [
  'Primeiro contato',
  'Proposta enviada',
  'Em negociação',
  'Aguardando decisão',
  'Fechado-Ganho',
  'Fechado-Perdido'
] as const;

type EtapaType = typeof ETAPAS[number];

const ETAPA_COLORS: Record<EtapaType, { bg: string; text: string; border: string }> = {
  'Primeiro contato': { bg: 'bg-zinc-900/40', text: 'text-zinc-400', border: 'border-zinc-800' },
  'Proposta enviada': { bg: 'bg-blue-950/30', text: 'text-mtabi-info', border: 'border-blue-900/30' },
  'Em negociação': { bg: 'bg-amber-950/30', text: 'text-mtabi-yellow', border: 'border-amber-900/30' },
  'Aguardando decisão': { bg: 'bg-purple-950/30', text: 'text-purple-400', border: 'border-purple-900/30' },
  'Fechado-Ganho': { bg: 'bg-emerald-950/30', text: 'text-mtabi-success', border: 'border-emerald-900/30' },
  'Fechado-Perdido': { bg: 'bg-red-950/30', text: 'text-mtabi-error', border: 'border-red-900/30' }
};

const Pipeline: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados CRUD Lead
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<PipelineLead | null>(null);
  const [leadForm, setLeadForm] = useState({
    cliente_id: '',
    nome_lead: '',
    etapa: 'Primeiro contato' as EtapaType,
    valor_estimado: 0,
    valor_recorrente: 0,
    link_proposta: '',
    decisor_nome: '',
    campeao_interno_nome: '',
    proxima_acao: '',
    data_proxima_acao: '',
    probabilidade: 50,
    observacoes: ''
  });

  // Modal de Detalhe Completo do Lead
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [selectedLeadHistory, setSelectedLeadHistory] = useState<PipelineAcaoHistorico[]>([]);
  const [leadToDelete, setLeadToDelete] = useState<PipelineLead | null>(null);

  // Drawer tabs and inline action
  const [drawerTab, setDrawerTab] = useState<'visao' | 'historico'>('visao');
  const [drawerAcaoText, setDrawerAcaoText] = useState('');
  const [drawerAcaoDate, setDrawerAcaoDate] = useState('');
  const [drawerProbabilidade, setDrawerProbabilidade] = useState(50);
  const [drawerLinkProposta, setDrawerLinkProposta] = useState('');
  const [drawerObservacoes, setDrawerObservacoes] = useState('');
  const [drawerObsDirty, setDrawerObsDirty] = useState(false);
  const [savingAcao, setSavingAcao] = useState(false);
  const [savingObs, setSavingObs] = useState(false);

  const loadLeadHistory = async (leadId: string) => {
    try {
      const hist = await getPipelineAcoesHistorico(leadId);
      setSelectedLeadHistory(hist);
    } catch (err) {
      console.error('Erro ao carregar histórico de ações:', err);
    }
  };

  useEffect(() => {
    if (selectedLead?.id) {
      loadLeadHistory(selectedLead.id);
      setDrawerProbabilidade(Number(selectedLead.probabilidade || 50));
      setDrawerLinkProposta(selectedLead.link_proposta || '');
      setDrawerObservacoes(selectedLead.observacoes || '');
      setDrawerObsDirty(false);
      setDrawerAcaoText('');
      setDrawerAcaoDate('');
      setDrawerTab('visao');
    } else {
      setSelectedLeadHistory([]);
    }
  }, [selectedLead?.id]);

  // Salva link da proposta ao sair do campo
  const handleDrawerLinkSave = async () => {
    if (!selectedLead) return;
    if (drawerLinkProposta === (selectedLead.link_proposta || '')) return;
    try {
      await updatePipelineLead(selectedLead.id, { link_proposta: drawerLinkProposta || null });
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar link:', err);
    }
  };

  // Salva observações
  const handleDrawerObsSave = async () => {
    if (!selectedLead) return;
    setSavingObs(true);
    try {
      await updatePipelineLead(selectedLead.id, { observacoes: drawerObservacoes || null });
      setDrawerObsDirty(false);
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar observações:', err);
    } finally {
      setSavingObs(false);
    }
  };

  // Registrar nova ação diretamente pelo drawer
  const handleDrawerAcaoSubmit = async () => {
    if (!selectedLead || !drawerAcaoText.trim()) return;
    setSavingAcao(true);
    try {
      // Arquiva a ação atual no histórico
      if (selectedLead.proxima_acao) {
        await createPipelineAcaoHistorico(
          selectedLead.id,
          selectedLead.proxima_acao,
          selectedLead.data_proxima_acao || new Date().toISOString().split('T')[0]
        );
      }
      // Salva a nova ação como próxima ação
      await updatePipelineLead(selectedLead.id, {
        proxima_acao: drawerAcaoText.trim(),
        data_proxima_acao: drawerAcaoDate || null
      });
      setDrawerAcaoText('');
      setDrawerAcaoDate('');
      await loadData();
      await loadLeadHistory(selectedLead.id);
    } catch (err) {
      console.error('Erro ao registrar ação:', err);
    } finally {
      setSavingAcao(false);
    }
  };

  // Salva probabilidade no drawer ao soltar o slider
  const handleDrawerProbabilidadeSave = async (value: number) => {
    if (!selectedLead) return;
    try {
      await updatePipelineLead(selectedLead.id, { probabilidade: value });
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar probabilidade:', err);
    }
  };

  // Conversão de Lead Ganho em Cliente
  const [conversionLead, setConversionLead] = useState<PipelineLead | null>(null);
  const [conversionForm, setConversionForm] = useState({
    nome_empresa: '',
    nome_contato_principal: '',
    nome_contato_interno: '',
    segmento: 'Tecnologia',
    status: 'Ativo' as Cliente['status'],
    tipo_relacao: 'Projeto único' as Cliente['tipo_relacao'],
    observacoes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [p, c] = await Promise.all([
        getPipeline(),
        getClientes()
      ]);
      setLeads(p);
      setClientes(c);
      
      if (selectedLead) {
        const updated = p.find(item => item.id === selectedLead.id);
        setSelectedLead(updated || null);
      }
    } catch (e) {
      console.error('Erro ao carregar Pipeline:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewLeadModal = () => {
    setEditingLead(null);
    setLeadForm({
      cliente_id: '',
      nome_lead: '',
      etapa: 'Primeiro contato',
      valor_estimado: 0,
      valor_recorrente: 0,
      link_proposta: '',
      decisor_nome: '',
      campeao_interno_nome: '',
      proxima_acao: '',
      data_proxima_acao: '',
      probabilidade: 50,
      observacoes: ''
    });
    setIsLeadModalOpen(true);
  };

  const openEditLeadModal = (lead: PipelineLead) => {
    setEditingLead(lead);
    setLeadForm({
      cliente_id: lead.cliente_id || '',
      nome_lead: lead.nome_lead || '',
      etapa: lead.etapa,
      valor_estimado: Number(lead.valor_estimado),
      valor_recorrente: Number(lead.valor_recorrente || 0),
      link_proposta: lead.link_proposta || '',
      decisor_nome: lead.decisor_nome || '',
      campeao_interno_nome: lead.campeao_interno_nome || '',
      proxima_acao: lead.proxima_acao || '',
      data_proxima_acao: lead.data_proxima_acao || '',
      probabilidade: Number(lead.probabilidade || 50),
      observacoes: lead.observacoes || ''
    });
    setIsLeadModalOpen(true);
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...leadForm,
        cliente_id: leadForm.cliente_id || undefined,
        nome_lead: leadForm.cliente_id ? undefined : leadForm.nome_lead, // se tem cliente, zera nome_lead
        valor_estimado: Number(leadForm.valor_estimado),
        valor_recorrente: Number(leadForm.valor_recorrente) || 0,
        link_proposta: leadForm.link_proposta || null,
        data_proxima_acao: leadForm.data_proxima_acao || null,
        probabilidade: Number(leadForm.probabilidade)
      };

      if (editingLead) {
        if (editingLead.proxima_acao && 
           (editingLead.proxima_acao !== leadForm.proxima_acao || 
            editingLead.data_proxima_acao !== leadForm.data_proxima_acao)) {
          try {
            await createPipelineAcaoHistorico(
              editingLead.id,
              editingLead.proxima_acao,
              editingLead.data_proxima_acao || new Date().toISOString().split('T')[0]
            );
          } catch (histErr) {
            console.error('Erro ao arquivar ação antiga no histórico:', histErr);
          }
        }
        await updatePipelineLead(editingLead.id, payload);
      } else {
        await createPipelineLead(payload);
      }
      setIsLeadModalOpen(false);
      setSelectedLead(null);
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
    }
  };

  // Mover etapa rápido
  const moveLeadStage = async (lead: PipelineLead, novaEtapa: EtapaType) => {
    try {
      await updatePipelineLead(lead.id, { etapa: novaEtapa });
      await loadData();
      
      // Abre prompt de conversão se moveu para "Fechado-Ganho" e o lead não é cliente ainda
      if (novaEtapa === 'Fechado-Ganho' && !lead.cliente_id) {
        setConversionLead(lead);
        setConversionForm({
          nome_empresa: lead.nome_lead || '',
          nome_contato_principal: lead.decisor_nome || '',
          nome_contato_interno: lead.campeao_interno_nome || '',
          segmento: 'Tecnologia',
          status: 'Ativo',
          tipo_relacao: 'Projeto único',
          observacoes: `Lead convertido do funil de vendas. Observações anteriores: ${lead.observacoes || 'Nenhuma'}`
        });
      }
    } catch (e) {
      console.error('Erro ao mover lead:', e);
    }
  };

  const handleConversionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversionLead) return;
    try {
      // 1. Cria o cliente no banco
      const novoCliente = await createCliente(conversionForm);
      
      // 2. Vincula o lead ao cliente recém-criado
      await updatePipelineLead(conversionLead.id, { cliente_id: novoCliente.id });
      
      setConversionLead(null);
      await loadData();
    } catch (e) {
      console.error('Erro ao converter lead para cliente:', e);
    }
  };

  const handleDeleteLead = async () => {
    if (!leadToDelete) return;
    try {
      await deletePipelineLead(leadToDelete.id);
      setLeadToDelete(null);
      setSelectedLead(null);
      await loadData();
    } catch (e) {
      console.error('Erro ao excluir lead:', e);
    }
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, lead: PipelineLead) => {
    e.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, etapa: EtapaType) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.etapa !== etapa) {
      await moveLeadStage(lead, etapa);
    }
  };

  // Filtragem dos leads
  const filteredLeads = leads.filter(l => {
    const nome = l.nome_lead || l.cliente?.nome_empresa || '';
    const proxima = l.proxima_acao || '';
    const desc = l.observacoes || '';
    return nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proxima.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="text-mtabi-yellow" size={28} />
            PIPELINE COMERCIAL (CRM)
          </h1>
          <p className="text-sm text-mtabi-muted">Acompanhe contatos, propostas enviadas e negociações de serviços.</p>
        </div>
        <button
          onClick={openNewLeadModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-3 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-mtabi-yellow/20 cursor-pointer"
        >
          <Plus size={16} /> ADICIONAR NEGOCIAÇÃO
        </button>
      </div>

      {/* Caixa de Busca */}
      <div className="bg-mtabi-card border border-mtabi-border p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center font-sans">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 text-mtabi-muted" size={16} />
          <input
            type="text"
            placeholder="Buscar por lead, ação ou observação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs focus:outline-none focus:border-mtabi-yellow text-white placeholder-mtabi-muted"
          />
        </div>
        <div className="text-xs text-mtabi-muted font-bold uppercase tracking-widest sm:ml-auto select-none">
          Total Estimado no Funil: <span className="text-mtabi-yellow">
            {filteredLeads
              .filter(l => !['Fechado-Ganho', 'Fechado-Perdido'].includes(l.etapa))
              .reduce((acc, curr) => acc + Number(curr.valor_estimado || 0), 0)
              .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {/* Quadro Kanban - colunas responsivas */}
      <div className="flex gap-3 pb-4 kanban-scroll font-sans min-h-[60vh] overflow-x-auto">
        {ETAPAS.map(etapa => {
          const etapaLeads = filteredLeads.filter(l => l.etapa === etapa);
          const totalEtapa = etapaLeads.reduce((acc, curr) => acc + Number(curr.valor_estimado || 0), 0);
          
          return (
            <div
              key={etapa}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, etapa)}
              className="flex-1 min-w-[200px] max-w-[320px] shrink-0 bg-mtabi-card border border-mtabi-border rounded-2xl flex flex-col p-3.5 space-y-3"
            >
              {/* Cabeçalho da coluna */}
              <div className="flex justify-between items-center border-b border-mtabi-border pb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      etapa === 'Fechado-Ganho' ? 'bg-mtabi-success' :
                      etapa === 'Fechado-Perdido' ? 'bg-mtabi-error' :
                      etapa === 'Em negociação' ? 'bg-mtabi-yellow' :
                      etapa === 'Aguardando decisão' ? 'bg-purple-400' :
                      etapa === 'Proposta enviada' ? 'bg-mtabi-info' :
                      'bg-zinc-400'
                    }`}></span>
                    <span className="truncate">{etapa}</span>
                  </h3>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[9px] text-mtabi-muted font-semibold tracking-wider">
                      {etapaLeads.length} {etapaLeads.length === 1 ? 'negociação' : 'negociações'}
                    </span>
                    <span className="text-[10px] font-bold text-white font-mono ml-2">
                      R$ {totalEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Cards da Etapa */}
              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[50vh] pr-1">
                {etapaLeads.map(lead => {
                  const diasSemAtualizacao = lead.data_ultima_atualizacao
                    ? Math.floor((new Date().getTime() - new Date(lead.data_ultima_atualizacao).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead)}
                      onClick={() => setSelectedLead(lead)}
                      className="p-3.5 bg-mtabi-bg hover:bg-mtabi-border/20 border border-mtabi-border hover:border-mtabi-yellow/30 rounded-xl cursor-grab active:cursor-grabbing transition-all space-y-3 group"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="text-xs font-bold text-white group-hover:text-mtabi-yellow transition-colors leading-snug">
                          {lead.cliente?.nome_empresa || lead.nome_lead || 'Sem Nome'}
                        </h4>
                        <span className="text-[9px] font-bold text-mtabi-yellow bg-mtabi-yellow/10 px-1.5 py-0.5 rounded shrink-0">
                          {lead.probabilidade}%
                        </span>
                      </div>

                      {lead.proxima_acao && (
                        <p className="text-[10px] text-mtabi-muted leading-relaxed line-clamp-1">
                          Ação: <span className="text-white font-medium">{lead.proxima_acao}</span>
                        </p>
                      )}

                      <div className="flex justify-between items-center text-[9px] text-mtabi-muted pt-2 border-t border-mtabi-border/40">
                        <span className="font-bold text-white font-mono">
                          {Number(lead.valor_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        
                        <span>
                          {diasSemAtualizacao === 0 ? 'Hoje' : `Há ${diasSemAtualizacao} dias`}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {etapaLeads.length === 0 && (
                  <div className="text-center py-8 text-[11px] text-mtabi-muted border border-dashed border-mtabi-border/60 rounded-xl select-none">
                    Arraste cards para cá
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DRAWER: Detalhes e Trabalho do Lead */}
      {selectedLead && (
        <div className="fixed inset-0 z-[1100] flex justify-end bg-black/60 backdrop-blur-[2px]" onClick={() => setSelectedLead(null)}>
          <div
            className="bg-mtabi-card border-l border-mtabi-border w-full max-w-lg h-full shadow-2xl flex flex-col font-sans animate-slideInRight"
            onClick={(e) => e.stopPropagation()}
          >
            {/* === CABEÇALHO === */}
            <div className="p-4 border-b border-mtabi-border shrink-0 bg-[#13151A]/70">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-mtabi-yellow font-bold uppercase tracking-wider">Lead Comercial</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditLeadModal(selectedLead)}
                    className="p-1.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white hover:text-mtabi-yellow rounded-lg transition-colors cursor-pointer"
                    title="Editar dados básicos"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => setLeadToDelete(selectedLead)}
                    className="p-1.5 bg-mtabi-bg hover:bg-mtabi-error/10 border border-mtabi-border text-white hover:text-mtabi-error rounded-lg transition-colors cursor-pointer"
                    title="Excluir negociação"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button onClick={() => setSelectedLead(null)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer ml-0.5">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <h2 className="text-lg font-extrabold text-white font-display leading-tight">
                {selectedLead.cliente?.nome_empresa || selectedLead.nome_lead || 'Sem Nome'}
              </h2>

              {/* Linha 1: etapa + valores */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${ETAPA_COLORS[selectedLead.etapa].text} ${ETAPA_COLORS[selectedLead.etapa].bg} border ${ETAPA_COLORS[selectedLead.etapa].border}`}>
                  {selectedLead.etapa}
                </span>
                <span className="text-mtabi-muted text-[10px]">•</span>
                <span className="text-[11px] text-white font-mono font-bold">
                  {Number(selectedLead.valor_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                </span>
                {selectedLead.valor_recorrente && Number(selectedLead.valor_recorrente) > 0 && (
                  <>
                    <span className="text-mtabi-muted text-[10px]">+</span>
                    <span className="text-[11px] text-mtabi-yellow font-mono font-bold">
                      {Number(selectedLead.valor_recorrente).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}/mês
                    </span>
                  </>
                )}
              </div>

              {/* Linha 2: Decisor + Facilitador compactos */}
              <div className="flex items-center gap-3 mt-2">
                {selectedLead.decisor_nome && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-mtabi-muted uppercase tracking-wider">Decisor:</span>
                    <span className="text-[10px] text-white font-bold truncate max-w-[120px]">{selectedLead.decisor_nome}</span>
                  </div>
                )}
                {selectedLead.decisor_nome && selectedLead.campeao_interno_nome && (
                  <span className="text-mtabi-border">|</span>
                )}
                {selectedLead.campeao_interno_nome && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-mtabi-muted uppercase tracking-wider">Facilitador:</span>
                    <span className="text-[10px] text-white font-bold truncate max-w-[120px]">{selectedLead.campeao_interno_nome}</span>
                  </div>
                )}
                {!selectedLead.decisor_nome && !selectedLead.campeao_interno_nome && (
                  <span className="text-[10px] text-mtabi-muted/60 italic">Decisor/Facilitador não mapeados — edite para preencher</span>
                )}
              </div>

              {/* Abas */}
              <div className="flex gap-1 mt-3">
                <button
                  onClick={() => setDrawerTab('visao')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                    drawerTab === 'visao'
                      ? 'bg-mtabi-yellow text-black'
                      : 'bg-mtabi-bg/60 text-mtabi-muted hover:text-white border border-mtabi-border'
                  }`}
                >
                  Visão Geral
                </button>
                <button
                  onClick={() => setDrawerTab('historico')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer relative ${
                    drawerTab === 'historico'
                      ? 'bg-mtabi-yellow text-black'
                      : 'bg-mtabi-bg/60 text-mtabi-muted hover:text-white border border-mtabi-border'
                  }`}
                >
                  Histórico
                  {selectedLeadHistory.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-mtabi-yellow text-black text-[8px] font-bold rounded-full flex items-center justify-center">
                      {selectedLeadHistory.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* === ABA: VISÃO GERAL (sem scroll) === */}
            {drawerTab === 'visao' && (
              <div className="p-4 flex flex-col gap-3 flex-1 overflow-hidden">

                {/* Probabilidade — linha compacta com slider visível */}
                <div className="flex items-center gap-3 bg-mtabi-bg border border-mtabi-border px-3 py-2 rounded-xl shrink-0">
                  <span className="text-[10px] text-mtabi-muted uppercase tracking-wider font-bold whitespace-nowrap">Prob. Fechamento</span>
                  <div className="flex-1 relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={drawerProbabilidade}
                      onChange={(e) => setDrawerProbabilidade(Number(e.target.value))}
                      onMouseUp={(e) => handleDrawerProbabilidadeSave(Number((e.target as HTMLInputElement).value))}
                      onTouchEnd={(e) => handleDrawerProbabilidadeSave(Number((e.target as HTMLInputElement).value))}
                      className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
                      style={{
                        background: `linear-gradient(to right, ${
                          drawerProbabilidade >= 75 ? '#4ade80' :
                          drawerProbabilidade >= 50 ? '#E8A33D' :
                          drawerProbabilidade >= 25 ? '#fb923c' : '#ef4444'
                        } ${drawerProbabilidade}%, #2a2d35 ${drawerProbabilidade}%)`,
                        accentColor: drawerProbabilidade >= 75 ? '#4ade80' : drawerProbabilidade >= 50 ? '#E8A33D' : drawerProbabilidade >= 25 ? '#fb923c' : '#ef4444'
                      }}
                    />
                  </div>
                  <span className={`text-sm font-extrabold font-mono min-w-[36px] text-right ${
                    drawerProbabilidade >= 75 ? 'text-mtabi-success' :
                    drawerProbabilidade >= 50 ? 'text-mtabi-yellow' :
                    drawerProbabilidade >= 25 ? 'text-amber-400' : 'text-mtabi-error'
                  }`}>{drawerProbabilidade}%</span>
                </div>

                {/* Próxima Ação Atual */}
                <div className="bg-mtabi-bg/50 border border-mtabi-border rounded-xl overflow-hidden shrink-0">
                  <div className="flex justify-between items-center px-3 py-1.5 border-b border-mtabi-border/50 bg-mtabi-bg/30">
                    <span className="text-[9px] text-mtabi-muted uppercase font-bold tracking-wider">Próxima Ação</span>
                    {selectedLead.data_proxima_acao && (
                      <span className="text-[9px] text-white font-mono bg-mtabi-bg px-1.5 py-0.5 rounded border border-mtabi-border">
                        {formatDateBR(selectedLead.data_proxima_acao)}
                      </span>
                    )}
                  </div>
                  <p className="px-3 py-2 text-xs text-white font-medium leading-snug line-clamp-2">
                    {selectedLead.proxima_acao || 'Nenhuma ação programada'}
                  </p>
                </div>

                {/* === REGISTRAR NOVA AÇÃO === */}
                <div className="border border-mtabi-yellow/30 bg-mtabi-yellow/5 rounded-xl p-3 space-y-2 shrink-0">
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-mtabi-yellow flex items-center gap-1">
                    <Plus size={10} /> Nova Ação
                  </h4>
                  <textarea
                    rows={2}
                    placeholder="Descreva a próxima ação..."
                    value={drawerAcaoText}
                    onChange={(e) => setDrawerAcaoText(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow text-white resize-none placeholder-mtabi-muted leading-snug"
                  />
                  <div className="flex gap-2 items-center">
                    <input
                      type="date"
                      value={drawerAcaoDate}
                      onChange={(e) => setDrawerAcaoDate(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow text-white"
                    />
                    <button
                      onClick={handleDrawerAcaoSubmit}
                      disabled={!drawerAcaoText.trim() || savingAcao}
                      className="px-3 py-1.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-[9px] font-bold uppercase tracking-wider rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all shrink-0"
                    >
                      {savingAcao ? '...' : 'Registrar'}
                    </button>
                  </div>
                </div>

                {/* Link Proposta (editável inline) */}
                <div className="shrink-0">
                  <label className="text-[9px] text-mtabi-muted uppercase tracking-wider font-bold block mb-1">Link da Proposta</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={drawerLinkProposta}
                      onChange={(e) => setDrawerLinkProposta(e.target.value)}
                      onBlur={handleDrawerLinkSave}
                      className="flex-1 px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow text-white"
                    />
                    {drawerLinkProposta && (
                      <a
                        href={drawerLinkProposta.startsWith('http') ? drawerLinkProposta : `https://${drawerLinkProposta}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-mtabi-yellow hover:text-white transition-colors shrink-0"
                        title="Abrir proposta"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Observações (editável inline com botão salvar dirty) */}
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] text-mtabi-muted uppercase tracking-wider font-bold">Observações da Negociação</label>
                    {drawerObsDirty && (
                      <button
                        onClick={handleDrawerObsSave}
                        disabled={savingObs}
                        className="text-[9px] font-bold uppercase tracking-wider text-black bg-mtabi-yellow hover:bg-mtabi-yellow/90 px-2 py-0.5 rounded-lg cursor-pointer disabled:opacity-50 transition-all"
                      >
                        {savingObs ? 'Salvando...' : 'Salvar'}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={drawerObservacoes}
                    onChange={(e) => { setDrawerObservacoes(e.target.value); setDrawerObsDirty(true); }}
                    placeholder="Anotações, concorrência, dores do cliente..."
                    className="flex-1 w-full px-2.5 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow text-white resize-none placeholder-mtabi-muted leading-relaxed"
                  />
                </div>

                {/* Mover no Funil */}
                <div className="border-t border-mtabi-border pt-3 shrink-0">
                  <div className="flex flex-wrap gap-1">
                    {ETAPAS.map(etapa => (
                      <button
                        key={etapa}
                        disabled={selectedLead.etapa === etapa}
                        onClick={() => moveLeadStage(selectedLead, etapa)}
                        className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                          selectedLead.etapa === etapa
                            ? `${ETAPA_COLORS[etapa].bg} ${ETAPA_COLORS[etapa].text} ${ETAPA_COLORS[etapa].border}`
                            : 'bg-mtabi-bg text-mtabi-muted border-mtabi-border hover:border-mtabi-muted hover:text-white'
                        }`}
                      >
                        {etapa}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === ABA: HISTÓRICO === */}
            {drawerTab === 'historico' && (
              <div className="p-5 overflow-y-auto flex-1 kanban-scroll">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-4">
                  Histórico de Ações Realizadas
                </h4>
                {selectedLeadHistory.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-mtabi-border/50 rounded-xl">
                    <Calendar size={28} className="text-mtabi-muted mx-auto mb-3 opacity-40" />
                    <p className="text-xs text-mtabi-muted">Nenhuma ação registrada ainda.</p>
                    <p className="text-[10px] text-mtabi-muted/60 mt-1">Registre ações na aba Visão Geral.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedLeadHistory.slice().reverse().map(h => (
                      <div key={h.id} className="p-3.5 bg-mtabi-bg/30 border border-mtabi-border/60 rounded-xl flex flex-col gap-1.5 relative group/hist">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-mtabi-muted font-bold font-mono uppercase tracking-wider bg-mtabi-bg px-2 py-0.5 rounded-lg border border-mtabi-border/40">
                            {formatDateBR(h.data_acao)}
                          </span>
                          <button
                            onClick={async () => {
                              if (confirm('Deseja excluir esta ação do histórico?')) {
                                try {
                                  await deletePipelineAcaoHistorico(h.id);
                                  setSelectedLeadHistory(prev => prev.filter(item => item.id !== h.id));
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            className="text-mtabi-muted hover:text-mtabi-error opacity-0 group-hover/hist:opacity-100 transition-opacity p-1 cursor-pointer rounded-lg hover:bg-mtabi-error/10"
                            title="Excluir"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <p className="text-xs text-mtabi-text leading-relaxed font-medium">{h.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Criar/Editar Formulário de Negociação */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {editingLead ? 'EDITAR LANÇAMENTO COMERCIAL' : 'NOVO LEAD COMERCIAL'}
              </h3>
              <button onClick={() => setIsLeadModalOpen(false)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleLeadSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Vincular Cliente Existente (Opcional)
                </label>
                <select
                  value={leadForm.cliente_id}
                  onChange={(e) => setLeadForm({ ...leadForm, cliente_id: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                >
                  <option value="">-- Lead sem Cliente Formalizado --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome_empresa}</option>
                  ))}
                </select>
              </div>

              {!leadForm.cliente_id && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Nome da Empresa Lead *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: StartUp Beta"
                    value={leadForm.nome_lead}
                    onChange={(e) => setLeadForm({ ...leadForm, nome_lead: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
              )}

              {/* Valores */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Valor Dev. Estimado (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={leadForm.valor_estimado || ''}
                    onChange={(e) => setLeadForm({ ...leadForm, valor_estimado: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Recorrente Mensal (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={leadForm.valor_recorrente || ''}
                    onChange={(e) => setLeadForm({ ...leadForm, valor_recorrente: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
              </div>

              {/* Somente para NOVO lead — etapa inicial */}
              {!editingLead && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Etapa Inicial
                  </label>
                  <select
                    value={leadForm.etapa}
                    onChange={(e) => setLeadForm({ ...leadForm, etapa: e.target.value as EtapaType })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white font-sans"
                  >
                    {ETAPAS.map(etapa => (
                      <option key={etapa} value={etapa}>{etapa}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Decisor e Campeão */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Decisor (Contato)
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do decisor"
                    value={leadForm.decisor_nome}
                    onChange={(e) => setLeadForm({ ...leadForm, decisor_nome: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Facilitador Interno
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do facilitador"
                    value={leadForm.campeao_interno_nome}
                    onChange={(e) => setLeadForm({ ...leadForm, campeao_interno_nome: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
              </div>

              {/* Link da Proposta */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Link da Proposta Comercial
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={leadForm.link_proposta}
                  onChange={(e) => setLeadForm({ ...leadForm, link_proposta: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Observações Gerais
                </label>
                <textarea
                  rows={3}
                  placeholder="Anotações comerciais, concorrência, dores do cliente..."
                  value={leadForm.observacoes}
                  onChange={(e) => setLeadForm({ ...leadForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white resize-none"
                />
              </div>

              {/* Somente para NOVO lead — ação inicial */}
              {!editingLead && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Primeira Ação Planejada
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ligar segunda-feira para apresentar proposta"
                    value={leadForm.proxima_acao}
                    onChange={(e) => setLeadForm({ ...leadForm, proxima_acao: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  {editingLead ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR NEGOCIAÇÃO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Conversão Automática Lead -> Cliente */}
      {conversionLead && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border bg-emerald-950/20 text-mtabi-success">
              <div className="flex items-center gap-2">
                <Award size={20} />
                <h3 className="text-sm font-bold uppercase tracking-wider">CONVERTER LEAD EM CLIENTE</h3>
              </div>
              <button onClick={() => setConversionLead(null)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleConversionSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <p className="text-xs text-mtabi-muted leading-relaxed">
                Parabéns pelo fechamento! Complete o cadastro abaixo para criar a conta oficial de cliente da <span className="text-white font-bold">{conversionLead.nome_lead}</span>.
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Nome da Empresa / Marca *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome oficial"
                  value={conversionForm.nome_empresa}
                  onChange={(e) => setConversionForm({ ...conversionForm, nome_empresa: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Contato Principal
                  </label>
                  <input
                    type="text"
                    value={conversionForm.nome_contato_principal}
                    onChange={(e) => setConversionForm({ ...conversionForm, nome_contato_principal: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Contato Interno
                  </label>
                  <input
                    type="text"
                    value={conversionForm.nome_contato_interno}
                    onChange={(e) => setConversionForm({ ...conversionForm, nome_contato_interno: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Segmento
                  </label>
                  <input
                    type="text"
                    value={conversionForm.segmento}
                    onChange={(e) => setConversionForm({ ...conversionForm, segmento: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Tipo de Relação *
                  </label>
                  <select
                    value={conversionForm.tipo_relacao}
                    onChange={(e) => setConversionForm({ ...conversionForm, tipo_relacao: e.target.value as any })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  >
                    <option value="Projeto único">Projeto único</option>
                    <option value="Consultoria recorrente">Consultoria recorrente</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setConversionLead(null)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Pular Por Enquanto
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  CRIAR CLIENTE OFICIAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {leadToDelete && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-md shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-mtabi-error mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">EXCLUIR NEGOCIAÇÃO</h3>
            </div>
            
            <p className="text-xs text-mtabi-muted leading-relaxed">
              Você está prestes a deletar permanentemente a negociação com <span className="text-white font-bold">{leadToDelete.nome_lead || leadToDelete.cliente?.nome_empresa}</span>.
              Esta ação removerá todos os prazos e ações programadas do pipeline comercial.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setLeadToDelete(null)}
                className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleDeleteLead}
                className="w-1/2 py-2.5 bg-mtabi-error hover:bg-mtabi-error/90 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CONFIRMAR EXCLUSÃO
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Pipeline;
