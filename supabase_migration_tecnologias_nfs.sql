-- ==========================================
-- SCRIPT DE MIGRAÇÃO: TECNOLOGIAS E NOTAS FISCAIS
-- ==========================================

-- 1. Tabela de Tecnologias / Ferramentas de Desenvolvimento
create table if not exists public.tecnologias (
  id uuid primary key default uuid_generate_v4(),
  nome text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
alter table public.tecnologias enable row level security;

-- Política de RLS
create policy "Acesso total para autenticados no tecnologias" 
  on public.tecnologias for all to authenticated 
  using (true) with check (true);

-- Popular tecnologias padrão iniciais
insert into public.tecnologias (nome) values
  ('React'),
  ('Vite'),
  ('TypeScript'),
  ('Tailwind CSS'),
  ('Supabase'),
  ('Node.js'),
  ('PostgreSQL'),
  ('Cloudinary'),
  ('Vercel'),
  ('Next.js'),
  ('Lovable'),
  ('Antigravity'),
  ('AI Studio'),
  ('Firebase')
on conflict (nome) do nothing;

-- 2. Colunas de Notas Fiscais em financeiro_movimentos
alter table public.financeiro_movimentos 
  add column if not exists nf_emitida boolean default false;

alter table public.financeiro_movimentos 
  add column if not exists nf_url text;

-- 3. Tabela de Histórico de Ações do Pipeline (CRM)
create table if not exists public.pipeline_acoes_historico (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.pipeline_negociacao(id) on delete cascade,
  descricao text not null,
  data_acao date not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
alter table public.pipeline_acoes_historico enable row level security;

-- Política de RLS
create policy "Acesso total para autenticados no pipeline_acoes_historico" 
  on public.pipeline_acoes_historico for all to authenticated 
  using (true) with check (true);

-- 4. Adicionar recursos_adicionais em projetos
alter table public.projetos 
  add column if not exists recursos_adicionais jsonb default '[]'::jsonb;


