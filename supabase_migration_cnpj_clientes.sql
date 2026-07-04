-- Migration: Adicionar campo CNPJ na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cnpj TEXT;
