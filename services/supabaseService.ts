import { createClient } from '@supabase/supabase-js';
import { Operator, Cliente, Projeto, FerramentaCusto, PipelineLead, FinanceiroMovimento, LogAcessoCredencial, Contrato } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rpnyobdmaaanyuquywiv.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnlvYmRtYWFhbnl1cXV5d2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzIzODEsImV4cCI6MjA5ODEwODM4MX0.6ROH6dNdkdoNrfEl4kdEOyU_FASD0iGuSt8irtYueBg';

const customStorage = {
  getItem: (key: string) => {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch (e) {}
  },
  removeItem: (key: string) => {
    try { localStorage.removeItem(key); } catch (e) {}
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
    storageKey: 'supabase.auth.token.mtabi-gestao'
  }
});

// ==========================================
// CONFIGURAÇÃO DO MODO DEMONSTRAÇÃO (MOCK)
// ==========================================

export const isMockMode = (): boolean => {
  return false;
};

export const setMockMode = (active: boolean) => {
  localStorage.setItem('mtabi_use_mock', active ? 'true' : 'false');
};

// Dados semente para a demonstração inicial
const MOCK_CLIENTES: Cliente[] = [
  {
    id: 'c1-mock-id',
    nome_empresa: 'SaaS Booster Inc',
    nome_contato_principal: 'Lucas Decisor',
    nome_contato_interno: 'Aline Dev',
    segmento: 'Tecnologia',
    status: 'Ativo',
    tipo_relacao: 'Ambos',
    observacoes: 'Cliente recorrente de assessoria técnica + desenvolvimento de hubs adicionais.'
  },
  {
    id: 'c2-mock-id',
    nome_empresa: 'BioCare Health',
    nome_contato_principal: 'Dra. Julia Castro',
    nome_contato_interno: 'Felipe Gerente',
    segmento: 'Saúde',
    status: 'Negociação',
    tipo_relacao: 'Projeto único',
    observacoes: 'Negociação para desenvolvimento do app de telemedicina.'
  },
  {
    id: 'c3-mock-id',
    nome_empresa: 'FinTech Pro',
    nome_contato_principal: 'Ricardo CEO',
    nome_contato_interno: 'Carlos Financeiro',
    segmento: 'Finanças',
    status: 'Pausado',
    tipo_relacao: 'Consultoria recorrente',
    observacoes: 'Contrato recorrente de suporte de arquitetura pausado temporariamente.'
  }
];

const MOCK_PROJETOS: Projeto[] = [
  {
    id: 'p1-mock-id',
    cliente_id: 'c1-mock-id',
    nome_solucao: 'Portal do Cliente Booster',
    descricao: 'Dashboard completo para os assinantes controlarem seus planos e integrações.',
    status: 'Em produção',
    link_acesso: 'https://portal.saasbooster.com',
    ferramenta_dev: ['Antigravity', 'AI Studio', 'React', 'Vite'],
    banco_dados: 'Supabase Postgres',
    repositorio_url: 'https://github.com/saasbooster/portal',
    hospedagem_imagens: 'Supabase Storage',
    hospedagem_geral: 'Vercel',
    data_inicio: '2026-01-10',
    data_entrega_prevista: '2026-04-15',
    valor_projeto: 12000,
    valor_mensal: 1500,
    observacoes: 'Sistema rodando perfeitamente. Cobrança de manutenção ativa.'
  },
  {
    id: 'p2-mock-id',
    cliente_id: 'c1-mock-id',
    nome_solucao: 'Integração CRM HubSpot',
    descricao: 'Microserviço para sincronizar leads e tags de faturamento do portal.',
    status: 'Em desenvolvimento',
    link_acesso: 'https://staging.hubspot.saasbooster.com',
    ferramenta_dev: ['Lovable', 'Claude Code', 'Node.js'],
    banco_dados: 'Postgres',
    repositorio_url: 'https://github.com/saasbooster/hubspot-sync',
    hospedagem_imagens: 'N/A',
    hospedagem_geral: 'Railway',
    data_inicio: '2026-05-01',
    data_entrega_prevista: '2026-07-15',
    valor_projeto: 8000,
    valor_mensal: 0,
    observacoes: 'Aguardando validação dos webhooks de produção pela equipe técnica do cliente.'
  },
  {
    id: 'p3-mock-id',
    cliente_id: 'c2-mock-id',
    nome_solucao: 'App Telemedicina BioCare',
    descricao: 'Aplicativo mobile PWA para agendamento e chamadas de vídeo integradas.',
    status: 'Em negociação',
    ferramenta_dev: ['Vite', 'React', 'Tailwind'],
    banco_dados: 'Firebase Firestore',
    repositorio_url: '',
    hospedagem_imagens: 'Cloudinary',
    hospedagem_geral: 'Netlify',
    data_inicio: '2026-07-01',
    data_entrega_prevista: '2026-10-30',
    valor_projeto: 22000,
    valor_mensal: 800,
    observacoes: 'Proposta comercial enviada e sob aprovação da diretoria.'
  }
];

const MOCK_FERRAMENTAS: FerramentaCusto[] = [
  {
    id: 'f1-mock-id',
    nome_ferramenta: 'Claude Team Plan',
    categoria: 'IA/Dev',
    tipo_custo: 'Mensal',
    valor: 30,
    moeda: 'USD',
    data_cobranca: '15',
    projeto_vinculado_id: undefined,
    ativo: true,
    link_acesso: 'https://claude.ai',
    usuario_acesso: 'mtabi.adm@gmail.com',
    senha_acesso_criptografada: '23f8b89812df082729a8ec8db34f78de19b88cc4f728c467a843', // Simulado criptografado
    observacoes: 'Ferramenta de uso geral no desenvolvimento.'
  },
  {
    id: 'f2-mock-id',
    nome_ferramenta: 'Supabase Pro Tier',
    categoria: 'Banco de Dados',
    tipo_custo: 'Mensal',
    valor: 25,
    moeda: 'USD',
    data_cobranca: '28',
    projeto_vinculado_id: undefined,
    ativo: true,
    link_acesso: 'https://supabase.com',
    usuario_acesso: 'mtabi.adm@gmail.com',
    senha_acesso_criptografada: '62e7aa23b89012cd34a2e57bc8dfa32b192837bcdaea8c928b9c',
    observacoes: 'Banco de dados principal de testes e homologação.'
  },
  {
    id: 'f3-mock-id',
    nome_ferramenta: 'Vercel Team Upgrade',
    categoria: 'Hospedagem',
    tipo_custo: 'Mensal',
    valor: 20,
    moeda: 'USD',
    data_cobranca: '05',
    projeto_vinculado_id: 'p1-mock-id', // Portal do cliente Booster
    ativo: true,
    link_acesso: 'https://vercel.com',
    usuario_acesso: 'mtabi.adm@gmail.com',
    senha_acesso_criptografada: '52df25b3c8f9aa182bc8c5bc6b8fef8de1b55ff8de8c6b29cf',
    observacoes: 'Hospedagem vinculada ao Portal do Cliente. Custo repassado na manutenção.'
  },
  {
    id: 'f4-mock-id',
    nome_ferramenta: 'Figma Professional',
    categoria: 'Design',
    tipo_custo: 'Mensal',
    valor: 15,
    moeda: 'USD',
    data_cobranca: '10',
    projeto_vinculado_id: undefined,
    ativo: false,
    link_acesso: 'https://figma.com',
    usuario_acesso: 'design@mtabi.com',
    senha_acesso_criptografada: '82ebaa53bd9c1b3fbc8c5bcbb8fef8de1b55ff8de',
    observacoes: 'Assinatura pausada temporariamente (usando plano gratuito).'
  }
];

const MOCK_PIPELINE: PipelineLead[] = [
  {
    id: 'l1-mock-id',
    nome_lead: 'AgroTech Export',
    etapa: 'Primeiro contato',
    valor_estimado: 25000,
    decisor_nome: 'Roberto Agro',
    campeao_interno_nome: 'Tadeu Campo',
    proxima_acao: 'Enviar portfólio de soluções de BI',
    data_proxima_acao: '2026-06-29',
    probabilidade: 40,
    observacoes: 'Contato frio estabelecido via LinkedIn. Demonstrou interesse.'
  },
  {
    id: 'l2-mock-id',
    nome_lead: 'Logística Express',
    etapa: 'Proposta enviada',
    valor_estimado: 18000,
    decisor_nome: 'Sofia Transportes',
    proxima_acao: 'Ligar para alinhar prazos de desenvolvimento',
    data_proxima_acao: '2026-06-30',
    probabilidade: 70,
    observacoes: 'Proposta técnica e comercial enviada. Feedbacks iniciais positivos.'
  },
  {
    id: 'l3-mock-id',
    nome_lead: 'Escola Aprender PWA',
    etapa: 'Em negociação',
    valor_estimado: 12000,
    decisor_nome: 'Diretor Marcos',
    proxima_acao: 'Reunião de apresentação técnica do escopo',
    data_proxima_acao: '2026-07-02',
    probabilidade: 60,
    observacoes: 'Negociando parcelamento do valor único de desenvolvimento.'
  }
];

const MOCK_FINANCEIRO: FinanceiroMovimento[] = [
  {
    id: 'm1-mock-id',
    cliente_id: 'c1-mock-id',
    projeto_id: 'p1-mock-id',
    tipo: 'Entrada recorrente mensal',
    descricao: 'Mensalidade Consultoria - Portal Booster (Jun/26)',
    valor: 1500,
    data_movimento: '2026-06-10',
    mes_referencia: '2026-06',
    status: 'Confirmado'
  },
  {
    id: 'm2-mock-id',
    cliente_id: 'c1-mock-id',
    projeto_id: 'p1-mock-id',
    tipo: 'Entrada única',
    descricao: 'Marcos de Entrega 2/2 Portal Booster',
    valor: 6000,
    data_movimento: '2026-06-15',
    mes_referencia: '2026-06',
    status: 'Confirmado'
  },
  {
    id: 'm3-mock-id',
    cliente_id: 'c1-mock-id',
    projeto_id: 'p1-mock-id',
    tipo: 'Entrada recorrente mensal',
    descricao: 'Mensalidade Consultoria - Portal Booster (Mai/26)',
    valor: 1500,
    data_movimento: '2026-05-10',
    mes_referencia: '2026-05',
    status: 'Confirmado'
  },
  {
    id: 'm4-mock-id',
    cliente_id: 'c1-mock-id',
    projeto_id: 'p2-mock-id',
    tipo: 'Entrada única',
    descricao: 'Adiantamento 50% Integração CRM HubSpot',
    valor: 4000,
    data_movimento: '2026-05-20',
    mes_referencia: '2026-05',
    status: 'Confirmado'
  },
  {
    id: 'm5-mock-id',
    cliente_id: 'c1-mock-id',
    projeto_id: 'p1-mock-id',
    tipo: 'Entrada recorrente mensal',
    descricao: 'Mensalidade Consultoria - Portal Booster (Jul/26)',
    valor: 1500,
    data_movimento: '2026-07-10',
    mes_referencia: '2026-07',
    status: 'Previsto'
  },
  {
    id: 'm6-mock-id',
    cliente_id: 'c1-mock-id',
    projeto_id: 'p1-mock-id',
    tipo: 'Saída/custo',
    descricao: 'Assinatura Vercel Team (Jun/26)',
    valor: 110,
    data_movimento: '2026-06-05',
    mes_referencia: '2026-06',
    status: 'Confirmado'
  }
];

const MOCK_LOGS: LogAcessoCredencial[] = [
  {
    id: 'log1-mock-id',
    ferramenta_id: 'f1-mock-id',
    data_hora: '2026-06-25T14:32:00.000Z',
    acao: 'revelou senha'
  }
];

// Helper para leitura do LocalStorage ou fallback para Mock semente
function getLocalData<T>(key: string, seed: T[]): T[] {
  const local = localStorage.getItem(key);
  if (!local) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(local);
  } catch (e) {
    return seed;
  }
}

function saveLocalData<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ==========================================
// SERVIÇOS DE AUTENTICAÇÃO E PERFIL
// ==========================================

export const reauthenticateUser = async (password: string): Promise<boolean> => {
  if (isMockMode()) {
    // No modo de demonstração, qualquer senha funciona (ou mtabi123)
    return password.length > 0;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user.email) return false;
    
    const { error } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password
    });
    
    return !error;
  } catch (error) {
    console.error('Erro na reautenticação:', error);
    return false;
  }
};

// ==========================================
// CRUD: CLIENTES
// ==========================================

export const getClientes = async (): Promise<Cliente[]> => {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('nome_empresa', { ascending: true });
    
  if (error) throw error;
  return data || [];
};

export const createCliente = async (cliente: Partial<Cliente>): Promise<Cliente> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_clientes', MOCK_CLIENTES);
    const newClient: Cliente = {
      id: 'c-' + Math.random().toString(36).substring(2, 9),
      nome_empresa: cliente.nome_empresa || 'Empresa Nova',
      logo_url: cliente.logo_url,
      nome_contato_principal: cliente.nome_contato_principal,
      nome_contato_interno: cliente.nome_contato_interno,
      segmento: cliente.segmento,
      status: cliente.status || 'Ativo',
      tipo_relacao: cliente.tipo_relacao || 'Projeto único',
      observacoes: cliente.observacoes,
      valor_recorrente: cliente.valor_recorrente,
      link_contrato: cliente.link_contrato,
      data_criacao: new Date().toISOString()
    };
    data.push(newClient);
    saveLocalData('mtabi_mock_clientes', data);
    return newClient;
  }
  const { data, error } = await supabase
    .from('clientes')
    .insert([cliente])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateCliente = async (id: string, cliente: Partial<Cliente>): Promise<Cliente> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_clientes', MOCK_CLIENTES);
    const index = data.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Cliente não encontrado no mock');
    
    const updated = { ...data[index], ...cliente };
    data[index] = updated;
    saveLocalData('mtabi_mock_clientes', data);
    return updated;
  }
  const { data, error } = await supabase
    .from('clientes')
    .update(cliente)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteCliente = async (id: string): Promise<void> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_clientes', MOCK_CLIENTES);
    const filtered = data.filter(c => c.id !== id);
    saveLocalData('mtabi_mock_clientes', filtered);
    return;
  }
  const { error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ==========================================
// CRUD: PROJETOS
// ==========================================

export const getProjetos = async (): Promise<Projeto[]> => {
  const { data, error } = await supabase
    .from('projetos')
    .select('*, cliente:clientes(*)')
    .order('nome_solucao', { ascending: true });
    
  if (error) throw error;
  return data || [];
};

export const createProjeto = async (projeto: Partial<Projeto>): Promise<Projeto> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_projetos', MOCK_PROJETOS);
    const newProj: Projeto = {
      id: 'p-' + Math.random().toString(36).substring(2, 9),
      cliente_id: projeto.cliente_id || '',
      nome_solucao: projeto.nome_solucao || 'Solução Nova',
      descricao: projeto.descricao,
      status: projeto.status || 'Em desenvolvimento',
      link_acesso: projeto.link_acesso,
      ferramenta_dev: projeto.ferramenta_dev || [],
      banco_dados: projeto.banco_dados,
      repositorio_url: projeto.repositorio_url,
      hospedagem_imagens: projeto.hospedagem_imagens,
      hospedagem_geral: projeto.hospedagem_geral,
      data_inicio: projeto.data_inicio,
      data_entrega_prevista: projeto.data_entrega_prevista,
      valor_projeto: projeto.valor_projeto,
      valor_mensal: projeto.valor_mensal,
      observacoes: projeto.observacoes,
      data_criacao: new Date().toISOString()
    };
    data.push(newProj);
    saveLocalData('mtabi_mock_projetos', data);
    return newProj;
  }
  const { data, error } = await supabase
    .from('projetos')
    .insert([projeto])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateProjeto = async (id: string, projeto: Partial<Projeto>): Promise<Projeto> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_projetos', MOCK_PROJETOS);
    const index = data.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Projeto não encontrado no mock');
    
    const updated = { ...data[index], ...projeto };
    data[index] = updated;
    saveLocalData('mtabi_mock_projetos', data);
    return updated;
  }
  const { data, error } = await supabase
    .from('projetos')
    .update(projeto)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteProjeto = async (id: string): Promise<void> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_projetos', MOCK_PROJETOS);
    const filtered = data.filter(p => p.id !== id);
    saveLocalData('mtabi_mock_projetos', filtered);
    return;
  }
  const { error } = await supabase
    .from('projetos')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ==========================================
// CRUD: FERRAMENTAS E CUSTOS
// ==========================================

export const getFerramentas = async (): Promise<FerramentaCusto[]> => {
  const { data, error } = await supabase
    .from('ferramentas_custos')
    .select('*, projeto:projetos(*)')
    .order('nome_ferramenta', { ascending: true });
    
  if (error) throw error;
  return data || [];
};

export const createFerramenta = async (ferramenta: Partial<FerramentaCusto>): Promise<FerramentaCusto> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_ferramentas', MOCK_FERRAMENTAS);
    const newTool: FerramentaCusto = {
      id: 'f-' + Math.random().toString(36).substring(2, 9),
      nome_ferramenta: ferramenta.nome_ferramenta || 'Nova Ferramenta',
      categoria: ferramenta.categoria || 'IA/Dev',
      tipo_custo: ferramenta.tipo_custo || 'Mensal',
      valor: ferramenta.valor || 0,
      moeda: ferramenta.moeda || 'BRL',
      data_cobranca: ferramenta.data_cobranca,
      projeto_vinculado_id: ferramenta.projeto_vinculado_id,
      ativo: ferramenta.ativo !== undefined ? ferramenta.ativo : true,
      link_acesso: ferramenta.link_acesso,
      usuario_acesso: ferramenta.usuario_acesso,
      senha_acesso_criptografada: ferramenta.senha_acesso_criptografada,
      observacoes: ferramenta.observacoes,
      data_criacao: new Date().toISOString()
    };
    data.push(newTool);
    saveLocalData('mtabi_mock_ferramentas', data);
    return newTool;
  }
  const { data, error } = await supabase
    .from('ferramentas_custos')
    .insert([ferramenta])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateFerramenta = async (id: string, ferramenta: Partial<FerramentaCusto>): Promise<FerramentaCusto> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_ferramentas', MOCK_FERRAMENTAS);
    const index = data.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Ferramenta não encontrada no mock');
    
    const updated = { ...data[index], ...ferramenta };
    data[index] = updated;
    saveLocalData('mtabi_mock_ferramentas', data);
    return updated;
  }
  const { data, error } = await supabase
    .from('ferramentas_custos')
    .update(ferramenta)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteFerramenta = async (id: string): Promise<void> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_ferramentas', MOCK_FERRAMENTAS);
    const filtered = data.filter(t => t.id !== id);
    saveLocalData('mtabi_mock_ferramentas', filtered);
    return;
  }
  const { error } = await supabase
    .from('ferramentas_custos')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ==========================================
// CRUD: PIPELINE DE NEGOCIAÇÃO (CRM)
// ==========================================

export const getPipeline = async (): Promise<PipelineLead[]> => {
  const { data, error } = await supabase
    .from('pipeline_negociacao')
    .select('*, cliente:clientes(*)')
    .order('data_proxima_acao', { ascending: true, nullsFirst: false });
    
  if (error) throw error;
  return data || [];
};

export const createPipelineLead = async (lead: Partial<PipelineLead>): Promise<PipelineLead> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_pipeline', MOCK_PIPELINE);
    const newLead: PipelineLead = {
      id: 'l-' + Math.random().toString(36).substring(2, 9),
      cliente_id: lead.cliente_id || undefined,
      nome_lead: lead.nome_lead,
      etapa: lead.etapa || 'Primeiro contato',
      valor_estimado: lead.valor_estimado || 0,
      decisor_nome: lead.decisor_nome,
      campeao_interno_nome: lead.campeao_interno_nome,
      proxima_acao: lead.proxima_acao,
      data_proxima_acao: lead.data_proxima_acao,
      probabilidade: lead.probabilidade || 50,
      observacoes: lead.observacoes,
      data_ultima_atualizacao: new Date().toISOString(),
      data_criacao: new Date().toISOString()
    };
    data.push(newLead);
    saveLocalData('mtabi_mock_pipeline', data);
    return newLead;
  }
  const updateData = {
    ...lead,
    data_ultima_atualizacao: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('pipeline_negociacao')
    .insert([updateData])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updatePipelineLead = async (id: string, lead: Partial<PipelineLead>): Promise<PipelineLead> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_pipeline', MOCK_PIPELINE);
    const index = data.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Lead não encontrado no mock');
    
    const updated = { ...data[index], ...lead, data_ultima_atualizacao: new Date().toISOString() };
    data[index] = updated;
    saveLocalData('mtabi_mock_pipeline', data);
    return updated;
  }
  const updateData = {
    ...lead,
    data_ultima_atualizacao: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from('pipeline_negociacao')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deletePipelineLead = async (id: string): Promise<void> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_pipeline', MOCK_PIPELINE);
    const filtered = data.filter(l => l.id !== id);
    saveLocalData('mtabi_mock_pipeline', filtered);
    return;
  }
  const { error } = await supabase
    .from('pipeline_negociacao')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ==========================================
// CRUD: FINANCEIRO MOVIMENTOS
// ==========================================

export const getFinanceiroMovimentos = async (): Promise<FinanceiroMovimento[]> => {
  const { data, error } = await supabase
    .from('financeiro_movimentos')
    .select('*, cliente:clientes(*), projeto:projetos(*)')
    .order('data_movimento', { ascending: false });
    
  if (error) throw error;
  return data || [];
};

export const createFinanceiroMovimento = async (movimento: Partial<FinanceiroMovimento>): Promise<FinanceiroMovimento> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_financeiro', MOCK_FINANCEIRO);
    const newMov: FinanceiroMovimento = {
      id: 'm-' + Math.random().toString(36).substring(2, 9),
      cliente_id: movimento.cliente_id || '',
      projeto_id: movimento.projeto_id || undefined,
      tipo: movimento.tipo || 'Entrada recorrente mensal',
      descricao: movimento.descricao || 'Lançamento',
      valor: movimento.valor || 0,
      data_movimento: movimento.data_movimento || new Date().toISOString().split('T')[0],
      mes_referencia: movimento.mes_referencia || new Date().toISOString().slice(0, 7),
      status: movimento.status || 'Confirmado',
      data_criacao: new Date().toISOString()
    };
    data.push(newMov);
    saveLocalData('mtabi_mock_financeiro', data);
    return newMov;
  }
  const { data, error } = await supabase
    .from('financeiro_movimentos')
    .insert([movimento])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateFinanceiroMovimento = async (id: string, movimento: Partial<FinanceiroMovimento>): Promise<FinanceiroMovimento> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_financeiro', MOCK_FINANCEIRO);
    const index = data.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Movimento não encontrado no mock');
    
    const updated = { ...data[index], ...movimento };
    data[index] = updated;
    saveLocalData('mtabi_mock_financeiro', data);
    return updated;
  }
  const { data, error } = await supabase
    .from('financeiro_movimentos')
    .update(movimento)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteFinanceiroMovimento = async (id: string): Promise<void> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_financeiro', MOCK_FINANCEIRO);
    const filtered = data.filter(m => m.id !== id);
    saveLocalData('mtabi_mock_financeiro', filtered);
    return;
  }
  const { error } = await supabase
    .from('financeiro_movimentos')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// ==========================================
// AUDITORIA E LOGS DE CREDENCIAIS
// ==========================================

export const getLogsCredenciais = async (): Promise<LogAcessoCredencial[]> => {
  const { data, error } = await supabase
    .from('log_acessos_credenciais')
    .select('*, ferramenta:ferramentas_custos(nome_ferramenta)')
    .order('data_hora', { ascending: false });
    
  if (error) throw error;
  
  return (data || []).map(log => ({
    id: log.id,
    ferramenta_id: log.ferramenta_id,
    data_hora: log.data_hora,
    acao: log.acao,
    ferramenta_nome: log.ferramenta?.nome_ferramenta || 'Ferramenta Removida'
  }));
};

export const logCredentialAccess = async (ferramentaId: string): Promise<void> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_logs', MOCK_LOGS);
    const newLog: LogAcessoCredencial = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      ferramenta_id: ferramentaId,
      data_hora: new Date().toISOString(),
      acao: 'revelou senha'
    };
    data.unshift(newLog); // Mais recente no início
    saveLocalData('mtabi_mock_logs', data);
    return;
  }
  const { error } = await supabase
    .from('log_acessos_credenciais')
    .insert([{
      ferramenta_id: ferramentaId,
      acao: 'revelou senha'
    }]);
    
  if (error) console.error('Falha ao gravar log de acesso:', error);
};

// Compatibilidade de upload de imagem
export const uploadProfilePhoto = async (userId: string, base64: string): Promise<string | null> => {
  if (isMockMode()) return base64;
  if (!base64 || !base64.startsWith('data:')) return base64;
  try {
    const response = await fetch(base64);
    const blob = await response.blob();
    const fileExt = blob.type.split('/')[1] || 'png';
    const filePath = `profiles/${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, blob, { contentType: blob.type, upsert: true });
      
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload da foto de perfil:', error);
    return null;
  }
};

// Upload de logotipo de cliente
export const uploadClientLogo = async (clienteId: string, base64: string): Promise<string | null> => {
  if (!base64 || !base64.startsWith('data:')) return base64;
  try {
    const response = await fetch(base64);
    const blob = await response.blob();
    const fileExt = blob.type.split('/')[1] || 'png';
    const filePath = `client_logos/${clienteId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, blob, { contentType: blob.type, upsert: true });
      
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload do logotipo do cliente:', error);
    return null;
  }
};

// ==========================================
// MOCK DE CONTRATOS
// ==========================================
const MOCK_CONTRATOS: Contrato[] = [
  {
    id: 'ct1-mock-id',
    cliente_id: 'c1-mock-id',
    valor_recorrente: 1621,
    data_inicio: '2026-01-01',
    status: 'Ativo',
    observacoes: 'Contrato inicial de suporte e consultoria de infraestrutura.'
  }
];

// ==========================================
// SERVIÇOS DE CONTRATOS
// ==========================================

export const getContratos = async (clienteId?: string): Promise<Contrato[]> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_contratos', MOCK_CONTRATOS);
    if (clienteId) {
      return data.filter(c => c.cliente_id === clienteId);
    }
    return data;
  }
  try {
    let query = supabase.from('contratos').select('*').order('data_inicio', { ascending: false });
    if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Erro ao buscar contratos (verifique se a tabela contratos existe):', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('Erro ao carregar contratos:', err);
    return [];
  }
};

export const createContrato = async (contrato: Partial<Contrato>): Promise<Contrato> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_contratos', MOCK_CONTRATOS);
    const newContract: Contrato = {
      id: 'ct-' + Math.random().toString(36).substring(2, 9),
      cliente_id: contrato.cliente_id || '',
      valor_recorrente: Number(contrato.valor_recorrente || 0),
      link_contrato: contrato.link_contrato,
      data_inicio: contrato.data_inicio || new Date().toISOString().split('T')[0],
      data_fim: contrato.data_fim || undefined,
      status: contrato.status || 'Ativo',
      observacoes: contrato.observacoes,
      data_criacao: new Date().toISOString()
    };
    data.push(newContract);
    saveLocalData('mtabi_mock_contratos', data);
    return newContract;
  }
  const { data, error } = await supabase
    .from('contratos')
    .insert([contrato])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateContrato = async (id: string, contrato: Partial<Contrato>): Promise<Contrato> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_contratos', MOCK_CONTRATOS);
    const index = data.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Contrato não encontrado no mock');
    
    const updated = { ...data[index], ...contrato };
    data[index] = updated;
    saveLocalData('mtabi_mock_contratos', data);
    return updated;
  }
  const { data, error } = await supabase
    .from('contratos')
    .update(contrato)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteContrato = async (id: string): Promise<void> => {
  if (isMockMode()) {
    const data = getLocalData('mtabi_mock_contratos', MOCK_CONTRATOS);
    const filtered = data.filter(c => c.id !== id);
    saveLocalData('mtabi_mock_contratos', filtered);
    return;
  }
  const { error } = await supabase
    .from('contratos')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

