-- ============================================================
-- Virtual Core — Schema MySQL COMPLETO
-- Contém TODAS as tabelas e colunas usadas pelo sistema
-- Execute no phpMyAdmin: Database > virtualcore > SQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS virtualcore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE virtualcore;

-- ── USUÁRIOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    email     VARCHAR(150) NOT NULL UNIQUE,
    usuario   VARCHAR(80)  NULL UNIQUE,
    senha     VARCHAR(255) NOT NULL,
    nome      VARCHAR(150) NOT NULL,
    role      ENUM('admin','user') NOT NULL DEFAULT 'user',
    plano     ENUM('essencial','profissional','business','admin') NOT NULL DEFAULT 'essencial',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── CLIENTES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    nome      VARCHAR(150) NOT NULL,
    initials  CHAR(2),
    telefone  VARCHAR(20),
    email     VARCHAR(150),
    endereco  VARCHAR(255),
    rua       VARCHAR(200),
    bairro    VARCHAR(100),
    cidade    VARCHAR(100),
    cep       VARCHAR(10),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── FORNECEDORES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    nome      VARCHAR(150) NOT NULL,
    telefone  VARCHAR(20),
    categoria VARCHAR(100),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── SERVIÇOS (catálogo) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS servicos (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id   INT NULL,
    nome         VARCHAR(200) NOT NULL,
    valor_padrao DECIMAL(10,2) DEFAULT 0.00,
    custo_min    DECIMAL(10,2) DEFAULT 0.00,
    margem       TINYINT DEFAULT 0,
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── VENDAS / ORÇAMENTOS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS vendas (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id     INT NULL,
    cliente_id     INT,
    cliente_nome   VARCHAR(150) NOT NULL,
    initials       CHAR(2),
    servico        VARCHAR(200) NOT NULL,
    valor          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    material       DECIMAL(10,2) DEFAULT NULL,
    pagamento      VARCHAR(80),
    prazo          VARCHAR(20),
    status         ENUM('orcamento','aprovado','andamento','concluido','recebido','vencido') DEFAULT 'orcamento',
    kanban_status  ENUM('orcamento','aprovado','andamento','concluido','recebido') DEFAULT 'orcamento',
    data_envio     VARCHAR(10),
    criado_em      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- ── CONTAS A PAGAR ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contas_pagar (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NULL,
    fornecedor  VARCHAR(150) NOT NULL,
    descricao   VARCHAR(255),
    valor       DECIMAL(10,2) NOT NULL,
    vencimento  DATE NOT NULL,
    status      ENUM('pendente','pago') DEFAULT 'pendente',
    criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── CONTAS A RECEBER ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS contas_receber (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id   INT NULL,
    cliente_id   INT,
    cliente_nome VARCHAR(150) NOT NULL,
    initials     CHAR(2),
    referente    VARCHAR(255),
    valor        DECIMAL(10,2) NOT NULL,
    vencimento   DATE NOT NULL,
    tipo         VARCHAR(30) DEFAULT 'À vista',
    status       ENUM('pendente','vencido','pago') DEFAULT 'pendente',
    dias_atraso  INT DEFAULT 0,
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- ── CONTRATOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contratos (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id        INT NULL,
    cliente_id        INT,
    cliente           VARCHAR(150) NOT NULL,
    cpf               VARCHAR(20),
    endereco          VARCHAR(255),
    servico           VARCHAR(200) NOT NULL,
    descricao_servico TEXT,
    valor             DECIMAL(10,2) NOT NULL,
    parcelas          TINYINT DEFAULT 1,
    valor_parcela     DECIMAL(10,2),
    prazo             VARCHAR(100),
    garantia          VARCHAR(255),
    status            ENUM('aguardando','aceito','cancelado') DEFAULT 'aguardando',
    aceite_hash       CHAR(64) NULL,
    aceite_ip         VARCHAR(45) NULL,
    aceite_data       DATETIME NULL,
    token_aceite      CHAR(64) NULL,
    criado_em         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- ── NOTIFICAÇÕES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo       ENUM('cobranca','vencimento','sistema') DEFAULT 'sistema',
    titulo     VARCHAR(200) NOT NULL,
    mensagem   TEXT,
    referencia VARCHAR(100),
    lida       TINYINT(1) DEFAULT 0,
    criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── ESTOQUE DE MATERIAIS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS estoque (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id   INT NOT NULL,
    nome         VARCHAR(200) NOT NULL,
    categoria    VARCHAR(100),
    unidade      VARCHAR(20) DEFAULT 'un',
    qtd_atual    DECIMAL(10,2) DEFAULT 0,
    qtd_minima   DECIMAL(10,2) DEFAULT 0,
    custo_unit   DECIMAL(10,2) DEFAULT 0.00,
    fornecedor_id INT NULL,
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
);

-- ── MOVIMENTAÇÕES DE ESTOQUE ──────────────────────────────
CREATE TABLE IF NOT EXISTS estoque_movimentos (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    estoque_id   INT NOT NULL,
    usuario_id   INT NOT NULL,
    tipo         ENUM('entrada','saida') NOT NULL,
    quantidade   DECIMAL(10,2) NOT NULL,
    referencia   VARCHAR(100),
    observacao   VARCHAR(255),
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (estoque_id) REFERENCES estoque(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- ── CLIENTES DO SISTEMA (admin SaaS) ─────────────────────
CREATE TABLE IF NOT EXISTS admin_clientes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    empresa         VARCHAR(150) NOT NULL,
    contato         VARCHAR(150),
    cpf_cnpj        VARCHAR(20),
    telefone        VARCHAR(20),
    email_contato   VARCHAR(150),
    plano           ENUM('essencial','profissional','business') DEFAULT 'essencial',
    setup           DECIMAL(10,2) DEFAULT 0.00,
    recorrencia     DECIMAL(10,2) DEFAULT 0.00,
    modulos         JSON,
    status          ENUM('ativo','inativo') DEFAULT 'ativo',
    usuario_id      INT NULL,
    primeiro_acesso TINYINT(1) DEFAULT 1,
    criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- SEED: Usuário admin (senha: VirtualCore#19)
-- ============================================================

INSERT INTO usuarios (email, usuario, senha, nome, role, plano) VALUES
('admin@virtualcore.com.br', 'admin', '$2y$10$YwQYePYQz0Z5kZ5YsKz5aeHvRQzGpFVdLqFLDrCmlqbE/hHp3EvWe', 'Admin', 'admin', 'admin')
ON DUPLICATE KEY UPDATE usuario='admin', role='admin', plano='admin';
