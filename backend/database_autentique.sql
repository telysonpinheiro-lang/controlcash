-- Colunas para integração com Autentique
USE virtualcore;

ALTER TABLE contratos ADD COLUMN IF NOT EXISTS autentique_id VARCHAR(100) NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS autentique_link VARCHAR(500) NULL;
