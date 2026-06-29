/**
 * Definições de Tipos - Sistema de Gestão MTABI
 */

export interface Profile {
  id: string;
  name: string;
  war_name?: string;
  cpf?: string;
  email: string;
  rank?: string;
  profile_photo?: string;
  allowed_screens?: string[];
  is_admin?: boolean;
  created_at?: string;
}

// Representação do usuário logado na interface
export interface Operator {
  id: string;
  name: string;
  warName?: string;
  cpf?: string;
  email: string;
  rank?: string;
  profilePhoto?: string;
  allowedScreens?: string[];
  isAdmin?: boolean;
}

// 1. Clientes
export interface Cliente {
  id: string;
  nome_empresa: string;
  logo_url?: string;
  nome_contato_principal?: string;
  nome_contato_interno?: string;
  segmento?: string;
  status: 'Negociação' | 'Ativo' | 'Inativo' | 'Pausado';
  tipo_relacao: 'Projeto único' | 'Consultoria recorrente' | 'Ambos';
  observacoes?: string;
  data_criacao?: string;
  valor_recorrente?: number;
  link_contrato?: string;
}

// 2. Projetos
export interface Projeto {
  id: string;
  cliente_id: string;
  nome_solucao: string;
  descricao?: string;
  status: 'Em negociação' | 'Em desenvolvimento' | 'Em produção' | 'Manutenção' | 'Pausado' | 'Encerrado';
  link_acesso?: string;
  ferramenta_dev?: string[]; // multi-select (guardado como array de strings no pg)
  banco_dados?: string;
  repositorio_url?: string;
  hospedagem_imagens?: string;
  hospedagem_geral?: string;
  link_supabase?: string;
  data_inicio?: string; // YYYY-MM-DD
  data_entrega_prevista?: string; // YYYY-MM-DD
  valor_projeto?: number;
  valor_mensal?: number;
  observacoes?: string;
  data_criacao?: string;
  user_acesso?: string;
  user_supabase?: string;
  user_repositorio?: string;
  user_imagens?: string;
  user_hospedagem?: string;
  forma_pagamento?: string;
  parcelas?: number;
  
  // Carregado por join
  cliente?: Cliente;
}

// 2.5 Contratos
export interface Contrato {
  id: string;
  cliente_id: string;
  valor_recorrente: number;
  link_contrato?: string;
  data_inicio: string;
  data_fim?: string;
  dia_pagamento?: number;       // 1-31: dia do mês em que o pagamento recorrente vence
  valor_implantacao?: number;   // valor único de implantação/desenvolvimento
  forma_pagamento?: string;     // PIX | Boleto | Cartão de Crédito | Débito | Dinheiro | TED
  parcelas?: number;            // número de parcelas (para boleto)
  status: 'Ativo' | 'Histórico' | 'Cancelado';
  reajuste_valor?: number;
  reajuste_data?: string;
  observacoes?: string;
  data_criacao?: string;
}

// 3. Ferramentas e Custos
export interface FerramentaCusto {
  id: string;
  nome_ferramenta: string;
  categoria: 'IA/Dev' | 'Hospedagem' | 'Banco de Dados' | 'Design' | 'Produtividade' | 'Outro';
  tipo_custo: 'Gratuito' | 'Pago único' | 'Mensal' | 'Anual';
  valor: number;
  moeda: 'BRL' | 'USD';
  data_cobranca?: string; // dia do mês ou data específica
  projeto_vinculado_id?: string;
  ativo: boolean;
  link_acesso?: string;
  usuario_acesso?: string;
  senha_acesso_criptografada?: string;
  observacoes?: string;
  data_criacao?: string;
  
  // Carregados por join
  projeto?: Projeto;
}

// 4. Pipeline de Negociação (CRM)
export interface PipelineLead {
  id: string;
  cliente_id?: string;
  nome_lead?: string; // Usado se ainda não houver um cliente formal cadastrado
  etapa: 'Primeiro contato' | 'Proposta enviada' | 'Em negociação' | 'Aguardando decisão' | 'Fechado-Ganho' | 'Fechado-Perdido';
  valor_estimado: number;
  decisor_nome?: string;
  campeao_interno_nome?: string;
  proxima_acao?: string;
  data_proxima_acao?: string; // YYYY-MM-DD
  probabilidade: number; // 0 - 100
  observacoes?: string;
  data_ultima_atualizacao?: string;
  data_criacao?: string;
  link_proposta?: string;
  valor_recorrente?: number;
  
  // Carregado por join
  cliente?: Cliente;
}

// 5. Financeiro Movimentos
export interface FinanceiroMovimento {
  id: string;
  cliente_id: string;
  projeto_id?: string;
  tipo: 'Entrada única' | 'Entrada recorrente mensal' | 'Saída/custo';
  descricao: string;
  valor: number;
  data_movimento: string; // YYYY-MM-DD
  mes_referencia: string; // YYYY-MM
  status: 'Previsto' | 'Confirmado' | 'Atrasado' | 'Cancelado';
  data_criacao?: string;
  
  // Carregados por join
  cliente?: Cliente;
  projeto?: Projeto;
}

// 6. Log de Acessos Credenciais
export interface LogAcessoCredencial {
  id: string;
  ferramenta_id: string;
  data_hora: string;
  acao: string;
  
  // Carregado por join
  ferramenta_nome?: string;
}
