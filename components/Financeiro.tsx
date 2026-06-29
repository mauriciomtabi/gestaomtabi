import React, { useState, useEffect } from 'react';
import { Landmark, Plus, Search, Filter, Calendar, DollarSign, Edit2, Trash2, X, AlertTriangle, ArrowUpRight, ArrowDownRight, TrendingUp, RefreshCw, BarChart } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { getFinanceiroMovimentos, createFinanceiroMovimento, updateFinanceiroMovimento, deleteFinanceiroMovimento, getClientes, getProjetos, getFerramentas, sincronizarTodosOsContratos } from '../services/supabaseService';
import { FinanceiroMovimento, Cliente, Projeto, FerramentaCusto } from '../types';

const Financeiro: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [movimentos, setMovimentos] = useState<FinanceiroMovimento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [ferramentas, setFerramentas] = useState<FerramentaCusto[]>([]);

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [monthFilter, setMonthFilter] = useState<string>('todos');
  const [clientFilter, setClientFilter] = useState<string>('todos');

  // Filtros específicos para o Gráfico
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [chartClient, setChartClient] = useState<string>('todos');

  // Modais CRUD Movimento
  const [isMovModalOpen, setIsMovModalOpen] = useState(false);
  const [editingMov, setEditingMov] = useState<FinanceiroMovimento | null>(null);
  
  const [movForm, setMovForm] = useState({
    cliente_id: '',
    projeto_id: '',
    tipo: 'Entrada recorrente mensal' as FinanceiroMovimento['tipo'],
    descricao: '',
    valor: 0,
    data_movimento: new Date().toISOString().split('T')[0],
    mes_referencia: new Date().toISOString().slice(0, 7), // AAAA-MM
    status: 'Confirmado' as FinanceiroMovimento['status']
  });

  // Confirmação de Exclusão
  const [movToDelete, setMovToDelete] = useState<FinanceiroMovimento | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      await sincronizarTodosOsContratos();
      const [m, c, p, f] = await Promise.all([
        getFinanceiroMovimentos(),
        getClientes(),
        getProjetos(),
        getFerramentas()
      ]);
      setMovimentos(m);
      setClientes(c);
      setProjetos(p);
      setFerramentas(f);
    } catch (e) {
      console.error('Erro ao carregar Financeiro:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewMovModal = () => {
    setEditingMov(null);
    setMovForm({
      cliente_id: clientes[0]?.id || '',
      projeto_id: '',
      tipo: 'Entrada recorrente mensal',
      descricao: '',
      valor: 0,
      data_movimento: new Date().toISOString().split('T')[0],
      mes_referencia: new Date().toISOString().slice(0, 7),
      status: 'Confirmado'
    });
    setIsMovModalOpen(true);
  };

  const openEditMovModal = (m: FinanceiroMovimento) => {
    setEditingMov(m);
    setMovForm({
      cliente_id: m.cliente_id,
      projeto_id: m.projeto_id || '',
      tipo: m.tipo,
      descricao: m.descricao,
      valor: Number(m.valor),
      data_movimento: m.data_movimento,
      mes_referencia: m.mes_referencia,
      status: m.status
    });
    setIsMovModalOpen(true);
  };

  const handleMovSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...movForm,
        projeto_id: movForm.projeto_id || undefined,
        valor: Number(movForm.valor)
      };

      if (editingMov) {
        await updateFinanceiroMovimento(editingMov.id, payload);
      } else {
        await createFinanceiroMovimento(payload);
      }
      setIsMovModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Erro ao salvar movimento:', err);
    }
  };

  const handleDeleteMov = async () => {
    if (!movToDelete) return;
    try {
      await deleteFinanceiroMovimento(movToDelete.id);
      setMovToDelete(null);
      await loadData();
    } catch (e) {
      console.error('Erro ao excluir movimento:', e);
    }
  };

  // --- CÁLCULO DE ESTATÍSTICAS ---
  const hoje = new Date();
  const mesAtualStr = hoje.toISOString().slice(0, 7); // AAAA-MM
  
  // Mês anterior
  const dataMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const mesAnteriorStr = dataMesAnterior.toISOString().slice(0, 7);

  // Receitas atuais vs anteriores
  const calcularReceitaMes = (mes: string) => {
    return movimentos
      .filter(m => m.mes_referencia === mes && m.tipo !== 'Saída/custo' && m.status !== 'Cancelado')
      .reduce((acc, curr) => acc + Number(curr.valor), 0);
  };

  const receitaMesAtual = calcularReceitaMes(mesAtualStr);
  const receitaMesAnterior = calcularReceitaMes(mesAnteriorStr);
  
  // Percentual de mudança
  const diferencaReceitaPercentual = receitaMesAnterior > 0 
    ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100 
    : 0;

  // Custos de licenças mensais ativas
  const custosMensaisFerramentas = ferramentas
    .filter(f => f.ativo)
    .reduce((acc, f) => {
      let valorMensal = Number(f.valor);
      if (f.tipo_custo === 'Anual') valorMensal /= 12;
      if (f.tipo_custo === 'Gratuito') valorMensal = 0;
      if (f.moeda === 'USD') valorMensal *= 5.5; // Câmbio
      return acc + valorMensal;
    }, 0);

  // Margem Líquida Operacional do Mês
  const margemLiquidaValor = receitaMesAtual - custosMensaisFerramentas;
  const margemPercentual = receitaMesAtual > 0 ? (margemLiquidaValor / receitaMesAtual) * 100 : 0;

  // --- EVOLUÇÃO MRR (Todos os 12 meses do Ano Selecionado) ---
  const obterMesesDoAno = (ano: number) => {
    const meses = [];
    for (let i = 0; i < 12; i++) {
      const m = new Date(ano, i, 1);
      meses.push(m.toISOString().slice(0, 7));
    }
    return meses;
  };

  const obterAnosDisponiveis = () => {
    const anos = new Set<number>();
    anos.add(new Date().getFullYear()); // Garante o ano atual
    movimentos.forEach(m => {
      if (m.mes_referencia) {
        const y = parseInt(m.mes_referencia.split('-')[0], 10);
        if (!isNaN(y)) anos.add(y);
      }
    });
    return Array.from(anos).sort((a, b) => b - a); // Decrescente
  };

  const anosDisponiveis = obterAnosDisponiveis();
  const mesesGrafico = obterMesesDoAno(chartYear);

  const formatarMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-');
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${nomes[parseInt(mes, 10) - 1]}/${ano.slice(-2)}`;
  };

  const dadosMRR = mesesGrafico.map(mStr => {
    let filteredMovs = movimentos.filter(m => 
      m.mes_referencia === mStr && 
      m.tipo === 'Entrada recorrente mensal'
    );

    if (chartClient !== 'todos') {
      filteredMovs = filteredMovs.filter(m => m.cliente_id === chartClient);
    }

    const pago = filteredMovs
      .filter(m => m.status === 'Confirmado')
      .reduce((acc, curr) => acc + Number(curr.valor), 0);

    const pendente = filteredMovs
      .filter(m => m.status === 'Atrasado')
      .reduce((acc, curr) => acc + Number(curr.valor), 0);

    const projetado = filteredMovs
      .filter(m => m.status === 'Previsto')
      .reduce((acc, curr) => acc + Number(curr.valor), 0);

    return {
      name: formatarMes(mStr),
      Pago: pago,
      Pendente: pendente,
      Projetado: projetado
    };
  });

  // Lista única de meses para o filtro
  const todosMesesReferencia = Array.from(new Set(movimentos.map(m => m.mes_referencia))) as string[];
  todosMesesReferencia.sort((a, b) => b.localeCompare(a));

  // Filtragem da tabela
  const filteredMovimentos = movimentos.filter(m => {
    const matchesSearch = m.descricao.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.cliente?.nome_empresa && m.cliente.nome_empresa.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'todos' || m.tipo === typeFilter;
    const matchesMonth = monthFilter === 'todos' || m.mes_referencia === monthFilter;
    const matchesClient = clientFilter === 'todos' || m.cliente_id === clientFilter;

    return matchesSearch && matchesType && matchesMonth && matchesClient;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Landmark className="text-mtabi-yellow" size={28} />
            FINANCEIRO CONSOLIDADO
          </h1>
          <p className="text-sm text-mtabi-muted">Gestão de faturamentos recorrentes, entradas pontuais e margens operacionais.</p>
        </div>
        <button
          onClick={openNewMovModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-3 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-mtabi-yellow/20 cursor-pointer"
        >
          <Plus size={16} /> NOVO LANÇAMENTO
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Recebido Mês */}
        <div className="bg-mtabi-card border border-mtabi-border p-5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Faturamento do Mês</span>
          <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-white mt-1">
            {receitaMesAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {diferencaReceitaPercentual >= 0 ? (
              <span className="text-mtabi-success font-bold flex items-center gap-0.5">
                <ArrowUpRight size={14} /> +{diferencaReceitaPercentual.toFixed(1)}%
              </span>
            ) : (
              <span className="text-mtabi-error font-bold flex items-center gap-0.5">
                <ArrowDownRight size={14} /> {diferencaReceitaPercentual.toFixed(1)}%
              </span>
            )}
            <span className="text-mtabi-muted">vs. mês anterior ({receitaMesAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })})</span>
          </div>
        </div>

        {/* Custo Licenças */}
        <div className="bg-mtabi-card border border-mtabi-border p-5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Overhead Operacional (Software)</span>
          <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-mtabi-muted mt-1">
            {custosMensaisFerramentas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
          <p className="text-xs text-mtabi-muted mt-2">Custo total ativo de ferramentas dev e infraestrutura</p>
        </div>

        {/* Margem Operacional */}
        <div className="bg-mtabi-card border border-mtabi-border p-5 rounded-2xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mtabi-muted">Margem Líquida do Mês</span>
          <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-mtabi-yellow mt-1">
            {margemLiquidaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <span className="text-mtabi-success font-bold flex items-center gap-0.5">
              <TrendingUp size={14} /> {margemPercentual.toFixed(1)}%
            </span>
            <span className="text-mtabi-muted">de eficiência operacional real</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução MRR */}
      <div className="bg-mtabi-card border border-mtabi-border p-5 rounded-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Evolução do MRR (Receita Recorrente Mensal)</h3>
            <p className="text-xs text-mtabi-muted mt-0.5">Visão histórica de estabilidade e contratos fixos</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            {/* Filtros do Gráfico */}
            <div className="flex items-center gap-2">
              <select
                value={chartClient}
                onChange={(e) => setChartClient(e.target.value)}
                className="p-1.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-mtabi-yellow uppercase cursor-pointer"
              >
                <option value="todos">Todos Clientes</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_empresa}</option>
                ))}
              </select>

              <select
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
                className="p-1.5 bg-mtabi-bg border border-mtabi-border rounded-xl text-[10px] font-bold text-white focus:outline-none focus:border-mtabi-yellow cursor-pointer"
              >
                {anosDisponiveis.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Legenda Customizada */}
            <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider font-sans">
              <div className="flex items-center gap-1 text-mtabi-success">
                <span className="w-2 h-2 rounded-full bg-mtabi-success" />
                <span>Pago</span>
              </div>
              <div className="flex items-center gap-1 text-mtabi-error">
                <span className="w-2 h-2 rounded-full bg-mtabi-error" />
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-1 text-mtabi-yellow">
                <span className="w-2 h-2 rounded-full bg-mtabi-yellow" />
                <span>Projetado</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-72 w-full mt-6 font-sans text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={dadosMRR} margin={{ top: 28, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#8A8A8F" tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#8A8A8F"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => {
                  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
                  return `R$ ${v}`;
                }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#17171A', borderColor: '#2A2A2E', borderRadius: '12px' }}
                formatter={(value, name) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, name]}
              />
              <Bar dataKey="Pago" stackId="a" fill="#10b981" name="Pago" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Pendente" stackId="a" fill="#ef4444" name="Pendente" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Projetado" stackId="a" fill="#F5B324" name="Projetado" radius={[4, 4, 0, 0]}>
                <LabelList
                  valueAccessor={(entry: any) => {
                    const total = (entry.Pago || 0) + (entry.Pendente || 0) + (entry.Projetado || 0);
                    if (total === 0) return '';
                    if (total >= 1000000) return `${(total / 1000000).toFixed(1)}M`;
                    if (total >= 1000) return `${(total / 1000).toFixed(0)}k`;
                    return `${total}`;
                  }}
                  position="top"
                  style={{ fill: '#BCBCC0', fontSize: 9, fontWeight: 700, fontFamily: 'sans-serif' }}
                />
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Lançamentos & Filtros */}
      <div className="bg-mtabi-card border border-mtabi-border rounded-2xl p-5 space-y-4 font-sans">
        
        {/* Painel Filtros da Tabela */}
        <div className="flex flex-col xl:flex-row gap-3 items-center">
          
          <div className="relative w-full xl:max-w-xs">
            <Search className="absolute left-3 top-2.5 text-mtabi-muted" size={16} />
            <input
              type="text"
              placeholder="Buscar lançamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs focus:outline-none focus:border-mtabi-yellow text-white placeholder-mtabi-muted"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 w-full xl:w-auto xl:flex xl:items-center">
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs text-white focus:outline-none focus:border-mtabi-yellow"
            >
              <option value="todos">Todos Tipos</option>
              <option value="Entrada recorrente mensal">Recorrente mensal</option>
              <option value="Entrada única">Entrada única</option>
              <option value="Saída/custo">Saída / Custo</option>
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="p-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs text-white focus:outline-none focus:border-mtabi-yellow"
            >
              <option value="todos">Todos Meses</option>
              {todosMesesReferencia.map(m => (
                <option key={m} value={m}>{formatarMes(m)}</option>
              ))}
            </select>

            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="p-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-xs text-white focus:outline-none focus:border-mtabi-yellow"
            >
              <option value="todos">Todos Clientes</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome_empresa}</option>
              ))}
            </select>

          </div>

          <div className="text-xs text-mtabi-muted font-bold uppercase tracking-wider ml-auto font-mono">
            Filtrados: <span className="text-white">R$ {filteredMovimentos.reduce((acc, curr) => acc + (curr.tipo === 'Saída/custo' ? -Number(curr.valor) : Number(curr.valor)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-mtabi-border text-mtabi-muted text-[10px] uppercase tracking-wider">
                <th className="py-2.5">Data</th>
                <th className="py-2.5">Cliente</th>
                <th className="py-2.5">Descrição</th>
                <th className="py-2.5">Mês Ref</th>
                <th className="py-2.5">Tipo</th>
                <th className="py-2.5">Valor</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mtabi-border/40 text-white">
              {filteredMovimentos.length > 0 ? (
                filteredMovimentos.map(mov => (
                  <tr key={mov.id} className="hover:bg-mtabi-border/10">
                    <td className="py-3 font-mono">{new Date(mov.data_movimento).toLocaleDateString('pt-BR')}</td>
                    <td className="py-3 font-bold truncate max-w-[120px]">{mov.cliente?.nome_empresa || 'Empresa Geral'}</td>
                    <td className="py-3 truncate max-w-[200px]">{mov.descricao}</td>
                    <td className="py-3 font-mono">{formatarMes(mov.mes_referencia)}</td>
                    <td className="py-3 text-[10px] uppercase tracking-wider text-mtabi-muted">{mov.tipo}</td>
                    <td className={`py-3 font-extrabold ${mov.tipo === 'Saída/custo' ? 'text-mtabi-error' : 'text-mtabi-success'}`}>
                      {mov.tipo === 'Saída/custo' ? '-' : '+'} R$ {Number(mov.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3">
                      <select
                        value={mov.status}
                        onChange={async (e) => {
                          try {
                            setLoading(true);
                            await updateFinanceiroMovimento(mov.id, {
                              status: e.target.value as any
                            });
                            await loadData();
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded bg-mtabi-bg border cursor-pointer uppercase transition-colors outline-none ${
                          mov.status === 'Confirmado' ? 'border-mtabi-success/40 text-mtabi-success bg-emerald-950/30' :
                          mov.status === 'Previsto' ? 'border-mtabi-muted/40 text-mtabi-muted bg-zinc-800/40' :
                          mov.status === 'Atrasado' ? 'border-mtabi-error/40 text-mtabi-error bg-red-950/30' :
                          'border-zinc-800 text-zinc-550 bg-zinc-900/40'
                        }`}
                      >
                        <option value="Confirmado" className="bg-mtabi-card text-mtabi-success font-bold text-[9px]">PAGO</option>
                        <option value="Atrasado" className="bg-mtabi-card text-mtabi-error font-bold text-[9px]">PENDENTE</option>
                        <option value="Previsto" className="bg-mtabi-card text-mtabi-muted font-bold text-[9px]">PROJETADO</option>
                        <option value="Cancelado" className="bg-mtabi-card text-zinc-500 font-bold text-[9px]">CANCELADO</option>
                      </select>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditMovModal(mov)}
                          className="p-1 hover:bg-mtabi-border text-mtabi-muted hover:text-white rounded transition-colors cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => setMovToDelete(mov)}
                          className="p-1 hover:bg-mtabi-error/10 text-mtabi-muted hover:text-mtabi-error rounded transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-mtabi-muted">Nenhum lançamento financeiro registrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Criar / Editar Lançamento */}
      {isMovModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
            <div className="flex justify-between items-center p-5 border-b border-mtabi-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                {editingMov ? 'EDITAR LANÇAMENTO FINANCEIRO' : 'NOVO LANÇAMENTO FINANCEIRO'}
              </h3>
              <button onClick={() => setIsMovModalOpen(false)} className="text-mtabi-muted hover:text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleMovSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Cliente Relacionado *
                  </label>
                  <select
                    required
                    value={movForm.cliente_id}
                    onChange={(e) => setMovForm({ ...movForm, cliente_id: e.target.value })}
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
                    Projeto Vinculado (Opcional)
                  </label>
                  <select
                    value={movForm.projeto_id}
                    onChange={(e) => setMovForm({ ...movForm, projeto_id: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white font-sans"
                  >
                    <option value="">-- Lançamento Geral do Cliente (Nenhum) --</option>
                    {projetos
                      .filter(p => p.cliente_id === movForm.cliente_id)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.nome_solucao}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Tipo de Lançamento *
                  </label>
                  <select
                    value={movForm.tipo}
                    onChange={(e) => setMovForm({ ...movForm, tipo: e.target.value as any })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white font-sans"
                  >
                    <option value="Entrada recorrente mensal">Entrada Recorrente Mensal</option>
                    <option value="Entrada única">Entrada Única (Pontual)</option>
                    <option value="Saída/custo">Saída / Custo Operacional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Valor Operação (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={movForm.valor || ''}
                    onChange={(e) => setMovForm({ ...movForm, valor: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Data do Movimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={movForm.data_movimento}
                    onChange={(e) => {
                      const dateVal = e.target.value;
                      const refStr = dateVal.slice(0, 7); // AAAA-MM
                      setMovForm({ ...movForm, data_movimento: dateVal, mes_referencia: refStr });
                    }}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                    Mês de Referência (AAAA-MM) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2026-06"
                    value={movForm.mes_referencia}
                    onChange={(e) => setMovForm({ ...movForm, mes_referencia: e.target.value })}
                    className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Status *
                </label>
                <select
                  value={movForm.status}
                  onChange={(e) => setMovForm({ ...movForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white font-sans"
                >
                  <option value="Confirmado">Confirmado / Recebido</option>
                  <option value="Previsto">Previsto / Lançado</option>
                  <option value="Atrasado">Atrasado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mtabi-muted mb-1.5">
                  Descrição do Lançamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagamento Consultoria Junho/26"
                  value={movForm.descricao}
                  onChange={(e) => setMovForm({ ...movForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-mtabi-bg border border-mtabi-border rounded-xl text-sm focus:outline-none focus:border-mtabi-yellow text-white"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-mtabi-border">
                <button
                  type="button"
                  onClick={() => setIsMovModalOpen(false)}
                  className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-mtabi-yellow hover:bg-mtabi-yellow/90 text-black text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
                >
                  {editingMov ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {movToDelete && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-mtabi-card border border-mtabi-border rounded-2xl w-full max-w-md shadow-2xl p-6 font-sans">
            <div className="flex items-center gap-3 text-mtabi-error mb-4">
              <AlertTriangle size={28} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">EXCLUIR LANÇAMENTO FINANCEIRO</h3>
            </div>
            
            <p className="text-xs text-mtabi-muted leading-relaxed">
              Você está prestes a excluir permanentemente o lançamento financeiro <span className="text-white font-bold">"{movToDelete.descricao}"</span>.
              Esta operação é irreversível e afetará os cálculos de margem líquida e MRR.
            </p>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMovToDelete(null)}
                className="w-1/2 py-2.5 bg-mtabi-bg hover:bg-mtabi-border border border-mtabi-border text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={handleDeleteMov}
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

export default Financeiro;
