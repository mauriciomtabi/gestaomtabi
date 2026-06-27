import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Filter, Phone, User, Landmark, HelpCircle, Edit2, Trash2, Calendar, FileText, ChevronRight, X, AlertTriangle, ArrowUpRight, Upload } from 'lucide-react';
import { getClientes, createCliente, updateCliente, deleteCliente, getProjetos, createProjeto, getFinanceiroMovimentos, uploadClientLogo } from '../services/supabaseService';
import { Cliente, Projeto, FinanceiroMovimento } from '../types';

interface ClientesProps {
  onNavigateToProject?: (projectId: string) => void;
}

const Clientes: React.FC<ClientesProps> = ({ onNavigateToProject }) => {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [movimentos, setMovimentos] = useState<FinanceiroMovimento[]>([]);
  
  // Seleção e visualização de detalhes
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  
  // Busca e Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modais CRUD Cliente
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [clientForm, setClientForm] = useState({
    nome_empresa: '',
    logo_url: '',
    nome_contato_principal: '',
    nome_contato_interno: '',
    segmento: '',
    status: 'Ativo' as Cliente['status'],
    tipo_relacao: 'Projeto único' as Cliente['tipo_relacao'],
    observacoes: ''
  });

  // Modal para Criar Projeto DIRETO no Cliente
  const [isQuickProjectModalOpen, setIsQuickProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    nome_solucao: '',
    descricao: '',
    status: 'Em desenvolvimento' as Projeto['status'],
    link_acesso: '',
    ferramenta_dev_input: '',
    ferramenta_dev: [] as string[],
    banco_dados: '',
    repositorio_url: '',
    hospedagem_imagens: '',
    hospedagem_geral: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    valor_projeto: 0,
    valor_mensal: 0,
    observacoes: ''
  });

  // Modal de Confirmação de Exclusão
  const [clientToDelete, setClientToDelete] = useState<Cliente | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [c, p, m] = await Promise.all([
        getClientes(),
        getProjetos(),
        getFinanceiroMovimentos()
      ]);
      setClientes(c);
      setProjetos(p);
      setMovimentos(m);
      
      // Atualiza o cliente selecionado se aplicável
      if (selectedCliente) {
        const updated = c.find(item => item.id === selectedCliente.id);
        setSelectedCliente(updated || null);
      }
    } catch (e) {
      console.error('Erro ao carregar Clientes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewClientModal = () => {
    setEditingCliente(null);
    setClientForm({
      nome_empresa: '',
      logo_url: '',
      nome_contato_principal: '',
      nome_contato_interno: '',
      segmento: '',
      status: 'Ativo',
      tipo_relacao: 'Projeto único',
      observacoes: ''
    });
    setIsClientModalOpen(true);
  };

  const openEditClientModal = (c: Cliente) => {
    setEditingCliente(c);
    setClientForm({
      nome_empresa: c.nome_empresa,
      logo_url: c.logo_url || '',
      nome_contato_principal: c.nome_contato_principal || '',
      nome_contato_interno: c.nome_contato_interno || '',
      segmento: c.segmento || '',
      status: c.status,
      tipo_relacao: c.tipo_relacao,
      observacoes: c.observacoes || ''
    });
    setIsClientModalOpen(true);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalForm = { ...clientForm };
      
      if (editingCliente) {
        if (clientForm.logo_url && clientForm.logo_url.startsWith('data:')) {
          const uploadedUrl = await uploadClientLogo(editingCliente.id, clientForm.logo_url);
          if (uploadedUrl) {
            finalForm.logo_url = uploadedUrl;
          }
        }
        await updateCliente(editingCliente.id, finalForm);
      } else {
        const logoBase64 = clientForm.logo_url;
        finalForm.logo_url = '';
        const created = await createCliente(finalForm);
        
        if (logoBase64 && logoBase64.startsWith('data:')) {
          const uploadedUrl = await uploadClientLogo(created.id, logoBase64);
          if (uploadedUrl) {
            await updateCliente(created.id, { logo_url: uploadedUrl });
            created.logo_url = uploadedUrl;
          }
        }
        setSelectedCliente(created);
      }
      setIsClientModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setClientForm(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      await deleteCliente(clientToDelete.id);
      if (selectedCliente?.id === clientToDelete.id) {
        setSelectedCliente(null);
      }
      setClientToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Erro ao excluir cliente:', err);
    }
  };

  const handleQuickProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;
    try {
      const devTools = projectForm.ferramenta_dev_input
        ? projectForm.ferramenta_dev_input.split(',').map(s => s.trim()).filter(Boolean)
        : [];
        
      await createProjeto({
        ...projectForm,
        cliente_id: selectedCliente.id,
        ferramenta_dev: devTools,
        valor_projeto: Number(projectForm.valor_projeto),
        valor_mensal: Number(projectForm.valor_mensal)
      });
      setIsQuickProjectModalOpen(false);
      // Reset form
      setProjectForm({
        nome_solucao: '',
        descricao: '',
        status: 'Em desenvolvimento',
        link_acesso: '',
        ferramenta_dev_input: '',
        ferramenta_dev: [],
        banco_dados: '',
        repositorio_url: '',
        hospedagem_imagens: '',
        hospedagem_geral: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_entrega_prevista: '',
        valor_projeto: 0,
        valor_mensal: 0,
        observacoes: ''
      });
      await loadData();
    } catch (err) {
      console.error('Erro ao cadastrar projeto:', err);
    }
  };

  // Filtragem dos Clientes
  const filteredClientes = clientes.filter(c => {
    const matchesSearch = c.nome_empresa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.segmento && c.segmento.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.nome_contato_principal && c.nome_contato_principal.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Projetos vinculados ao cliente selecionado
  const clienteProjetos = selectedCliente
    ? projetos.filter(p => p.cliente_id === selectedCliente.id)
    : [];

  // Faturamento e Receitas do cliente selecionado
  const clienteMovimentos = selectedCliente
    ? movimentos.filter(m => m.cliente_id === selectedCliente.id)
    : [];

  const faturamentoAcumulado = clienteMovimentos
    .filter(m => m.tipo !== 'Saída/custo' && m.status === 'Confirmado')
    .reduce((acc, curr) => acc + Number(curr.valor), 0);

  const valorRecorrenteAtivo = clienteProjetos
    .filter(p => ['Em desenvolvimento', 'Em produção', 'Manutenção'].includes(p.status))
    .reduce((acc, curr) => acc + Number(curr.valor_mensal || 0), 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Building2 className="text-mtabi-yellow" size={28} />
            CLIENTES
          </h1>
          <p className="text-sm text-mtabi-muted">Gerencie suas contas de consultoria e projetos.</p>
        </div>
        <button
          onClick={openNewClientModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-3 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-mtabi-yellow/20 cursor-pointer"
        >
          <Plus size={16} /> ADICIONAR CLIENTE
        </button>
      </div>

      {/* Grid Principal: Lista à esquerda e Detalhes à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Filtros e Lista */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-mtabi-card border border-mtabi-border p-4 rounded-2xl space-y-3">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-mtabi-muted" size={16} />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs focus:outline-none focus:border-mtabi-yellow transition-colors font-sans text-white placeholder-mtabi-muted"
              />
            </div>

            {/* Filtro de Status */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted block mb-1.5">
                Filtrar Status
              </label>
              <div className="flex flex-wrap gap-1">
                {['todos', 'Ativo', 'Negociação', 'Pausado', 'Inativo'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg transition-colors cursor-pointer border ${
                      statusFilter === status
                        ? 'bg-mtabi-yellow text-black border-mtabi-yellow'
                        : 'bg-mtabi-bg text-mtabi-muted border-mtabi-border hover:border-mtabi-muted/50'
                    }`}
                  >
                    {status === 'todos' ? 'TODOS' : status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista de Clientes */}
          <div className="space-y-2 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-8 text-mtabi-muted text-xs animate-pulse uppercase tracking-wider">
                Buscando clientes...
              </div>
            ) : filteredClientes.length > 0 ? (
              filteredClientes.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCliente(c)}
                  className={`p-4 bg-mtabi-card border rounded-2xl transition-all cursor-pointer flex justify-between items-center group font-sans ${
                    selectedCliente?.id === c.id
                      ? 'border-mtabi-yellow bg-mtabi-yellow/[0.02]'
                      : 'border-mtabi-border hover:border-mtabi-border/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {c.logo_url ? (
                      <div className="w-10 h-10 rounded-xl bg-[#13151A] border border-mtabi-border flex items-center justify-center p-1 shrink-0">
                        <img 
                          src={c.logo_url} 
                          alt={c.nome_empresa} 
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-mtabi-border/35 border border-mtabi-border flex items-center justify-center text-mtabi-yellow font-display font-extrabold text-sm shrink-0 uppercase select-none">
                        {c.nome_empresa.substring(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-mtabi-yellow transition-colors truncate">
                        {c.nome_empresa}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-mtabi-muted truncate">
                          {c.segmento || 'Sem Segmento'}
                        </span>
                        <span className="text-mtabi-border">•</span>
                        <span className="text-[10px] text-mtabi-muted font-medium">
                          {c.tipo_relacao}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      c.status === 'Ativo' ? 'bg-emerald-900/30 text-mtabi-success border border-emerald-800/20' :
                      c.status === 'Negociação' ? 'bg-amber-900/30 text-mtabi-yellow border border-amber-800/20' :
                      c.status === 'Pausado' ? 'bg-blue-900/30 text-mtabi-info border border-blue-800/20' :
                      'bg-zinc-800 text-mtabi-muted border border-zinc-700/50'
                    }`}>
                      {c.status}
                    </span>
                    <ChevronRight className={`text-mtabi-muted group-hover:text-white transition-transform ${selectedCliente?.id === c.id ? 'rotate-90' : ''}`} size={16} />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-mtabi-card border border-mtabi-border rounded-2xl text-mtabi-muted text-xs">
                Nenhum cliente encontrado
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Detalhes do Cliente Selecionado */}
        <div className="lg:col-span-2">
          {selectedCliente ? (
            <div className="bg-mtabi-card border border-mtabi-border rounded-2xl p-6 space-y-6 font-sans">
              
              {/* Cabeçalho do Detalhe */}
              <div className="flex justify-between items-start border-b border-mtabi-border pb-5 gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  {selectedCliente.logo_url ? (
                    <div className="w-14 h-14 rounded-2xl bg-[#13151A] border border-mtabi-border flex items-center justify-center p-1.5 shrink-0">
                      <img 
                        src={selectedCliente.logo_url} 
                        alt={selectedCliente.nome_empresa} 
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-mtabi-border/30 border border-mtabi-border flex items-center justify-center text-mtabi-yellow font-display font-extrabold text-lg shrink-0 uppercase select-none">
                      {selectedCliente.nome_empresa.substring(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display truncate">
                        {selectedCliente.nome_empresa}
                      </h2>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        selectedCliente.status === 'Ativo' ? 'bg-emerald-900/30 text-mtabi-success' :
                        selectedCliente.status === 'Negociação' ? 'bg-amber-900/30 text-mtabi-yellow' :
                        selectedCliente.status === 'Pausado' ? 'bg-blue-900/30 text-mtabi-info' :
                        'bg-zinc-800 text-mtabi-muted'
                      }`}>
                        {selectedCliente.status}
                      </span>
                    </div>
                    <p className="text-xs text-mtabi-muted mt-1 uppercase tracking-wider">
                      {selectedCliente.segmento || 'Setor não informado'} • Relação: <span className="text-white">{selectedCliente.tipo_relacao}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditClientModal(selectedCliente)}
                    className="p-2 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white hover:text-mtabi-yellow rounded-xl transition-all cursor-pointer"
                    title="Editar Cliente"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setClientToDelete(selectedCliente)}
                    className="p-2 bg-mtabi-bg hover:bg-mtabi-error/10 border border-mtabi-border text-white hover:text-mtabi-error rounded-xl transition-all cursor-pointer"
                    title="Excluir Cliente"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Informações de Contato / Observações */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-mtabi-bg border border-mtabi-border p-4 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Contatos principais</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <User size={12} className="text-mtabi-yellow" />
                      <span className="text-mtabi-muted">Decisor:</span>
                      <span className="text-white font-medium">{selectedCliente.nome_contato_principal || 'Não informado'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Phone size={12} className="text-mtabi-yellow" />
                      <span className="text-mtabi-muted">Campeão Interno:</span>
                      <span className="text-white font-medium">{selectedCliente.nome_contato_interno || 'Não informado'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-mtabi-bg border border-mtabi-border p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">Resumo financeiro</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-mtabi-muted block uppercase tracking-wider">Faturado Total</span>
                      <span className="text-sm font-bold text-white">
                        {faturamentoAcumulado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-mtabi-muted block uppercase tracking-wider">Recorrência Ativa</span>
                      <span className="text-sm font-bold text-mtabi-yellow">
                        {valorRecorrenteAtivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedCliente.observacoes && (
                <div className="bg-mtabi-bg/40 border border-mtabi-border p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1">Observações / Anotações</h4>
                  <p className="text-xs text-mtabi-text leading-relaxed whitespace-pre-wrap">{selectedCliente.observacoes}</p>
                </div>
              )}

              {/* Lista de Projetos Vinculados */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-mtabi-border pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white">Projetos & Soluções ({clienteProjetos.length})</h3>
                  <button
                    onClick={() => setIsQuickProjectModalOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-mtabi-yellow uppercase tracking-wider hover:underline"
                  >
                    <Plus size={12} /> Novo Projeto
                  </button>
                </div>

                {clienteProjetos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clienteProjetos.map(proj => (
                      <div
                        key={proj.id}
                        onClick={() => onNavigateToProject && onNavigateToProject(proj.id)}
                        className="p-4 bg-mtabi-bg hover:bg-mtabi-border/30 border border-mtabi-border rounded-xl cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate">{proj.nome_solucao}</h4>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              proj.status === 'Em produção' ? 'bg-emerald-950 text-mtabi-success' :
                              proj.status === 'Em desenvolvimento' ? 'bg-blue-950 text-mtabi-info' :
                              proj.status === 'Manutenção' ? 'bg-purple-950 text-purple-400' :
                              'bg-zinc-800 text-mtabi-muted'
                            }`}>
                              {proj.status}
                            </span>
                          </div>
                          {proj.descricao && (
                            <p className="text-[10px] text-mtabi-muted mt-1 line-clamp-2 leading-relaxed">
                              {proj.descricao}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-mtabi-border/50 text-[9px] text-mtabi-muted font-mono">
                          <span>Início: {proj.data_inicio ? new Date(proj.data_inicio).toLocaleDateString('pt-BR') : 'N/D'}</span>
                          {proj.valor_mensal ? (
                            <span className="text-mtabi-yellow font-bold">R$ {Number(proj.valor_mensal).toFixed(0)}/mês</span>
                          ) : proj.valor_projeto ? (
                            <span className="text-white font-bold">R$ {Number(proj.valor_projeto).toFixed(0)}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-mtabi-bg/20 border border-dashed border-mtabi-border rounded-xl text-mtabi-muted text-xs">
                    Nenhum projeto cadastrado para este cliente.
                  </div>
                )}
              </div>

              {/* Movimentações Financeiras */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white border-b border-mtabi-border pb-2">
                  Histórico de Faturamento
                </h3>
                {clienteMovimentos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs font-sans">
                      <thead>
                        <tr className="border-b border-mtabi-border text-mtabi-muted text-[10px] uppercase tracking-wider">
                          <th className="py-2">Data</th>
                          <th className="py-2">Descrição</th>
                          <th className="py-2">Tipo</th>
                          <th className="py-2">Valor</th>
                          <th className="py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mtabi-border/40">
                        {clienteMovimentos.map(mov => (
                          <tr key={mov.id} className="hover:bg-mtabi-border/10 text-white">
                            <td className="py-2.5 font-mono">{new Date(mov.data_movimento).toLocaleDateString('pt-BR')}</td>
                            <td className="py-2.5 max-w-[200px] truncate">{mov.descricao}</td>
                            <td className="py-2.5 text-mtabi-muted text-[10px] uppercase tracking-wider">{mov.tipo}</td>
                            <td className={`py-2.5 font-bold ${mov.tipo === 'Saída/custo' ? 'text-mtabi-error' : 'text-mtabi-success'}`}>
                              {mov.tipo === 'Saída/custo' ? '-' : '+'} R$ {Number(mov.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 text-right">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                mov.status === 'Confirmado' ? 'bg-emerald-950 text-mtabi-success' :
                                mov.status === 'Previsto' ? 'bg-zinc-800 text-mtabi-muted' :
                                mov.status === 'Atrasado' ? 'bg-red-950 text-mtabi-error animate-pulse' :
                                'bg-zinc-900 text-zinc-600'
                              }`}>
                                {mov.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-mtabi-bg/20 border border-dashed border-mtabi-border rounded-xl text-mtabi-muted text-xs">
                    Nenhum movimento financeiro lançado para este cliente.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="h-96 bg-mtabi-card border border-mtabi-border rounded-2xl flex flex-col items-center justify-center text-mtabi-muted text-sm space-y-3 font-sans">
              <Building2 size={48} className="text-mtabi-border" />
              <p>Selecione um cliente para visualizar o perfil completo.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: Criar / Editar Cliente */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {editingCliente ? 'EDITAR CLIENTE' : 'NOVO CLIENTE'}
              </h3>
              <button onClick={() => setIsClientModalOpen(false)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleClientSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* LOGOTIPO */}
              <div className="mb-4 bg-mtabi-bg/30 p-3 rounded-xl border border-mtabi-border/60">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2.5">
                  Logotipo do Cliente
                </label>
                <div className="flex items-center gap-4">
                  {clientForm.logo_url ? (
                    <div className="relative w-16 h-16 rounded-xl bg-[#13151A] border border-mtabi-border flex items-center justify-center p-1 shrink-0 overflow-hidden group">
                      <img 
                        src={clientForm.logo_url} 
                        alt="Logotipo Preview" 
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setClientForm({ ...clientForm, logo_url: '' })}
                        className="absolute inset-0 bg-black/75 flex items-center justify-center text-mtabi-error opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold font-display"
                      >
                        REMOVER
                      </button>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-xl border border-dashed border-mtabi-border hover:border-mtabi-yellow flex flex-col items-center justify-center text-mtabi-muted hover:text-mtabi-yellow transition-all cursor-pointer shrink-0">
                      <Upload size={18} />
                      <span className="text-[8px] font-bold uppercase mt-1">Anexar</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoChange} 
                        className="hidden" 
                      />
                    </label>
                  )}
                  <div className="text-left">
                    <span className="text-xs text-white font-bold block">Carregar imagem</span>
                    <span className="text-[9px] text-mtabi-muted block mt-0.5 leading-normal max-w-xs">
                      Selecione um arquivo PNG, JPG ou SVG. Proporção quadrada recomendada.
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                  Nome da Empresa / Marca *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MTABI Tech"
                  value={clientForm.nome_empresa}
                  onChange={(e) => setClientForm({ ...clientForm, nome_empresa: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    Contato Principal (Decisor)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Maurício Tabi"
                    value={clientForm.nome_contato_principal}
                    onChange={(e) => setClientForm({ ...clientForm, nome_contato_principal: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    Contato Interno (Facilitador)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: João Campeão"
                    value={clientForm.nome_contato_interno}
                    onChange={(e) => setClientForm({ ...clientForm, nome_contato_interno: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    Segmento / Setor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Tecnologia, Finanças, Saúde"
                    value={clientForm.segmento}
                    onChange={(e) => setClientForm({ ...clientForm, segmento: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                    Tipo de Relação *
                  </label>
                  <select
                    value={clientForm.tipo_relacao}
                    onChange={(e) => setClientForm({ ...clientForm, tipo_relacao: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                  >
                    <option value="Projeto único">Projeto único</option>
                    <option value="Consultoria recorrente">Consultoria recorrente</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                  Status da Conta *
                </label>
                <select
                  value={clientForm.status}
                  onChange={(e) => setClientForm({ ...clientForm, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                >
                  <option value="Negociação">Negociação</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                  Observações / Histórico comercial
                </label>
                <textarea
                  rows={4}
                  placeholder="Digite anotações ou detalhes sobre a relação..."
                  value={clientForm.observacoes}
                  onChange={(e) => setClientForm({ ...clientForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  {editingCliente ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Criar Projeto Direto (Rápido) */}
      {isQuickProjectModalOpen && selectedCliente && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                NOVO PROJETO PARA {selectedCliente.nome_empresa.toUpperCase()}
              </h3>
              <button onClick={() => setIsQuickProjectModalOpen(false)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleQuickProjectSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Nome da Solução / Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dashboard Operacional V2"
                  value={projectForm.nome_solucao}
                  onChange={(e) => setProjectForm({ ...projectForm, nome_solucao: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Descrição do Escopo / Objetivos
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva brevemente o projeto..."
                  value={projectForm.descricao}
                  onChange={(e) => setProjectForm({ ...projectForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Status do Desenvolvimento
                </label>
                <select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                >
                  <option value="Em negociação">Em negociação</option>
                  <option value="Em desenvolvimento">Em desenvolvimento</option>
                  <option value="Em produção">Em produção</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Encerrado">Encerrado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Link de Produção (Acesso Web)
                </label>
                <input
                  type="url"
                  placeholder="https://app.cliente.com"
                  value={projectForm.link_acesso}
                  onChange={(e) => setProjectForm({ ...projectForm, link_acesso: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Ferramentas Dev (Separe por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Antigravity, AI Studio, Supabase, Lovable"
                  value={projectForm.ferramenta_dev_input}
                  onChange={(e) => setProjectForm({ ...projectForm, ferramenta_dev_input: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Banco de Dados
                </label>
                <input
                  type="text"
                  placeholder="Ex: Supabase Postgres"
                  value={projectForm.banco_dados}
                  onChange={(e) => setProjectForm({ ...projectForm, banco_dados: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Hospedagem Geral (Servidor)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Vercel"
                  value={projectForm.hospedagem_geral}
                  onChange={(e) => setProjectForm({ ...projectForm, hospedagem_geral: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Repositório URL (GitHub/GitLab)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/usuario/repo"
                  value={projectForm.repositorio_url}
                  onChange={(e) => setProjectForm({ ...projectForm, repositorio_url: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={projectForm.data_inicio}
                  onChange={(e) => setProjectForm({ ...projectForm, data_inicio: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Previsão de Entrega
                </label>
                <input
                  type="date"
                  value={projectForm.data_entrega_prevista}
                  onChange={(e) => setProjectForm({ ...projectForm, data_entrega_prevista: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Valor Único do Desenvolvimento (R$)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={projectForm.valor_projeto || ''}
                  onChange={(e) => setProjectForm({ ...projectForm, valor_projeto: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Mensalidade / Manutenção Recorrente (R$)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={projectForm.valor_mensal || ''}
                  onChange={(e) => setProjectForm({ ...projectForm, valor_mensal: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow transition-colors text-white font-sans"
                />
              </div>

              <div className="sm:col-span-2 flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setIsQuickProjectModalOpen(false)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  CADASTRAR PROJETO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {clientToDelete && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-md shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-mtabi-error mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">EXCLUIR CONTA CLIENTE</h3>
            </div>
            
            <p className="text-xs text-mtabi-muted leading-relaxed">
              Você está prestes a excluir permanentemente o cliente <span className="text-white font-bold">{clientToDelete.nome_empresa}</span>.
              Isso apagará **TODOS os projetos**, **históricos financeiros** e **dados associados** de forma irreversível.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setClientToDelete(null)}
                className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleDeleteClient}
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

export default Clientes;
