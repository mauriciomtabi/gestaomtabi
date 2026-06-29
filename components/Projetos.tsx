import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Search, Filter, Globe, Github, Database, Image, Server, Calendar, DollarSign, Edit2, Trash2, X, AlertTriangle, Building2, ChevronRight, ExternalLink } from 'lucide-react';
import { getProjetos, createProjeto, updateProjeto, deleteProjeto, getClientes, getFerramentas } from '../services/supabaseService';
import { Projeto, Cliente, FerramentaCusto } from '../types';

interface ProjetosProps {
  selectedProjectId?: string | null;
  onClearSelectedProject?: () => void;
}

const Projetos: React.FC<ProjetosProps> = ({ selectedProjectId, onClearSelectedProject }) => {
  const [loading, setLoading] = useState(true);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ferramentas, setFerramentas] = useState<FerramentaCusto[]>([]);
  
  // Seleção e visualização de detalhes
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);

  // Busca e Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [toolFilter, setToolFilter] = useState<string>('todos');

  // Modais CRUD Projeto
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<Projeto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [projectForm, setProjectForm] = useState({
    cliente_id: '',
    nome_solucao: '',
    descricao: '',
    status: 'Em desenvolvimento' as Projeto['status'],
    link_acesso: '',
    ferramenta_dev_input: '',
    banco_dados: '',
    repositorio_url: '',
    hospedagem_imagens: '',
    hospedagem_geral: '',
    link_supabase: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    valor_projeto: 0,
    valor_mensal: 0,
    observacoes: '',
    user_acesso: '',
    user_supabase: '',
    user_repositorio: '',
    user_imagens: '',
    user_hospedagem: ''
  });

  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [newToolInput, setNewToolInput] = useState('');

  // Confirmação de Exclusão
  const [projectToDelete, setProjectToDelete] = useState<Projeto | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [p, c, f] = await Promise.all([
        getProjetos(),
        getClientes(),
        getFerramentas()
      ]);
      setProjetos(p);
      setClientes(c);
      setFerramentas(f);

      // Tratamento de seleção profunda via navegação externa (ex: tela Clientes)
      if (selectedProjectId) {
        const found = p.find(item => item.id === selectedProjectId);
        if (found) setSelectedProjeto(found);
      } else if (selectedProjeto) {
        const updated = p.find(item => item.id === selectedProjeto.id);
        setSelectedProjeto(updated || null);
      }
    } catch (e) {
      console.error('Erro ao carregar Projetos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProjectId]);

  const openNewProjectModal = () => {
    setEditingProjeto(null);
    setErrorMsg(null);
    setProjectForm({
      cliente_id: clientes[0]?.id || '',
      nome_solucao: '',
      descricao: '',
      status: 'Em desenvolvimento',
      link_acesso: '',
      ferramenta_dev_input: '',
      banco_dados: '',
      repositorio_url: '',
      hospedagem_imagens: '',
      hospedagem_geral: '',
      link_supabase: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_entrega_prevista: '',
      valor_projeto: 0,
      valor_mensal: 0,
      observacoes: '',
      user_acesso: '',
      user_supabase: '',
      user_repositorio: '',
      user_imagens: '',
      user_hospedagem: ''
    });
    setSelectedTools([]);
    setNewToolInput('');
    setIsProjectModalOpen(true);
  };

  const openEditProjectModal = (p: Projeto) => {
    setEditingProjeto(p);
    setErrorMsg(null);
    setProjectForm({
      cliente_id: p.cliente_id,
      nome_solucao: p.nome_solucao,
      descricao: p.descricao || '',
      status: p.status,
      link_acesso: p.link_acesso || '',
      ferramenta_dev_input: '',
      banco_dados: p.banco_dados || '',
      repositorio_url: p.repositorio_url || '',
      hospedagem_imagens: p.hospedagem_imagens || '',
      hospedagem_geral: p.hospedagem_geral || '',
      link_supabase: p.link_supabase || '',
      data_inicio: p.data_inicio || '',
      data_entrega_prevista: p.data_entrega_prevista || '',
      valor_projeto: Number(p.valor_projeto || 0),
      valor_mensal: Number(p.valor_mensal || 0),
      observacoes: p.observacoes || '',
      user_acesso: p.user_acesso || '',
      user_supabase: p.user_supabase || '',
      user_repositorio: p.user_repositorio || '',
      user_imagens: p.user_imagens || '',
      user_hospedagem: p.user_hospedagem || ''
    });
    setSelectedTools(p.ferramenta_dev || []);
    setNewToolInput('');
    setIsProjectModalOpen(true);
  };

  const toggleTool = (tool: string) => {
    setSelectedTools(prev => 
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const handleAddCustomTool = () => {
    const trimmed = newToolInput.trim();
    if (trimmed) {
      if (!selectedTools.includes(trimmed)) {
        setSelectedTools(prev => [...prev, trimmed]);
      }
      setNewToolInput('');
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const payload = {
        ...projectForm,
        ferramenta_dev: selectedTools,
        valor_projeto: Number(projectForm.valor_projeto),
        valor_mensal: Number(projectForm.valor_mensal),
        data_inicio: projectForm.data_inicio || null,
        data_entrega_prevista: projectForm.data_entrega_prevista || null
      };
      
      delete (payload as any).ferramenta_dev_input;

      if (editingProjeto) {
        const updated = await updateProjeto(editingProjeto.id, payload);
        setSelectedProjeto(updated);
      } else {
        const created = await createProjeto(payload);
        setSelectedProjeto(created);
      }
      setIsProjectModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar projeto:', err);
      const detailMsg = err && typeof err === 'object' && 'message' in err 
        ? String((err as any).message) 
        : JSON.stringify(err);
      setErrorMsg(`Erro: ${detailMsg}`);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteProjeto(projectToDelete.id);
      if (selectedProjeto?.id === projectToDelete.id) {
        setSelectedProjeto(null);
      }
      setProjectToDelete(null);
      if (onClearSelectedProject) onClearSelectedProject();
      await loadData();
    } catch (err) {
      console.error('Erro ao excluir projeto:', err);
    }
  };

  // Extrai lista única de ferramentas de todos os projetos para o filtro
  const todasFerramentasDev = Array.from(
    new Set(projetos.flatMap(p => p.ferramenta_dev || []))
  ).sort();

  // Filtragem dos Projetos
  const filteredProjetos = projetos.filter(p => {
    const matchesSearch = p.nome_solucao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.cliente?.nome_empresa && p.cliente.nome_empresa.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.descricao && p.descricao.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesStatus = statusFilter === 'todos' || p.status === statusFilter;
    
    const matchesTool = toolFilter === 'todos' || (p.ferramenta_dev && p.ferramenta_dev.includes(toolFilter));
    
    return matchesSearch && matchesStatus && matchesTool;
  });

  // Custos associados ao projeto selecionado
  const projetoCustos = selectedProjeto
    ? ferramentas.filter(f => f.projeto_vinculado_id === selectedProjeto.id)
    : [];

  const totalCustoProjetoMes = projetoCustos.reduce((acc, curr) => {
    let valorMensal = Number(curr.valor || 0);
    if (curr.tipo_custo === 'Anual') valorMensal /= 12;
    if (curr.tipo_custo === 'Gratuito') valorMensal = 0;
    if (curr.moeda === 'USD') valorMensal *= 5.5; // câmbio
    return acc + (curr.ativo ? valorMensal : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {selectedProjectId && (
              <button 
                onClick={onClearSelectedProject} 
                className="text-mtabi-yellow hover:underline text-xs uppercase tracking-wider font-bold mr-2"
              >
                Voltar
              </button>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
              <FolderKanban className="text-mtabi-yellow" size={28} />
              PROJETOS & SOLUÇÕES
            </h1>
          </div>
          <p className="text-sm text-mtabi-muted">Controle o desenvolvimento, links e custos de software.</p>
        </div>
        <button
          onClick={openNewProjectModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-3 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-mtabi-yellow/20 cursor-pointer"
        >
          <Plus size={16} /> ADICIONAR PROJETO
        </button>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Busca, Filtros e Cards */}
        <div className="lg:col-span-1 space-y-4">
          
          {/* Caixa de Busca e Filtros */}
          <div className="bg-mtabi-card border border-mtabi-border p-4 rounded-2xl space-y-3 font-sans">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-mtabi-muted" size={16} />
              <input
                type="text"
                placeholder="Buscar projeto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs focus:outline-none focus:border-mtabi-yellow transition-colors text-white placeholder-mtabi-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted block mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs text-white focus:outline-none focus:border-mtabi-yellow"
                >
                  <option value="todos">Todos</option>
                  <option value="Em negociação">Negociação</option>
                  <option value="Em desenvolvimento">Dev</option>
                  <option value="Em produção">Produção</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Encerrado">Encerrado</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted block mb-1">
                  Ferramenta Dev
                </label>
                <select
                  value={toolFilter}
                  onChange={(e) => setToolFilter(e.target.value)}
                  className="w-full p-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs text-white focus:outline-none focus:border-mtabi-yellow"
                >
                  <option value="todos">Todas</option>
                  {todasFerramentasDev.map(tool => (
                    <option key={tool} value={tool}>{tool}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cards de Projeto */}
          <div className="space-y-3 max-h-[60vh] lg:max-h-[70vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-8 text-mtabi-muted text-xs animate-pulse">
                BUSCANDO PROJETOS...
              </div>
            ) : filteredProjetos.length > 0 ? (
              filteredProjetos.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjeto(p)}
                  className={`p-4 bg-mtabi-card border rounded-2xl transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.01] group ${
                    selectedProjeto?.id === p.id
                      ? 'border-mtabi-yellow bg-mtabi-yellow/[0.01]'
                      : 'border-mtabi-border hover:border-mtabi-border/80'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] font-bold text-mtabi-muted uppercase tracking-wider flex items-center gap-1">
                        <Building2 size={10} className="text-mtabi-yellow" />
                        {p.cliente?.nome_empresa}
                      </span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        p.status === 'Em produção' ? 'bg-emerald-950 text-mtabi-success border border-emerald-800/10' :
                        p.status === 'Em desenvolvimento' ? 'bg-blue-950 text-mtabi-info border border-blue-800/10' :
                        p.status === 'Manutenção' ? 'bg-purple-950 text-purple-400 border border-purple-800/10' :
                        p.status === 'Em negociação' ? 'bg-amber-950 text-mtabi-yellow border border-amber-800/10' :
                        'bg-zinc-800 text-mtabi-muted border border-zinc-700/50'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-mtabi-yellow transition-colors uppercase tracking-wider mt-1.5">
                      {p.nome_solucao}
                    </h3>
                    
                    {p.descricao && (
                      <p className="text-[11px] text-mtabi-muted mt-1 font-sans line-clamp-2 leading-relaxed">
                        {p.descricao}
                      </p>
                    )}
                  </div>

                  {/* Badge de Ferramentas */}
                  {p.ferramenta_dev && p.ferramenta_dev.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3.5">
                      {p.ferramenta_dev.slice(0, 3).map(tool => (
                        <span key={tool} className="text-[8px] font-mono px-2 py-0.5 bg-mtabi-bg/60 border border-mtabi-border text-white rounded">
                          {tool}
                        </span>
                      ))}
                      {p.ferramenta_dev.length > 3 && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 bg-mtabi-bg text-mtabi-muted rounded">
                          +{p.ferramenta_dev.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-mtabi-card border border-mtabi-border rounded-2xl text-mtabi-muted text-xs">
                Nenhum projeto encontrado
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Visualização Detalhada */}
        <div className="lg:col-span-2">
          {selectedProjeto ? (
            <div className="bg-mtabi-card border border-mtabi-border rounded-2xl p-6 space-y-6 font-sans">
              
              {/* Cabeçalho */}
              <div className="flex justify-between items-start border-b border-mtabi-border pb-5 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-mtabi-yellow font-bold uppercase tracking-wider flex items-center gap-1">
                      <Building2 size={12} />
                      {selectedProjeto.cliente?.nome_empresa}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display uppercase tracking-tight mt-1">
                    {selectedProjeto.nome_solucao}
                  </h2>
                  <p className="text-xs text-mtabi-muted mt-1">
                    Iniciado em: <span className="text-white">{selectedProjeto.data_inicio ? new Date(selectedProjeto.data_inicio).toLocaleDateString('pt-BR') : 'N/D'}</span>
                    {selectedProjeto.data_entrega_prevista && (
                      <> • Entrega prevista: <span className="text-white">{new Date(selectedProjeto.data_entrega_prevista).toLocaleDateString('pt-BR')}</span></>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditProjectModal(selectedProjeto)}
                    className="p-2 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white hover:text-mtabi-yellow rounded-xl transition-all cursor-pointer"
                    title="Editar Projeto"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setProjectToDelete(selectedProjeto)}
                    className="p-2 bg-mtabi-bg hover:bg-mtabi-error/10 border border-mtabi-border text-white hover:text-mtabi-error rounded-xl transition-all cursor-pointer"
                    title="Excluir Projeto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Descrição */}
              {selectedProjeto.descricao && (
                <div className="bg-mtabi-bg/30 border border-mtabi-border p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1">Escopo & Objetivo</h4>
                  <p className="text-xs text-mtabi-text leading-relaxed whitespace-pre-wrap">{selectedProjeto.descricao}</p>
                </div>
              )}

              {/* Informações Financeiras */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-mtabi-bg border border-mtabi-border p-4 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Faturamento do Projeto</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-mtabi-muted">Cobrança Única:</span>
                      <span className="text-white font-bold">
                        {selectedProjeto.valor_projeto ? Number(selectedProjeto.valor_projeto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-mtabi-muted">Manutenção Mensal:</span>
                      <span className="text-mtabi-yellow font-bold">
                        {selectedProjeto.valor_mensal ? Number(selectedProjeto.valor_mensal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '/mês' : 'R$ 0,00'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-mtabi-bg border border-mtabi-border p-4 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Links Operacionais</h4>
                  <div className="space-y-2 text-xs">
                    {/* 1. Link de Acesso */}
                    <div className="space-y-0.5">
                      {selectedProjeto.link_acesso ? (
                        <a
                          href={selectedProjeto.link_acesso}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-mtabi-yellow hover:underline"
                        >
                          <Globe size={12} /> Acessar Aplicação <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-mtabi-muted block flex items-center gap-1.5"><Globe size={12} /> Sem link de produção</span>
                      )}
                      {selectedProjeto.link_acesso && selectedProjeto.user_acesso && (
                        <span className="text-[10px] text-mtabi-muted block pl-4 font-sans">
                          Usuário: <span className="text-white select-all font-mono">{selectedProjeto.user_acesso}</span>
                        </span>
                      )}
                    </div>

                    {/* 2. Link Banco de Dados */}
                    <div className="space-y-0.5">
                      {selectedProjeto.link_supabase ? (
                        <a
                          href={selectedProjeto.link_supabase}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          <Database size={12} /> Console Supabase <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-mtabi-muted block flex items-center gap-1.5"><Database size={12} /> Sem link do Supabase</span>
                      )}
                      {selectedProjeto.link_supabase && selectedProjeto.user_supabase && (
                        <span className="text-[10px] text-mtabi-muted block pl-4 font-sans">
                          Usuário: <span className="text-white select-all font-mono">{selectedProjeto.user_supabase}</span>
                        </span>
                      )}
                    </div>

                    {/* 3. Link Repositório */}
                    <div className="space-y-0.5">
                      {selectedProjeto.repositorio_url ? (
                        <a
                          href={selectedProjeto.repositorio_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-white hover:text-mtabi-yellow hover:underline"
                        >
                          <Github size={12} /> Código Fonte <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-mtabi-muted block flex items-center gap-1.5"><Github size={12} /> Sem repositório público</span>
                      )}
                      {selectedProjeto.repositorio_url && selectedProjeto.user_repositorio && (
                        <span className="text-[10px] text-mtabi-muted block pl-4 font-sans">
                          Usuário: <span className="text-white select-all font-mono">{selectedProjeto.user_repositorio}</span>
                        </span>
                      )}
                    </div>

                    {/* 4. Link Banco de Imagens */}
                    <div className="space-y-0.5">
                      {selectedProjeto.hospedagem_imagens ? (
                        <a
                          href={selectedProjeto.hospedagem_imagens.startsWith('http') ? selectedProjeto.hospedagem_imagens : `https://${selectedProjeto.hospedagem_imagens}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          <Image size={12} /> Banco de Imagens <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span className="text-mtabi-muted block flex items-center gap-1.5"><Image size={12} /> Sem link de imagens</span>
                      )}
                      {selectedProjeto.hospedagem_imagens && selectedProjeto.user_imagens && (
                        <span className="text-[10px] text-mtabi-muted block pl-4 font-sans">
                          Usuário: <span className="text-white select-all font-mono">{selectedProjeto.user_imagens}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stack Técnica / Infraestrutura */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted border-b border-mtabi-border pb-1">
                  Arquitetura & Infraestrutura
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-mtabi-bg/50 border border-mtabi-border p-3 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-mtabi-muted uppercase tracking-wider flex items-center gap-1">
                        <Server size={10} className="text-mtabi-yellow" /> Hospedagem Geral
                      </span>
                      <span className="text-xs text-white font-bold mt-1.5 block truncate">
                        {selectedProjeto.hospedagem_geral || 'Não Informado'}
                      </span>
                    </div>
                    {selectedProjeto.hospedagem_geral && selectedProjeto.user_hospedagem && (
                      <span className="text-[9px] text-mtabi-muted block mt-1 font-sans border-t border-mtabi-border/30 pt-1">
                        Usuário: <span className="text-white select-all font-mono">{selectedProjeto.user_hospedagem}</span>
                      </span>
                    )}
                  </div>

                  <div className="bg-mtabi-bg/50 border border-mtabi-border p-3 rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-mtabi-muted uppercase tracking-wider flex items-center gap-1">
                      <Globe size={10} className="text-mtabi-yellow" /> Status Atual
                    </span>
                    <span className={`text-[10px] font-bold mt-1.5 uppercase ${
                      selectedProjeto.status === 'Em produção' ? 'text-mtabi-success' : 'text-mtabi-info'
                    }`}>
                      {selectedProjeto.status}
                    </span>
                  </div>
                </div>

                {/* Ferramentas de Desenvolvimento */}
                {selectedProjeto.ferramenta_dev && selectedProjeto.ferramenta_dev.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[9px] text-mtabi-muted uppercase tracking-wider block mb-1.5">Ferramentas de Codificação/IA</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProjeto.ferramenta_dev.map(tool => (
                        <span key={tool} className="text-[10px] font-mono px-2.5 py-1 bg-mtabi-bg border border-mtabi-border text-white rounded-lg">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custos Vinculados Específicos */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-mtabi-border pb-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">
                    Assinaturas vinculadas a este projeto
                  </h4>
                  <span className="text-[10px] font-bold text-mtabi-yellow">
                    Mensal Total: R$ {totalCustoProjetoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {projetoCustos.length > 0 ? (
                  <div className="space-y-2">
                    {projetoCustos.map(custo => (
                      <div key={custo.id} className="p-3 bg-mtabi-bg border border-mtabi-border rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white block">{custo.nome_ferramenta}</span>
                          <span className="text-[9px] text-mtabi-muted uppercase tracking-wider">{custo.categoria} • Dia Venc: {custo.data_cobranca || 'N/D'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-white block">
                            {custo.moeda === 'USD' ? '$' : 'R$'} {Number(custo.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] text-mtabi-muted font-normal">({custo.tipo_custo})</span>
                          </span>
                          {!custo.ativo && (
                            <span className="text-[8px] px-1.5 bg-zinc-800 text-mtabi-muted uppercase rounded">Inativo</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 bg-mtabi-bg/10 border border-dashed border-mtabi-border rounded-xl text-mtabi-muted text-xs">
                    Nenhum custo recorrente de ferramenta associado diretamente a este projeto.
                  </div>
                )}
              </div>

              {/* Observações Gerais do Projeto */}
              {selectedProjeto.observacoes && (
                <div className="bg-mtabi-bg/40 border border-mtabi-border p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1">Notas Internas</h4>
                  <p className="text-xs text-mtabi-text leading-relaxed whitespace-pre-wrap">{selectedProjeto.observacoes}</p>
                </div>
              )}

            </div>
          ) : (
            <div className="h-96 bg-mtabi-card border border-mtabi-border rounded-2xl flex flex-col items-center justify-center text-mtabi-muted text-sm space-y-3 font-sans">
              <FolderKanban size={48} className="text-mtabi-border" />
              <p>Selecione um projeto para detalhamento completo.</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: Criar / Editar Projeto */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {editingProjeto ? 'EDITAR PROJETO' : 'CADASTRAR NOVO PROJETO'}
              </h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleProjectSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
              {errorMsg && (
                <div className="sm:col-span-2 p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2 font-semibold font-sans">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  {errorMsg}
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Cliente Vinculado *
                </label>
                <select
                  required
                  value={projectForm.cliente_id}
                  onChange={(e) => setProjectForm({ ...projectForm, cliente_id: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                >
                  <option value="" disabled>Selecione um cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome_empresa}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Nome da Solução / Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: API de Faturamento Integrada"
                  value={projectForm.nome_solucao}
                  onChange={(e) => setProjectForm({ ...projectForm, nome_solucao: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Descrição / Objetivo do Escopo
                </label>
                <textarea
                  rows={2}
                  placeholder="Descreva o produto, stack ou finalidade..."
                  value={projectForm.descricao}
                  onChange={(e) => setProjectForm({ ...projectForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Status do Desenvolvimento
                </label>
                <select
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                >
                  <option value="Em negociação">Em negociação</option>
                  <option value="Em desenvolvimento">Em desenvolvimento</option>
                  <option value="Em produção">Em produção</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Encerrado">Encerrado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">
                  Link de Acesso Web (Produção)
                </label>
                <input
                  type="url"
                  placeholder="https://sua-solucao.com"
                  value={projectForm.link_acesso}
                  onChange={(e) => setProjectForm({ ...projectForm, link_acesso: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
                <input
                  type="text"
                  placeholder="Usuário de acesso (Login/E-mail)"
                  value={projectForm.user_acesso}
                  onChange={(e) => setProjectForm({ ...projectForm, user_acesso: e.target.value })}
                  className="w-full px-3 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow text-white placeholder-mtabi-muted/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">
                  Link do Supabase (Painel)
                </label>
                <input
                  type="url"
                  placeholder="https://supabase.com/dashboard/project/..."
                  value={projectForm.link_supabase}
                  onChange={(e) => setProjectForm({ ...projectForm, link_supabase: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
                <input
                  type="text"
                  placeholder="Usuário do Supabase (E-mail)"
                  value={projectForm.user_supabase}
                  onChange={(e) => setProjectForm({ ...projectForm, user_supabase: e.target.value })}
                  className="w-full px-3 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow text-white placeholder-mtabi-muted/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">
                  URL do Repositório Git
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/empresa/projeto"
                  value={projectForm.repositorio_url}
                  onChange={(e) => setProjectForm({ ...projectForm, repositorio_url: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
                <input
                  type="text"
                  placeholder="Usuário Git (GitHub/GitLab)"
                  value={projectForm.user_repositorio}
                  onChange={(e) => setProjectForm({ ...projectForm, user_repositorio: e.target.value })}
                  className="w-full px-3 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow text-white placeholder-mtabi-muted/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">
                  Link do Banco de Imagens (Storage)
                </label>
                <input
                  type="url"
                  placeholder="https://cloudinary.com/... ou Supabase Storage"
                  value={projectForm.hospedagem_imagens}
                  onChange={(e) => setProjectForm({ ...projectForm, hospedagem_imagens: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
                <input
                  type="text"
                  placeholder="Usuário do Banco de Imagens"
                  value={projectForm.user_imagens}
                  onChange={(e) => setProjectForm({ ...projectForm, user_imagens: e.target.value })}
                  className="w-full px-3 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow text-white placeholder-mtabi-muted/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">
                  Hospedagem Geral (Frontend/Backend)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Netlify, Railway"
                  value={projectForm.hospedagem_geral}
                  onChange={(e) => setProjectForm({ ...projectForm, hospedagem_geral: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
                <input
                  type="text"
                  placeholder="Usuário da Hospedagem Geral"
                  value={projectForm.user_hospedagem}
                  onChange={(e) => setProjectForm({ ...projectForm, user_hospedagem: e.target.value })}
                  className="w-full px-3 py-1 bg-mtabi-bg/40 border border-mtabi-border/40 rounded-lg text-xs focus:outline-none focus:border-mtabi-yellow text-white placeholder-mtabi-muted/50"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">
                  Ferramentas Utilizadas (Selecione na lista)
                </label>
                
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-mtabi-bg/30 border border-mtabi-border/60 rounded-xl">
                  {Array.from(
                    new Set([
                      'React', 'Vite', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Node.js', 
                      'PostgreSQL', 'Cloudinary', 'Vercel', 'Next.js', 'Lovable', 'Antigravity', 
                      'AI Studio', 'Firebase',
                      ...projetos.flatMap(p => p.ferramenta_dev || [])
                    ])
                  ).sort().map(tool => {
                    const isSelected = selectedTools.includes(tool);
                    return (
                      <button
                        type="button"
                        key={tool}
                        onClick={() => toggleTool(tool)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-mtabi-yellow/20 border-mtabi-yellow text-mtabi-yellow' 
                            : 'bg-mtabi-bg border-mtabi-border text-mtabi-muted hover:text-white'
                        }`}
                      >
                        {tool}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Adicionar nova ferramenta..."
                    value={newToolInput}
                    onChange={e => setNewToolInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs text-white focus:outline-none focus:border-mtabi-yellow"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTool}
                    className="px-3 py-1.5 bg-mtabi-border hover:bg-mtabi-border/80 border border-mtabi-border text-white text-xs font-bold uppercase rounded-xl cursor-pointer transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={projectForm.data_inicio}
                  onChange={(e) => setProjectForm({ ...projectForm, data_inicio: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
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
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Valor Único Cobrado (R$)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={projectForm.valor_projeto || ''}
                  onChange={(e) => setProjectForm({ ...projectForm, valor_projeto: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
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
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Observações Gerais do Projeto
                </label>
                <textarea
                  rows={3}
                  placeholder="Anotações comerciais, senhas de homologação ou acordos específicos..."
                  value={projectForm.observacoes}
                  onChange={(e) => setProjectForm({ ...projectForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white resize-none"
                />
              </div>

              <div className="sm:col-span-2 flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  {editingProjeto ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR PROJETO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-md shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-mtabi-error mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">EXCLUIR PROJETO</h3>
            </div>
            
            <p className="text-xs text-mtabi-muted leading-relaxed">
              Você está prestes a excluir permanentemente o projeto <span className="text-white font-bold">{projectToDelete.nome_solucao}</span>.
              Isso apagará o histórico, credenciais vinculadas e faturamentos parciais do projeto de forma irreversível.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setProjectToDelete(null)}
                className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleDeleteProject}
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

export default Projetos;
