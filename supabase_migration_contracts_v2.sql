-- Adiciona novas colunas à tabela de contratos
alter table public.contratos add column if not exists data_pagamento_implantacao date;
alter table public.contratos add column if not exists data_inicio_cobranca date;
