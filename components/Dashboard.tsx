import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, TrendingUp, AlertTriangle, Calendar, Wrench, ArrowRight, RefreshCw, DollarSign, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { getClientes, getPipeline, getFerramentas, getFinanceiroMovimentos } from '../services/supabaseService';
import { Cliente, PipelineLead, FerramentaCusto, FinanceiroMovimento } from '../types';

interface DashboardProps {
  onNavigate: (view: 'dashboard' | 'clientes' | 'projetos' | 'pipeline' | 'ferramentas' | 'financeiro') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [ferramentas, setFerramentas] = useState<FerramentaCusto[]>([]);
  const [movimentos, setMovimentos] = useState<FinanceiroMovimento[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [c, l, f, m] = await Promise.all([
        getClientes(),
        getPipeline(),
        getFerramentas(),
        getFinanceiroMovimentos()
      ]);
      setClientes(c);
      setLeads(l);
      setFerramentas(f);
      setMovimentos(m);
    } catch (err: any) {
      console.error('Erro ao carregar dados do Dashboard:', err);
      setError('Falha ao carregar informações de resumo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        {/* Equalizer animation loading */}
        <div className="flex items-end gap-1.5 h-12">
          <div className="w-2.5 bg-mtabi-yellow h-4 eq-bar eq-bar-1"></div>
          <div className="w-2.5 bg-mtabi-yellow h-8 eq-bar eq-bar-2"></div>
          <div className="w-2.5 bg-white h-4 eq-bar eq-bar-3"></div>
          <div className="w-2.5 bg-white h-8 eq-bar eq-bar-4"></div>
        </div>
        <p className="text-sm text-mtabi-muted uppercase tracking-widest font-display animate-pulse">
          Carregando Dashboard...
        </p>
      </div>
    );
  }

  // --- 1. INDICADORES ---
  const clientesAtivos = clientes.filter(c => c.status === 'Ativo').length;
  const leadsEmNegociacao = leads.filter(l => !['Fechado-Ganho', 'Fechado-Perdido'].includes(l.etapa)).length;

  // Receita do mês atual (Entradas únicas + Entrada recorrente mensal)
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtualNum = hoje.getMonth() + 1;
  const mesAtualStr = `${anoAtual}-${String(mesAtualNum).padStart(2, '0')}`;

  const movimentosMesAtual = movimentos.filter(m => m.mes_referencia === mesAtualStr && m.tipo !== 'Saída/custo' && m.status !== 'Cancelado');
  const receitaMes = movimentosMesAtual.reduce((acc, curr) => acc + Number(curr.valor), 0);

  // Custos de ferramentas ativos do mês
  const activeTools = ferramentas.filter(t => t.ativo);
  const custosFerramentasMes = activeTools.reduce((acc, t) => {
    let valorMensal = 0;
    if (t.tipo_custo === 'Mensal') {
      valorMensal = Number(t.valor);
    } else if (t.tipo_custo === 'Anual') {
      valorMensal = Number(t.valor) / 12;
    }
    // Custos em USD são convertidos usando uma taxa base fixa (ex: R$ 5,50) para estimativa
    if (t.moeda === 'USD') {
      valorMensal *= 5.5; 
    }
    return acc + valorMensal;
  }, 0);

  // Alertas de custos a vencer (nos próximos 5 dias)
  const diaDoMes = hoje.getDate();
  const ferramentasVencendo = activeTools.filter(t => {
    if (t.tipo_custo === 'Gratuito' || !t.data_cobranca) return false;
    const diaCobrancaNum = parseInt(t.data_cobranca.replace(/\D/g, ''), 10);
    if (isNaN(diaCobrancaNum)) return false;
    
    // Calcula diferença de dias
    let dif = diaCobrancaNum - diaDoMes;
    if (dif < 0) {
      // Próximo mês
      const diasNoMes = new Date(anoAtual, mesAtualNum, 0).getDate();
      dif = (diasNoMes - diaDoMes) + diaCobrancaNum;
    }
    return dif >= 0 && dif <= 5;
  });

  // --- 2. DADOS DO GRÁFICO DE RECEITA (Últimos 6 meses) ---
  const obterUltimos6Meses = () => {
    const meses = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const year = m.getFullYear();
      const month = String(m.getMonth() + 1).padStart(2, '0');
      meses.push(`${year}-${month}`);
    }
    return meses;
  };

  const ultimos6Meses = obterUltimos6Meses();
  const formatarMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split('-');
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${nomes[parseInt(mes, 10) - 1]}/${ano.slice(-2)}`;
  };

  const dadosGraficoReceita = ultimos6Meses.map(mesAno => {
    const movs = movimentos.filter(m => m.mes_referencia === mesAno && m.status !== 'Cancelado');
    const recorrente = movs
      .filter(m => m.tipo === 'Entrada recorrente mensal')
      .reduce((acc, curr) => acc + Number(curr.valor), 0);
    const pontual = movs
      .filter(m => m.tipo === 'Entrada única')
      .reduce((acc, curr) => acc + Number(curr.valor), 0);
    return {
      name: formatarMes(mesAno),
      Recorrente: recorrente,
      Pontual: pontual,
      Total: recorrente + pontual
    };
  });

  // --- 3. DADOS DO GRÁFICO DE PIZZA (Custos de ferramentas por categoria) ---
  const custosPorCategoria = activeTools.reduce((acc: { [key: string]: number }, t) => {
    let valorMensal = Number(t.valor);
    if (t.tipo_custo === 'Anual') valorMensal /= 12;
    if (t.tipo_custo === 'Gratuito') valorMensal = 0;
    if (t.moeda === 'USD') valorMensal *= 5.5; // Conversão estimada

    if (valorMensal > 0) {
      acc[t.categoria] = (acc[t.categoria] || 0) + valorMensal;
    }
    return acc;
  }, {});

  const dadosGraficoPizza = Object.keys(custosPorCategoria).map(cat => ({
    name: cat,
    value: Math.round(custosPorCategoria[cat])
  }));

  const COLORS = ['#F5B324', '#4ADE80', '#60A5FA', '#A78BFA', '#F87171', '#EC4899', '#9CA3AF'];

  // Próximas ações do Pipeline
  const próximasAções = leads
    .filter(l => !['Fechado-Ganho', 'Fechado-Perdido'].includes(l.etapa) && l.proxima_acao)
    .sort((a, b) => {
      if (!a.data_proxima_acao) return 1;
      if (!b.data_proxima_acao) return -1;
      return new Date(a.data_proxima_acao).getTime() - new Date(b.data_proxima_acao).getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
            <Activity className="text-mtabi-yellow" size={28} />
            DASHBOARD
          </h1>
          <p className="text-sm text-mtabi-muted">Visão geral do ecossistema e saúde financeira da MTABI.</p>
        </div>
      </div>

      {/* Alertas Críticos de Vencimento de Licenças */}
      {ferramentasVencendo.length > 0 && (
        <div className="p-4 bg-mtabi-error/15 border border-mtabi-error/30 rounded-2xl flex gap-3 text-white">
          <AlertTriangle className="text-mtabi-error shrink-0 mt-0.5 animate-bounce" size={20} />
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-mtabi-error">Licenças a Vencer nos Próximos 5 Dias</h4>
            <p className="text-xs text-mtabi-muted mt-1 leading-relaxed">
              As seguintes assinaturas expiram em breve. Verifique as cobranças:
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {ferramentasVencendo.map(t => (
                <span key={t.id} className="text-xs px-3 py-1 bg-mtabi-bg/50 border border-mtabi-error/30 text-white rounded-lg flex items-center gap-1.5">
                  <Calendar size={12} className="text-mtabi-error" />
                  <span className="font-bold">{t.nome_ferramenta}</span> (Dia {t.data_cobranca})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Indicadores Principais (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigate('clientes')}
          className="bg-mtabi-card border border-mtabi-border hover:border-mtabi-yellow/30 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-mtabi-muted">Clientes Ativos</span>
            <div className="p-2 bg-mtabi-bg rounded-lg border border-mtabi-border text-mtabi-yellow">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold font-display text-white">{clientesAtivos}</h3>
            <p className="text-xs text-mtabi-muted mt-1 flex items-center gap-1">
              Contratos ativos de consultoria/projeto
            </p>
          </div>
        </div>

        <div 
          onClick={() => onNavigate('pipeline')}
          className="bg-mtabi-card border border-mtabi-border hover:border-mtabi-yellow/30 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-mtabi-muted">CRM / Em Negociação</span>
            <div className="p-2 bg-mtabi-bg rounded-lg border border-mtabi-border text-mtabi-yellow">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold font-display text-white">{leadsEmNegociacao}</h3>
            <p className="text-xs text-mtabi-muted mt-1">
              Leads ativos no funil comercial
            </p>
          </div>
        </div>

        <div 
          onClick={() => onNavigate('financeiro')}
          className="bg-mtabi-card border border-mtabi-border hover:border-mtabi-yellow/30 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-mtabi-muted">Receita Prevista Mês</span>
            <div className="p-2 bg-mtabi-bg rounded-lg border border-mtabi-border text-mtabi-yellow">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold font-display text-mtabi-yellow">
              {receitaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-xs text-mtabi-muted mt-1">
              Mês de {hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div 
          onClick={() => onNavigate('ferramentas')}
          className="bg-mtabi-card border border-mtabi-border hover:border-mtabi-yellow/30 p-5 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-widest text-mtabi-muted">Custo Mensal Licenças</span>
            <div className="p-2 bg-mtabi-bg rounded-lg border border-mtabi-border text-mtabi-yellow">
              <Wrench size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-extrabold font-display text-white">
              {custosFerramentasMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <p className="text-xs text-mtabi-muted mt-1">
              {activeTools.length} ferramentas de desenvolvimento/infra
            </p>
          </div>
        </div>
      </div>

      {/* Seção de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Evolução de Receitas - Últimos 6 Meses */}
        <div className="bg-mtabi-card border border-mtabi-border p-5 rounded-2xl lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Evolução Faturamento</h3>
              <p className="text-xs text-mtabi-muted mt-0.5">Recorrente vs. Pontual nos últimos 6 meses</p>
            </div>
          </div>
          <div className="h-72 w-full font-sans text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosGraficoReceita}
                margin={{ top: 32, right: 10, left: -20, bottom: 0 }}
              >
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
                  labelStyle={{ fontWeight: 'bold', color: '#FFF' }}
                />
                <Legend iconType="rect" iconSize={10} wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Recorrente" stackId="a" fill="#F5B324" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pontual" stackId="a" fill="#60A5FA" radius={[2, 2, 0, 0]}>
                  <LabelList
                    dataKey="Pontual"
                    position="top"
                    content={(props: any) => {
                      const { x, y, width, index } = props;
                      const entry = dadosGraficoReceita[index];
                      if (!entry) return null;
                      const total = (entry.Recorrente || 0) + (entry.Pontual || 0);
                      if (!total) return null;
                      const label = total >= 1000000
                        ? `${(total / 1000000).toFixed(1)}M`
                        : total >= 1000
                        ? `${(total / 1000).toFixed(0)}k`
                        : `${total}`;
                      return (
                        <text
                          x={x + width / 2}
                          y={y - 5}
                          textAnchor="middle"
                          fill="#BCBCC0"
                          fontSize={10}
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {label}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Custos de Ferramentas */}
        <div className="bg-mtabi-card border border-mtabi-border p-5 rounded-2xl">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Custos por Categoria</h3>
            <p className="text-xs text-mtabi-muted mt-0.5">Distribuição mensal estimada de licenças</p>
          </div>
          <div className="h-60 w-full mt-4 flex items-center justify-center font-sans text-xs">
            {dadosGraficoPizza.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosGraficoPizza}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {dadosGraficoPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#17171A', borderColor: '#2A2A2E', borderRadius: '12px' }}
                    formatter={(value) => [`R$ ${value},00`, 'Custo Mensal']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-10 text-mtabi-muted">Nenhum custo ativo cadastrado</div>
            )}
          </div>
          
          {/* Legenda Lateral/Inferior da Pizza */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {dadosGraficoPizza.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-[10px] text-mtabi-muted truncate uppercase tracking-wider">{item.name}</span>
                <span className="text-[10px] font-bold text-white ml-auto">R$ {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lista Rápida: CRM & Ações Pendentes */}
      <div className="bg-mtabi-card border border-mtabi-border p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Próximas Ações do Pipeline</h3>
            <p className="text-xs text-mtabi-muted mt-0.5">Contatos e propostas aguardando retorno</p>
          </div>
          <button
            onClick={() => onNavigate('pipeline')}
            className="flex items-center gap-1.5 text-xs text-mtabi-yellow font-bold uppercase tracking-wider hover:underline"
          >
            Ver CRM completo <ArrowRight size={14} />
          </button>
        </div>

        {próximasAções.length > 0 ? (
          <div className="divide-y divide-mtabi-border font-sans">
            {próximasAções.map(lead => {
              const diasSemAtualizacao = lead.data_ultima_atualizacao
                ? Math.floor((new Date().getTime() - new Date(lead.data_ultima_atualizacao).getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              return (
                <div key={lead.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 first:pt-0 last:pb-0">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {lead.nome_lead || lead.cliente?.nome_empresa || 'Sem Nome'}
                    </h4>
                    <p className="text-xs text-mtabi-muted mt-0.5">
                      Próxima Ação: <span className="text-white font-medium">{lead.proxima_acao}</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 ml-auto md:ml-0 shrink-0">
                    {lead.data_proxima_acao && (
                      <span className="text-xs px-2.5 py-1 bg-mtabi-bg border border-mtabi-border rounded-lg text-white flex items-center gap-1">
                        <Calendar size={12} className="text-mtabi-yellow" />
                        {new Date(lead.data_proxima_acao).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    
                    <span className={`text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider rounded ${
                      lead.etapa === 'Primeiro contato' ? 'bg-zinc-800 text-zinc-400' :
                      lead.etapa === 'Proposta enviada' ? 'bg-blue-900/40 text-blue-400 border border-blue-800/40' :
                      lead.etapa === 'Em negociação' ? 'bg-amber-900/40 text-amber-400 border border-amber-800/40' :
                      lead.etapa === 'Aguardando decisão' ? 'bg-purple-900/40 text-purple-400 border border-purple-800/40' :
                      'bg-emerald-900/40 text-emerald-400'
                    }`}>
                      {lead.etapa}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-mtabi-muted">Nenhuma ação agendada no CRM no momento.</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
