-- ==========================================
-- MIGRAÇÃO: COLUNAS EXTRAS DE PROJETOS
-- Execute no SQL Editor do Supabase
-- ==========================================

-- Credenciais por recurso
ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS user_acesso text;

ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS user_supabase text;

ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS user_repositorio text;

ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS user_imagens text;

ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS user_hospedagem text;

-- Financeiro de implantação
ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS forma_pagamento text;

ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS parcelas integer DEFAULT 1;
