-- Tabela de contratos para historico
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  valor_recorrente numeric(12,2) not null default 0.00,
  link_contrato text,
  data_inicio date not null,
  data_fim date,
  status text not null default 'Ativo' check (status in ('Ativo', 'Histórico', 'Cancelado')),
  observacoes text,
  data_criacao timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS na tabela de contratos se necessário
alter table public.contratos enable row level security;

-- Criar política RLS permitindo tudo para usuários autenticados/anon se as outras tabelas estiverem assim configuradas
create policy "Allow all operations on contratos" on public.contratos
  for all using (true) with check (true);

-- Colunas de pagamento e parcelamento na tabela de projetos
alter table public.projetos add column if not exists forma_pagamento text;
alter table public.projetos add column if not exists parcelas integer default 1;

-- Coluna de dia de pagamento mensal na tabela de contratos
alter table public.contratos add column if not exists dia_pagamento integer check (dia_pagamento >= 1 and dia_pagamento <= 31);

-- Campos de implantação movidos do cadastro de projetos para contratos
alter table public.contratos add column if not exists valor_implantacao numeric(12,2) default 0.00;
alter table public.contratos add column if not exists forma_pagamento text;
alter table public.contratos add column if not exists parcelas integer default 1;

-- Campos opcionais para reajuste programado/automático de valor
alter table public.contratos add column if not exists reajuste_valor numeric(12,2);
alter table public.contratos add column if not exists reajuste_data date;

