-- Migration: Adicionar campos de endereço e telefone na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS complemento TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado TEXT;
