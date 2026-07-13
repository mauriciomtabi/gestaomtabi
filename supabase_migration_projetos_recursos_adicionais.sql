-- ==========================================
-- MIGRAÇÃO: RECURSOS ADICIONAIS EM PROJETOS
-- Execute no SQL Editor do Supabase
-- ==========================================

ALTER TABLE public.projetos 
  ADD COLUMN IF NOT EXISTS recursos_adicionais jsonb DEFAULT '[]'::jsonb;
