-- ============================================================
-- Virtual Core — Migrations adicionais (execute após database.sql)
-- ============================================================

USE virtualcore;

-- ── 0. USUARIOS — colunas adicionais ─────────────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario   VARCHAR(80)  NULL UNIQUE AFTER email;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plano     ENUM('essencial','profissional','business','admin') NOT NULL DEFAULT 'essencial' AFTER role;

-- ── 0b. ADMIN_CLIENTES — colunas adicionais ──────────────
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS cpf_cnpj        VARCHAR(20)  NULL AFTER contato;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS telefone         VARCHAR(20)  NULL AFTER cpf_cnpj;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS email_contato    VARCHAR(150) NULL AFTER telefone;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS usuario_id       INT          NULL AFTER status;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS primeiro_acesso  TINYINT(1)   DEFAULT 1 AFTER usuario_id;

-- ── 1. TENANT ISOLATION ───────────────────────────────────
-- Adiciona usuario_id às tabelas principais para filtrar dados por tenant

ALTER TABLE vendas         ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE contas_pagar   ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE contratos      ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE clientes       ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE fornecedores   ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE servicos       ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;

-- Associa os dados existentes ao admin (id=1)
UPDATE vendas         SET usuario_id = 1 WHERE usuario_id IS NULL;
UPDATE contas_pagar   SET usuario_id = 1 WHERE usuario_id IS NULL;
UPDATE contas_receber SET usuario_id = 1 WHERE usuario_id IS NULL;
UPDATE contratos      SET usuario_id = 1 WHERE usuario_id IS NULL;
UPDATE clientes       SET usuario_id = 1 WHERE usuario_id IS NULL;
UPDATE fornecedores   SET usuario_id = 1 WHERE usuario_id IS NULL;
UPDATE servicos       SET usuario_id = 1 WHERE usuario_id IS NULL;

-- ── 2. NOTIFICAÇÕES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo       ENUM('cobranca','vencimento','sistema') DEFAULT 'sistema',
    titulo     VARCHAR(200) NOT NULL,
    mensagem   TEXT,
    referencia VARCHAR(100),     -- ex: "conta_receber:5"
    lida       TINYINT(1) DEFAULT 0,
    criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── 3. ACEITE ELETRÔNICO DE CONTRATOS ────────────────────
ALTER TABLE contratos
    ADD COLUMN IF NOT EXISTS aceite_hash     CHAR(64)  NULL AFTER status,
    ADD COLUMN IF NOT EXISTS aceite_ip       VARCHAR(45) NULL AFTER aceite_hash,
    ADD COLUMN IF NOT EXISTS aceite_data     DATETIME  NULL AFTER aceite_ip,
    ADD COLUMN IF NOT EXISTS token_aceite    CHAR(64)  NULL AFTER aceite_data;

-- Gera token para contratos existentes aguardando aceite
UPDATE contratos
SET token_aceite = SHA2(CONCAT(id, cliente, RAND()), 256)
WHERE status = 'aguardando' AND token_aceite IS NULL;

-- ── 4. ESTOQUE DE MATERIAIS ───────────────────────────────
CREATE TABLE IF NOT EXISTS estoque (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id   INT NOT NULL,
    nome         VARCHAR(200) NOT NULL,
    categoria    VARCHAR(100),
    unidade      VARCHAR(20) DEFAULT 'un',
    qtd_atual    DECIMAL(10,2) DEFAULT 0,
    qtd_minima   DECIMAL(10,2) DEFAULT 0,     -- alerta de estoque baixo
    custo_unit   DECIMAL(10,2) DEFAULT 0.00,
    fornecedor_id INT NULL,
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
);

-- Movimentações de estoque (entradas/saídas por serviço)
CREATE TABLE IF NOT EXISTS estoque_movimentos (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    estoque_id   INT NOT NULL,
    usuario_id   INT NOT NULL,
    tipo         ENUM('entrada','saida') NOT NULL,
    quantidade   DECIMAL(10,2) NOT NULL,
    referencia   VARCHAR(100),    -- ex: "venda:3"
    observacao   VARCHAR(255),
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estoque_id) REFERENCES estoque(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Seed de estoque para o admin
INSERT INTO estoque (usuario_id, nome, categoria, unidade, qtd_atual, qtd_minima, custo_unit, fornecedor_id) VALUES
(1, 'Câmera HD 1080p',          'CFTV',     'un',  8,  3, 85.00,  1),
(1, 'DVR 4 canais',             'CFTV',     'un',  4,  2, 120.00, 1),
(1, 'Cabo coaxial (rolo 100m)', 'CFTV',     'rolo',2,  1, 95.00,  1),
(1, 'Cabo UTP Cat6 (rolo 100m)','Rede',     'rolo',5,  2, 110.00, 3),
(1, 'Switch 8 portas',          'Rede',     'un',  3,  1, 75.00,  3),
(1, 'SSD 240GB',                'Hardware', 'un',  6,  2, 65.00,  2),
(1, 'Pasta térmica',            'Hardware', 'un', 10,  3,  8.00,  2),
(1, 'Fechadura eletrônica',     'Segurança','un',  2,  1, 95.00,  1);
