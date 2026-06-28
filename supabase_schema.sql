-- ==========================================
-- SCRIPT DE BANCO DE DOS - GESTÃO MTABI
-- copie e execute este script no SQL Editor do Supabase
-- ==========================================

-- Habilita extensão de UUID se necessário
create extension if not exists "uuid-ossp";

-- 1. Perfis de Operadores
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  war_name text,
  cpf text,
  email text,
  rank text,
  profile_photo text,
  allowed_screens text[],
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Clientes
create table if not exists public.clientes (
  id uuid primary key default uuid_generate_v4(),
  nome_empresa text not null,
  logo_url text,
  nome_contato_principal text,
  nome_contato_interno text,
  segmento text,
  status text not null check (status in ('Negociação', 'Ativo', 'Inativo', 'Pausado')),
  tipo_relacao text not null check (tipo_relacao in ('Projeto único', 'Consultoria recorrente', 'Ambos')),
  observacoes text,
  data_criacao timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Projetos
create table if not exists public.projetos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nome_solucao text not null,
  descricao text,
  status text not null check (status in ('Em negociação', 'Em desenvolvimento', 'Em produção', 'Manutenção', 'Pausado', 'Encerrado')),
  link_acesso text,
  ferramenta_dev text[], -- array de strings para multi-select
  banco_dados text,
  repositorio_url text,
  hospedagem_imagens text,
  hospedagem_geral text,
  link_supabase text,
  data_inicio date,
  data_entrega_prevista date,
  valor_projeto numeric(12,2),
  valor_mensal numeric(12,2),
  observacoes text,
  data_criacao timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Ferramentas e Custos
create table if not exists public.ferramentas_custos (
  id uuid primary key default uuid_generate_v4(),
  nome_ferramenta text not null,
  categoria text not null check (categoria in ('IA/Dev', 'Hospedagem', 'Banco de Dados', 'Design', 'Produtividade', 'Outro')),
  tipo_custo text not null check (tipo_custo in ('Gratuito', 'Pago único', 'Mensal', 'Anual')),
  valor numeric(12,2) default 0.00,
  moeda text not null default 'BRL',
  data_cobranca text, -- dia do mês ou data específica
  projeto_vinculado_id uuid references public.projetos(id) on delete set null,
  ativo boolean not null default true,
  link_acesso text,
  usuario_acesso text,
  senha_acesso_criptografada text,
  observacoes text,
  data_criacao timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Pipeline de Negociação (CRM)
create table if not exists public.pipeline_negociacao (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references public.clientes(id) on delete set null,
  nome_lead text,
  etapa text not null check (etapa in ('Primeiro contato', 'Proposta enviada', 'Em negociação', 'Aguardando decisão', 'Fechado-Ganho', 'Fechado-Perdido')),
  valor_estimado numeric(12,2) default 0.00,
  decisor_nome text,
  campeao_interno_nome text,
  proxima_acao text,
  data_proxima_acao date,
  probabilidade integer check (probabilidade >= 0 and probabilidade <= 100),
  observacoes text,
  data_ultima_atualizacao timestamp with time zone default timezone('utc'::text, now()),
  data_criacao timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Financeiro Movimentos
create table if not exists public.financeiro_movimentos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  projeto_id uuid references public.projetos(id) on delete set null,
  tipo text not null check (tipo in ('Entrada única', 'Entrada recorrente mensal', 'Saída/custo')),
  descricao text not null,
  valor numeric(12,2) not null,
  data_movimento date not null,
  mes_referencia text not null, -- formato 'AAAA-MM'
  status text not null check (status in ('Previsto', 'Confirmado', 'Atrasado', 'Cancelado')),
  data_criacao timestamp with time zone default timezone('utc'::text, now())
);

-- 7. Log de Acessos Credenciais
create table if not exists public.log_acessos_credenciais (
  id uuid primary key default uuid_generate_v4(),
  ferramenta_id uuid not null references public.ferramentas_custos(id) on delete cascade,
  data_hora timestamp with time zone default timezone('utc'::text, now()),
  acao text not null default 'revelou senha'
);

-- ==========================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.projetos enable row level security;
alter table public.ferramentas_custos enable row level security;
alter table public.pipeline_negociacao enable row level security;
alter table public.financeiro_movimentos enable row level security;
alter table public.log_acessos_credenciais enable row level security;

-- ==========================================
-- POLÍTICAS DE RLS PARA USUÁRIOS AUTENTICADOS
-- ==========================================
create policy "Acesso total para autenticados no profiles" on public.profiles for all to authenticated using (true) with check (true);
create policy "Acesso total para autenticados no clientes" on public.clientes for all to authenticated using (true) with check (true);
create policy "Acesso total para autenticados no projetos" on public.projetos for all to authenticated using (true) with check (true);
create policy "Acesso total para autenticados no ferramentas_custos" on public.ferramentas_custos for all to authenticated using (true) with check (true);
create policy "Acesso total para autenticados no pipeline_negociacao" on public.pipeline_negociacao for all to authenticated using (true) with check (true);
create policy "Acesso total para autenticados no financeiro_movimentos" on public.financeiro_movimentos for all to authenticated using (true) with check (true);
create policy "Acesso total para autenticados no log_acessos_credenciais" on public.log_acessos_credenciais for all to authenticated using (true) with check (true);

-- ==========================================
-- GATILHO PARA CRIAÇÃO DE PERFIL AUTOMÁTICO
-- ==========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, rank, allowed_screens, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Fundador'),
    new.email,
    'Founder',
    array['dashboard', 'clientes', 'projetos', 'pipeline', 'ferramentas', 'financeiro'],
    true
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
