import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Search, Calendar, ChevronRight, X, AlertTriangle, User, ShieldAlert, Award, ArrowRight, ArrowLeft, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { getPipeline, createPipelineLead, updatePipelineLead, deletePipelineLead, getClientes, createCliente } from '../services/supabaseService';
import { PipelineLead, Cliente } from '../types';

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
    decisor_nome: '',
    campeao_interno_nome: '',
    proxima_acao: '',
    data_proxima_acao: '',
    probabilidade: 50,
    observacoes: ''
  });

  // Modal de Detalhe Completo do Lead
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<PipelineLead | null>(null);

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
        probabilidade: Number(leadForm.probabilidade)
      };

      if (editingLead) {
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

      {/* Quadro Kanban (Scroll horizontal) */}
      <div className="flex gap-4 overflow-x-auto pb-4 kanban-scroll font-sans min-h-[60vh]">
        {ETAPAS.map(etapa => {
          const etapaLeads = filteredLeads.filter(l => l.etapa === etapa);
          const totalEtapa = etapaLeads.reduce((acc, curr) => acc + Number(curr.valor_estimado || 0), 0);
          
          return (
            <div
              key={etapa}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, etapa)}
              className="w-80 shrink-0 bg-mtabi-card border border-mtabi-border rounded-2xl flex flex-col p-4 space-y-3"
            >
              {/* Cabeçalho da coluna */}
              <div className="flex justify-between items-center border-b border-mtabi-border pb-2">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      etapa === 'Fechado-Ganho' ? 'bg-mtabi-success' :
                      etapa === 'Fechado-Perdido' ? 'bg-mtabi-error' :
                      etapa === 'Em negociação' ? 'bg-mtabi-yellow' : 'bg-mtabi-info'
                    }`}></span>
                    {etapa}
                  </h3>
                  <span className="text-[9px] text-mtabi-muted font-semibold tracking-wider">
                    {etapaLeads.length} {etapaLeads.length === 1 ? 'negociação' : 'negociações'}
                  </span>
                </div>
                <span className="text-xs font-bold text-white font-mono">
                  R$ {totalEtapa.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
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

      {/* MODAL: Visualizar Detalhes e Mover Etapas */}
      {selectedLead && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                NEGOCIAÇÃO COMERCIAL
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openEditLeadModal(selectedLead)}
                  className="p-1.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white hover:text-mtabi-yellow rounded-lg transition-colors cursor-pointer"
                  title="Editar Lançamento"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={() => setLeadToDelete(selectedLead)}
                  className="p-1.5 bg-mtabi-bg hover:bg-mtabi-error/10 border border-mtabi-border text-white hover:text-mtabi-error rounded-lg transition-colors cursor-pointer"
                  title="Excluir Lançamento"
                >
                  <Trash2 size={12} />
                </button>
                <button onClick={() => setSelectedLead(null)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Resumo do Lead */}
              <div>
                <span className="text-[10px] text-mtabi-yellow font-bold uppercase tracking-wider block">Lead Comercial</span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display mt-0.5">
                  {selectedLead.cliente?.nome_empresa || selectedLead.nome_lead || 'Sem Nome'}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${ETAPA_COLORS[selectedLead.etapa].text} ${ETAPA_COLORS[selectedLead.etapa].bg}`}>
                    {selectedLead.etapa}
                  </span>
                  <span className="text-mtabi-muted">•</span>
                  <span className="text-xs text-white font-mono font-bold">
                    Est. {Number(selectedLead.valor_estimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              {/* Informações da Oportunidade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-mtabi-bg border border-mtabi-border p-3.5 rounded-xl">
                  <span className="text-[9px] text-mtabi-muted uppercase tracking-wider block">Decisor principal</span>
                  <span className="text-xs text-white font-bold mt-1 block">{selectedLead.decisor_nome || 'Não mapeado'}</span>
                </div>
                <div className="bg-mtabi-bg border border-mtabi-border p-3.5 rounded-xl">
                  <span className="text-[9px] text-mtabi-muted uppercase tracking-wider block">Facilitador interno</span>
                  <span className="text-xs text-white font-bold mt-1 block">{selectedLead.campeao_interno_nome || 'Não mapeado'}</span>
                </div>
              </div>

              {/* Ação Pendente */}
              <div className="bg-mtabi-bg/50 border border-mtabi-border p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-[10px] text-mtabi-muted uppercase font-bold tracking-wider">
                  <span>Próxima Ação Agendada</span>
                  {selectedLead.data_proxima_acao && (
                    <span className="text-white font-mono">{new Date(selectedLead.data_proxima_acao).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
                <p className="text-xs text-white font-bold leading-relaxed">{selectedLead.proxima_acao || 'Nenhuma ação programada'}</p>
              </div>

              {/* Notas e Observações */}
              {selectedLead.observacoes && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1">Observações da Negociação</h4>
                  <p className="text-xs text-mtabi-text bg-mtabi-bg/30 border border-mtabi-border p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                    {selectedLead.observacoes}
                  </p>
                </div>
              )}

              {/* Alterar Etapa do Funil */}
              <div className="border-t border-mtabi-border pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">Alterar Etapa do Funil</h4>
                <div className="flex flex-wrap gap-1.5">
                  {ETAPAS.map(etapa => (
                    <button
                      key={etapa}
                      disabled={selectedLead.etapa === etapa}
                      onClick={() => moveLeadStage(selectedLead, etapa)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                        selectedLead.etapa === etapa
                          ? 'bg-mtabi-yellow text-black border-mtabi-yellow'
                          : 'bg-mtabi-bg text-white border-mtabi-border hover:border-mtabi-muted'
                      }`}
                    >
                      {etapa}
                    </button>
                  ))}
                </div>
              </div>
            </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Valor Comercial Estimado (R$)
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
                    Etapa Atual
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Nome do Decisor (Contato)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Diretor de Produto"
                    value={leadForm.decisor_nome}
                    onChange={(e) => setLeadForm({ ...leadForm, decisor_nome: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Campeão Interno (Facilitador)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Desenvolvedor Principal"
                    value={leadForm.campeao_interno_nome}
                    onChange={(e) => setLeadForm({ ...leadForm, campeao_interno_nome: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Data da Próxima Ação
                  </label>
                  <input
                    type="date"
                    value={leadForm.data_proxima_acao}
                    onChange={(e) => setLeadForm({ ...leadForm, data_proxima_acao: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Probabilidade de Fechamento ({leadForm.probabilidade}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={leadForm.probabilidade}
                    onChange={(e) => setLeadForm({ ...leadForm, probabilidade: Number(e.target.value) })}
                    className="w-full h-2 bg-mtabi-bg border border-mtabi-border rounded-xl appearance-none cursor-pointer accent-mtabi-yellow mt-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Próxima Ação (Resumo)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ligar segunda-feira para negociar proposta"
                  value={leadForm.proxima_acao}
                  onChange={(e) => setLeadForm({ ...leadForm, proxima_acao: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Observações Gerais da Negociação
                </label>
                <textarea
                  rows={3}
                  placeholder="Anotações comerciais, concorrência, dores do cliente..."
                  value={leadForm.observacoes}
                  onChange={(e) => setLeadForm({ ...leadForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white resize-none"
                />
              </div>

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
