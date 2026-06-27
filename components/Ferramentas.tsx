import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Search, Filter, Link, User, Eye, EyeOff, Copy, Check, Lock, X, AlertTriangle, HelpCircle, Activity, Globe, Edit2, Trash2 } from 'lucide-react';
import { getFerramentas, createFerramenta, updateFerramenta, deleteFerramenta, getProjetos, reauthenticateUser, logCredentialAccess, getLogsCredenciais } from '../services/supabaseService';
import { encryptText, decryptText } from '../utils/crypto';
import { FerramentaCusto, Projeto, LogAcessoCredencial } from '../types';

const CATEGORIAS = ['IA/Dev', 'Hospedagem', 'Banco de Dados', 'Design', 'Produtividade', 'Outro'] as const;
const CUSTOS = ['Gratuito', 'Pago único', 'Mensal', 'Anual'] as const;

const Ferramentas: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [ferramentas, setFerramentas] = useState<FerramentaCusto[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [auditLogs, setAuditLogs] = useState<LogAcessoCredencial[]>([]);

  // Busca e Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [scopeFilter, setScopeFilter] = useState<'todos' | 'geral' | 'projeto'>('todos');

  // Seleção e Detalhes
  const [selectedTool, setSelectedTool] = useState<FerramentaCusto | null>(null);

  // Controle de Visualização Segura de Senhas
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);
  const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null);
  const [revealTimer, setRevealTimer] = useState<number | null>(null);

  // Modais CRUD Ferramenta
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<FerramentaCusto | null>(null);
  const [toolForm, setToolForm] = useState({
    nome_ferramenta: '',
    categoria: 'IA/Dev' as FerramentaCusto['categoria'],
    tipo_custo: 'Mensal' as FerramentaCusto['tipo_custo'],
    valor: 0,
    moeda: 'BRL' as FerramentaCusto['moeda'],
    data_cobranca: '',
    projeto_vinculado_id: '',
    ativo: true,
    link_acesso: '',
    usuario_acesso: '',
    senha_descriptografada: '', // Digitada pelo usuário, será criptografada antes do envio
    observacoes: ''
  });

  // Confirmação de Exclusão
  const [toolToDelete, setToolToDelete] = useState<FerramentaCusto | null>(null);

  // Clipboard Feedback
  const [copiedField, setCopiedField] = useState<'usuario' | 'link' | 'senha' | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [f, p, l] = await Promise.all([
        getFerramentas(),
        getProjetos(),
        getLogsCredenciais()
      ]);
      setFerramentas(f);
      setProjetos(p);
      setAuditLogs(l);
      
      if (selectedTool) {
        const updated = f.find(item => item.id === selectedTool.id);
        setSelectedTool(updated || null);
      }
    } catch (e) {
      console.error('Erro ao carregar Ferramentas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, []);

  const triggerCopyFeedback = (field: 'usuario' | 'link' | 'senha') => {
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openNewToolModal = () => {
    setEditingTool(null);
    setToolForm({
      nome_ferramenta: '',
      categoria: 'IA/Dev',
      tipo_custo: 'Mensal',
      valor: 0,
      moeda: 'BRL',
      data_cobranca: '',
      projeto_vinculado_id: '',
      ativo: true,
      link_acesso: '',
      usuario_acesso: '',
      senha_descriptografada: '',
      observacoes: ''
    });
    setIsToolModalOpen(true);
  };

  const openEditToolModal = async (f: FerramentaCusto) => {
    setEditingTool(f);
    setToolForm({
      nome_ferramenta: f.nome_ferramenta,
      categoria: f.categoria,
      tipo_custo: f.tipo_custo,
      valor: Number(f.valor || 0),
      moeda: f.moeda,
      data_cobranca: f.data_cobranca || '',
      projeto_vinculado_id: f.projeto_vinculado_id || '',
      ativo: f.ativo,
      link_acesso: f.link_acesso || '',
      usuario_acesso: f.usuario_acesso || '',
      senha_descriptografada: '', // Mantém vazio por segurança, só altera se redigitar
      observacoes: f.observacoes || ''
    });
    setIsToolModalOpen(true);
  };

  const handleToolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<FerramentaCusto> = {
        nome_ferramenta: toolForm.nome_ferramenta,
        categoria: toolForm.categoria,
        tipo_custo: toolForm.tipo_custo,
        valor: Number(toolForm.valor),
        moeda: toolForm.moeda,
        data_cobranca: toolForm.data_cobranca || undefined,
        projeto_vinculado_id: toolForm.projeto_vinculado_id || undefined,
        ativo: toolForm.ativo,
        link_acesso: toolForm.link_acesso || undefined,
        usuario_acesso: toolForm.usuario_acesso || undefined,
        observacoes: toolForm.observacoes || undefined
      };

      // Se o usuário digitou uma nova senha, criptografa antes de enviar
      if (toolForm.senha_descriptografada) {
        const encrypted = await encryptText(toolForm.senha_descriptografada);
        payload.senha_acesso_criptografada = encrypted;
      }

      if (editingTool) {
        const updated = await updateFerramenta(editingTool.id, payload);
        setSelectedTool(updated);
      } else {
        const created = await createFerramenta(payload);
        setSelectedTool(created);
      }
      setIsToolModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar ferramenta:', err);
    }
  };

  const handleDeleteTool = async () => {
    if (!toolToDelete) return;
    try {
      await deleteFerramenta(toolToDelete.id);
      if (selectedTool?.id === toolToDelete.id) {
        setSelectedTool(null);
      }
      setToolToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Erro ao excluir ferramenta:', err);
    }
  };

  // Reautenticar para Revelar Senha
  const handleRevealPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool || !selectedTool.senha_acesso_criptografada) return;
    
    setAuthError(null);
    setAuthenticating(true);

    try {
      const success = await reauthenticateUser(confirmPassword);
      
      if (success) {
        // Descriptografa a credencial
        const decrypted = await decryptText(selectedTool.senha_acesso_criptografada);
        setDecryptedPassword(decrypted);
        setIsAuthModalOpen(false);
        setConfirmPassword('');
        
        // Grava logs de auditoria
        await logCredentialAccess(selectedTool.id);
        
        // Recarrega logs na listagem de auditoria
        const freshLogs = await getLogsCredenciais();
        setAuditLogs(freshLogs);

        // Timer de 15 segundos para re-mascarar a credencial
        if (revealTimer) clearTimeout(revealTimer);
        const timer = window.setTimeout(() => {
          setDecryptedPassword(null);
        }, 15000);
        setRevealTimer(timer);
      } else {
        setAuthError('Senha incorreta do sistema. Acesso negado.');
      }
    } catch (err) {
      console.error('Erro ao descriptografar:', err);
      setAuthError('Senha incorreta ou falha de chave.');
    } finally {
      setAuthenticating(false);
    }
  };

  const closeRevealMode = () => {
    setDecryptedPassword(null);
    if (revealTimer) clearTimeout(revealTimer);
  };

  // --- CÁLCULO DE MÉTRICAS (Convertidas para BRL usando taxa 5.5 se USD) ---
  const activeTools = ferramentas.filter(f => f.ativo);
  
  const custoMensalTotal = activeTools.reduce((acc, t) => {
    let valorMensal = Number(t.valor || 0);
    if (t.tipo_custo === 'Anual') valorMensal /= 12;
    if (t.tipo_custo === 'Gratuito') valorMensal = 0;
    if (t.moeda === 'USD') valorMensal *= 5.5;
    return acc + valorMensal;
  }, 0);

  const custoAnualTotal = custoMensalTotal * 12;

  // Filtragem
  const filteredTools = ferramentas.filter(f => {
    const matchesSearch = f.nome_ferramenta.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.usuario_acesso && f.usuario_acesso.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.observacoes && f.observacoes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'todos' || f.categoria === categoryFilter;

    let matchesScope = true;
    if (scopeFilter === 'geral') matchesScope = !f.projeto_vinculado_id;
    if (scopeFilter === 'projeto') matchesScope = !!f.projeto_vinculado_id;

    return matchesSearch && matchesCategory && matchesScope;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Wrench className="text-mtabi-yellow" size={28} />
            FERRAMENTAS & CUSTOS
          </h1>
          <p className="text-sm text-mtabi-muted">Gerencie suas ferramentas e custos (recorrentes e pontuais).</p>
        </div>
        <button
          onClick={openNewToolModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-3 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-mtabi-yellow/20 cursor-pointer"
        >
          <Plus size={16} /> ADICIONAR FERRAMENTA
        </button>
      </div>

      {/* Métricas e Gastos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-mtabi-card border border-mtabi-border p-5 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Gasto Mensal Recorrente</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-mtabi-yellow mt-1">
              {custoMensalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-xs text-mtabi-muted mt-1">Soma de licenças mensais ativas (taxa USD ~ R$5.50)</p>
          </div>
          <div className="p-3.5 bg-mtabi-bg rounded-2xl border border-mtabi-border text-mtabi-yellow shrink-0">
            <Wrench size={24} />
          </div>
        </div>

        <div className="bg-mtabi-card border border-mtabi-border p-5 rounded-2xl flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Projeção de Gasto Anual</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
              {custoAnualTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-xs text-mtabi-muted mt-1">Custos anuais e recorrentes estimados em 12 meses</p>
          </div>
          <div className="p-3.5 bg-mtabi-bg rounded-2xl border border-mtabi-border text-white shrink-0">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* Esquerda: Filtros e Lista */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-mtabi-card border border-mtabi-border p-4 rounded-2xl space-y-3">
            {/* Campo Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-mtabi-muted" size={16} />
              <input
                type="text"
                placeholder="Buscar ferramenta ou login..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs focus:outline-none focus:border-mtabi-yellow text-white placeholder-mtabi-muted"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-mtabi-muted block mb-1">
                Categoria
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs text-white focus:outline-none focus:border-mtabi-yellow"
              >
                <option value="todos">Todas</option>
                {CATEGORIAS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Escopo */}
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-mtabi-muted block mb-1.5">
                Vínculo/Escopo
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['todos', 'geral', 'projeto'] as const).map(scope => (
                  <button
                    key={scope}
                    onClick={() => setScopeFilter(scope)}
                    className={`px-2 py-1 text-[9px] uppercase font-bold tracking-wider rounded-lg transition-colors border ${
                      scopeFilter === scope
                        ? 'bg-mtabi-yellow text-black border-mtabi-yellow'
                        : 'bg-mtabi-bg text-mtabi-muted border-mtabi-border hover:border-mtabi-muted/50'
                    }`}
                  >
                    {scope === 'todos' ? 'Ambos' : scope === 'geral' ? 'Geral' : 'Projeto'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listagem simples de ferramentas */}
          <div className="space-y-2 max-h-[50vh] lg:max-h-[60vh] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-center py-8 text-mtabi-muted text-xs animate-pulse">
                BUSCANDO FERRAMENTAS...
              </div>
            ) : filteredTools.length > 0 ? (
              filteredTools.map(f => (
                <div
                  key={f.id}
                  onClick={() => {
                    setSelectedTool(f);
                    closeRevealMode();
                  }}
                  className={`p-4 bg-mtabi-card border rounded-2xl cursor-pointer transition-all flex justify-between items-center group ${
                    selectedTool?.id === f.id
                      ? 'border-mtabi-yellow bg-mtabi-yellow/[0.01]'
                      : 'border-mtabi-border hover:border-mtabi-border/80'
                  }`}
                >
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-mtabi-yellow transition-colors uppercase tracking-wider">
                      {f.nome_ferramenta}
                    </h3>
                    <p className="text-[9px] text-mtabi-muted mt-1 uppercase tracking-wider">
                      {f.categoria} • {f.projeto_vinculado_id ? 'Projeto Específico' : 'Geral Empresa'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-white block">
                      {f.tipo_custo === 'Gratuito' ? (
                        <span className="text-mtabi-success uppercase text-[10px]">Gratuito</span>
                      ) : (
                        <>
                          {f.moeda === 'USD' ? '$' : 'R$'} {Number(f.valor).toFixed(2)}
                          <span className="text-[9px] text-mtabi-muted font-normal"> ({f.tipo_custo === 'Pago único' ? 'Único' : f.tipo_custo === 'Mensal' ? 'mês' : 'ano'})</span>
                        </>
                      )}
                    </span>
                    {!f.ativo && (
                      <span className="text-[8px] bg-zinc-800 text-mtabi-muted px-1.5 rounded uppercase tracking-wider font-bold mt-1 inline-block">Inativo</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-mtabi-card border border-mtabi-border rounded-2xl text-mtabi-muted text-xs">
                Nenhuma ferramenta encontrada
              </div>
            )}
          </div>
        </div>

        {/* Direita: Visualização Detalhada & Credenciais Mascaradas */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTool ? (
            <div className="bg-mtabi-card border border-mtabi-border rounded-2xl p-6 space-y-6">
              
              {/* Cabeçalho */}
              <div className="flex justify-between items-start border-b border-mtabi-border pb-5 gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display uppercase tracking-tight">
                    {selectedTool.nome_ferramenta}
                  </h2>
                  <p className="text-xs text-mtabi-muted mt-1 uppercase tracking-wider">
                    Categoria: <span className="text-white">{selectedTool.categoria}</span>
                    {selectedTool.projeto && (
                      <> • Vinculado ao Projeto: <span className="text-mtabi-yellow font-bold">{selectedTool.projeto.nome_solucao}</span></>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditToolModal(selectedTool)}
                    className="p-2 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white hover:text-mtabi-yellow rounded-xl transition-all cursor-pointer"
                    title="Editar Ferramenta"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => setToolToDelete(selectedTool)}
                    className="p-2 bg-mtabi-bg hover:bg-mtabi-error/10 border border-mtabi-border text-white hover:text-mtabi-error rounded-xl transition-all cursor-pointer"
                    title="Excluir Ferramenta"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Informações Financeiras */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-mtabi-bg border border-mtabi-border p-4 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Preço e Cobrança</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-mtabi-muted">Tipo Custo:</span>
                    <span className="text-white font-bold">{selectedTool.tipo_custo}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-mtabi-muted">Valor Cobrado:</span>
                    <span className="text-white font-bold">
                      {selectedTool.moeda === 'USD' ? '$' : 'R$'} {Number(selectedTool.valor).toFixed(2)}
                    </span>
                  </div>
                  {selectedTool.data_cobranca && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-mtabi-muted">Vencimento (Dia):</span>
                      <span className="text-mtabi-yellow font-bold">Dia {selectedTool.data_cobranca}</span>
                    </div>
                  )}
                </div>

                <div className="bg-mtabi-bg border border-mtabi-border p-4 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Configurações</h4>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-mtabi-muted">Status da Assinatura:</span>
                    <span className={`font-bold ${selectedTool.ativo ? 'text-mtabi-success' : 'text-mtabi-muted'}`}>
                      {selectedTool.ativo ? 'Ativa' : 'Pausada/Inativa'}
                    </span>
                  </div>
                  {selectedTool.link_acesso && (
                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-mtabi-border/40">
                      <a
                        href={selectedTool.link_acesso}
                        target="_blank"
                        rel="noreferrer"
                        className="text-mtabi-yellow hover:underline flex items-center gap-1"
                      >
                        <Globe size={12} /> Acessar ferramenta <ExternalLinkIcon size={10} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* CREDENCIAIS SEGURAS - FLUXO MASCARAMENTO & DESCRIPTOGRAFIA */}
              <div className="bg-mtabi-bg/50 border border-mtabi-border p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-mtabi-yellow border-b border-mtabi-border/60 pb-2">
                  <Lock size={16} />
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white">Credenciais de Acesso</h4>
                </div>

                <div className="space-y-3 font-sans text-xs">
                  {/* Link Copiável */}
                  {selectedTool.link_acesso && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-mtabi-muted w-24 shrink-0 font-medium">Link Login:</span>
                      <span className="text-white truncate font-mono select-all select-none">{selectedTool.link_acesso}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTool.link_acesso || '');
                          triggerCopyFeedback('link');
                        }}
                        className="p-1 hover:bg-mtabi-border text-mtabi-muted hover:text-white rounded transition-colors cursor-pointer"
                        title="Copiar Link"
                      >
                        {copiedField === 'link' ? <Check size={14} className="text-mtabi-success" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}

                  {/* Usuário Copiável */}
                  {selectedTool.usuario_acesso && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-mtabi-muted w-24 shrink-0 font-medium">Usuário/E-mail:</span>
                      <span className="text-white truncate font-mono select-all">{selectedTool.usuario_acesso}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedTool.usuario_acesso || '');
                          triggerCopyFeedback('usuario');
                        }}
                        className="p-1 hover:bg-mtabi-border text-mtabi-muted hover:text-white rounded transition-colors cursor-pointer"
                        title="Copiar Usuário"
                      >
                        {copiedField === 'usuario' ? <Check size={14} className="text-mtabi-success" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}

                  {/* Senha Mascarada com ícone de olho */}
                  {selectedTool.senha_acesso_criptografada ? (
                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-mtabi-border/40">
                      <span className="text-mtabi-muted w-24 shrink-0 font-medium">Senha Acesso:</span>
                      <span className="text-white font-mono text-sm tracking-wider flex-1 truncate">
                        {decryptedPassword ? (
                          <span className="bg-mtabi-yellow/10 text-mtabi-yellow px-2 py-0.5 rounded border border-mtabi-yellow/20 font-bold">
                            {decryptedPassword}
                          </span>
                        ) : (
                          '••••••••••••'
                        )}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        {decryptedPassword && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(decryptedPassword);
                              triggerCopyFeedback('senha');
                            }}
                            className="p-1 hover:bg-mtabi-border text-mtabi-muted hover:text-white rounded transition-colors cursor-pointer"
                            title="Copiar Senha Descriptografada"
                          >
                            {copiedField === 'senha' ? <Check size={14} className="text-mtabi-success" /> : <Copy size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (decryptedPassword) {
                              closeRevealMode();
                            } else {
                              setIsAuthModalOpen(true);
                            }
                          }}
                          className="p-1.5 hover:bg-mtabi-border text-mtabi-muted hover:text-white rounded transition-colors cursor-pointer"
                          title={decryptedPassword ? 'Esconder Senha' : 'Ver Senha (Requer Confirmação)'}
                        >
                          {decryptedPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-mtabi-muted pt-2 border-t border-mtabi-border/40 italic">
                      Nenhuma senha cadastrada para esta ferramenta.
                    </div>
                  )}

                  {decryptedPassword && (
                    <div className="text-[9px] text-mtabi-yellow/80 mt-2 bg-mtabi-yellow/5 border border-mtabi-yellow/20 p-2 rounded-lg leading-relaxed flex items-center gap-2 select-none">
                      <Activity className="shrink-0 animate-pulse" size={12} />
                      A senha será re-mascarada automaticamente em breve para sua segurança.
                    </div>
                  )}
                </div>
              </div>

              {/* Observações Gerais */}
              {selectedTool.observacoes && (
                <div className="bg-mtabi-bg/40 border border-mtabi-border p-4 rounded-xl">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1">Notas Gerais</h4>
                  <p className="text-xs text-mtabi-text leading-relaxed whitespace-pre-wrap">{selectedTool.observacoes}</p>
                </div>
              )}

            </div>
          ) : (
            <div className="h-96 bg-mtabi-card border border-mtabi-border rounded-2xl flex flex-col items-center justify-center text-mtabi-muted text-sm space-y-3">
              <Wrench size={48} className="text-mtabi-border" />
              <p>Selecione uma ferramenta para detalhamento comercial e credenciais.</p>
            </div>
          )}

          {/* Histórico / Logs de Auditoria das Credenciais */}
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl p-5 space-y-3 font-sans">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white border-b border-mtabi-border pb-2 flex items-center gap-2">
              <Activity size={14} className="text-mtabi-yellow" />
              Histórico de Acesso a Senhas
            </h4>
            {auditLogs.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {auditLogs.map(log => (
                  <div key={log.id} className="py-2 px-3 bg-mtabi-bg/50 border border-mtabi-border rounded-xl flex justify-between items-center text-[10px] text-mtabi-muted">
                    <span>
                      Senha de <span className="text-white font-bold">{log.ferramenta_nome}</span> foi revelada
                    </span>
                    <span className="font-mono text-[9px]">
                      {new Date(log.data_hora).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-mtabi-muted py-2">Nenhum log de acesso registrado.</p>
            )}
          </div>
        </div>

      </div>

      {/* MODAL REAUTENTICAÇÃO ANTES DE REVELAR SENHA */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-sm shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-mtabi-yellow mb-4 border-b border-mtabi-border pb-3 justify-between">
              <div className="flex items-center gap-2">
                <Lock size={20} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">CONFIRME SUA IDENTIDADE</h3>
              </div>
              <button onClick={() => {
                setIsAuthModalOpen(false);
                setConfirmPassword('');
                setAuthError(null);
              }} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleRevealPassword} className="space-y-4">
              <p className="text-xs text-mtabi-muted leading-relaxed">
                Por motivos de segurança, redigite a **senha de login do sistema** para descriptografar a credencial.
              </p>
              
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-mtabi-muted mb-2">
                  Senha do Painel MTABI
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Sua senha de login"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
              </div>

              {authError && (
                <div className="p-2.5 bg-mtabi-error/10 border border-mtabi-error/20 text-mtabi-error text-[10px] rounded-lg">
                  {authError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    setConfirmPassword('');
                    setAuthError(null);
                  }}
                  className="w-1/2 py-2 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={authenticating}
                  className="w-1/2 py-2 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {authenticating ? 'AUTENTICANDO...' : 'CONFIRMAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Criar / Editar Ferramenta */}
      {isToolModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {editingTool ? 'EDITAR FERRAMENTA' : 'CADASTRAR NOVA FERRAMENTA'}
              </h3>
              <button onClick={() => setIsToolModalOpen(false)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleToolSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Nome da Ferramenta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Claude 3.5 Sonnet"
                    value={toolForm.nome_ferramenta}
                    onChange={(e) => setToolForm({ ...toolForm, nome_ferramenta: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Categoria da Ferramenta *
                  </label>
                  <select
                    value={toolForm.categoria}
                    onChange={(e) => setToolForm({ ...toolForm, categoria: e.target.value as any })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  >
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Tipo de Custo *
                  </label>
                  <select
                    value={toolForm.tipo_custo}
                    onChange={(e) => setToolForm({ ...toolForm, tipo_custo: e.target.value as any })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  >
                    {CUSTOS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Moeda *
                  </label>
                  <select
                    value={toolForm.moeda}
                    onChange={(e) => setToolForm({ ...toolForm, moeda: e.target.value as any })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  >
                    <option value="BRL">BRL (R$)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Valor Cobrado (Moeda)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={toolForm.tipo_custo === 'Gratuito'}
                    value={toolForm.valor || ''}
                    onChange={(e) => setToolForm({ ...toolForm, valor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Dia Cobrança / Lembrete
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Dia 15 ou 20/08"
                    value={toolForm.data_cobranca}
                    onChange={(e) => setToolForm({ ...toolForm, data_cobranca: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Projeto Vinculado (Opcional)
                  </label>
                  <select
                    value={toolForm.projeto_vinculado_id}
                    onChange={(e) => setToolForm({ ...toolForm, projeto_vinculado_id: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  >
                    <option value="">-- Ferramenta Geral (Nenhum) --</option>
                    {projetos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome_solucao}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-mtabi-border pt-4 space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white">Credenciais de Acesso</h4>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    URL de Acesso/Login
                  </label>
                  <input
                    type="url"
                    placeholder="https://console.supabase.com"
                    value={toolForm.link_acesso}
                    onChange={(e) => setToolForm({ ...toolForm, link_acesso: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                      Usuário / E-mail de Login
                    </label>
                    <input
                      type="text"
                      placeholder="ex: admin@mtabi.com"
                      value={toolForm.usuario_acesso}
                      onChange={(e) => setToolForm({ ...toolForm, usuario_acesso: e.target.value })}
                      className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                      {editingTool ? 'Nova Senha (deixe vazio para manter)' : 'Senha de Acesso'}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={toolForm.senha_descriptografada}
                      onChange={(e) => setToolForm({ ...toolForm, senha_descriptografada: e.target.value })}
                      className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Notas Internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais ou notas de licença..."
                  value={toolForm.observacoes}
                  onChange={(e) => setToolForm({ ...toolForm, observacoes: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white resize-none"
                />
              </div>

              <div className="flex gap-2">
                <span className="text-[10px] text-mtabi-muted">Status Ativa</span>
                <input
                  type="checkbox"
                  checked={toolForm.ativo}
                  onChange={(e) => setToolForm({ ...toolForm, ativo: e.target.checked })}
                  className="w-4 h-4 rounded text-mtabi-yellow border-mtabi-border focus:ring-mtabi-yellow bg-mtabi-bg"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setIsToolModalOpen(false)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  {editingTool ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {toolToDelete && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-md shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-mtabi-error mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">EXCLUIR ASSINATURA</h3>
            </div>
            
            <p className="text-xs text-mtabi-muted leading-relaxed">
              Você está prestes a excluir permanentemente a ferramenta <span className="text-white font-bold">{toolToDelete.nome_ferramenta}</span>.
              Todos os registros de faturas, vencimentos e senhas criptografadas serão excluídos de forma irreversível.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setToolToDelete(null)}
                className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleDeleteTool}
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

// Componente Local auxiliar para não quebrar ícone de link externo do Lucide
const ExternalLinkIcon: React.FC<{ size: number }> = ({ size }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link">
      <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    </svg>
  );
};

export default Ferramentas;
