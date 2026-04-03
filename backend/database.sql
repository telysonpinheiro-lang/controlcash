-- ============================================================
-- Virtual Core — Schema MySQL
-- Execute no phpMyAdmin ou via terminal: mysql -u root < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS virtualcore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE virtualcore;

-- ── USUÁRIOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    email    VARCHAR(150) NOT NULL UNIQUE,
    senha    VARCHAR(255) NOT NULL,          -- bcrypt hash
    nome     VARCHAR(150) NOT NULL,
    role     ENUM('admin','user') NOT NULL DEFAULT 'user',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── CLIENTES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    nome     VARCHAR(150) NOT NULL,
    initials CHAR(2),
    telefone VARCHAR(20),
    email    VARCHAR(150),
    endereco VARCHAR(255),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── FORNECEDORES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fornecedores (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    nome      VARCHAR(150) NOT NULL,
    telefone  VARCHAR(20),
    categoria VARCHAR(100),
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── SERVIÇOS (catálogo) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS servicos (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    nome         VARCHAR(200) NOT NULL,
    valor_padrao DECIMAL(10,2) DEFAULT 0.00,
    custo_min    DECIMAL(10,2) DEFAULT 0.00,
    margem       TINYINT DEFAULT 0,
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── VENDAS / ORÇAMENTOS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS vendas (
    id             INT AUTO_INCREMENT PRIMARY KEY,
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
    criado_em         DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
);

-- ── CLIENTES DO SISTEMA (admin SaaS) ──────────────────────
CREATE TABLE IF NOT EXISTS admin_clientes (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    empresa      VARCHAR(150) NOT NULL,
    contato      VARCHAR(150),
    plano        ENUM('essencial','profissional','empresa') DEFAULT 'essencial',
    setup        DECIMAL(10,2) DEFAULT 0.00,
    recorrencia  DECIMAL(10,2) DEFAULT 0.00,
    modulos      JSON,
    status       ENUM('ativo','inativo') DEFAULT 'ativo',
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- SEED DATA — dados iniciais
-- ============================================================

-- Usuários (senhas em bcrypt de '123456')
INSERT INTO usuarios (email, senha, nome, role) VALUES
('admin@virtualcore.com.br', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin Virtual Core', 'admin'),
('tecnico@email.com',         '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'João Silva',        'user');

-- Clientes
INSERT INTO clientes (nome, initials, telefone, email, endereco) VALUES
('Carlos Alves',    'CA', '(35) 99999-0001', 'carlos@email.com', 'Rua das Flores, 123'),
('Ana Lima',        'AL', '(35) 99999-0002', 'ana@empresa.com',  'Av. Central, 500'),
('Maria Santos',    'MS', '(35) 99999-0003', 'maria@email.com',  'Rua XV de Nov., 88'),
('Pedro Ferreira',  'PF', '(35) 99999-0004', 'pedro@email.com',  'Rua das Acácias, 45');

-- Fornecedores
INSERT INTO fornecedores (nome, telefone, categoria) VALUES
('Elétrica Peças', '(35) 3333-0001', 'Elétrica / CFTV'),
('InfoPeças Ltda',  '(35) 3333-0002', 'Hardware'),
('TeleRede',        '(35) 3333-0003', 'Redes / Cabeamento');

-- Serviços
INSERT INTO servicos (nome, valor_padrao, custo_min, margem) VALUES
('Instalação CFTV (4 câmeras)',   950.00, 380.00, 60),
('Manutenção de PC / Notebook',   180.00,  40.00, 78),
('Infra de Rede Wi-Fi',          1200.00, 450.00, 63),
('Site Institucional',           2800.00,   0.00, 100),
('SEO Google (mensal)',            700.00,   0.00, 100);

-- Vendas
INSERT INTO vendas (cliente_id, cliente_nome, initials, servico, valor, material, pagamento, prazo, status, kanban_status, data_envio) VALUES
(1, 'Carlos Alves',   'CA', 'Instalação câmeras',   950.00, 380.00, '3× R$ 316,67', '20/06', 'vencido',  'recebido',  NULL),
(2, 'Ana Lima',       'AL', 'Site institucional',  2800.00,   NULL, '6× R$ 466,67', '30/07', 'aprovado', 'aprovado',  NULL),
(3, 'Maria Santos',   'MS', 'Manutenção de rede',   600.00, 120.00, 'À vista',       '14/06', 'recebido', 'concluido', NULL),
(4, 'Pedro Ferreira', 'PF', 'Suporte TI',            350.00,   NULL, 'À vista',       '18/06', 'andamento','andamento', NULL),
(NULL, 'Pedro Rocha', 'PR', 'Reforma elétrica',    1200.00,   NULL, 'À vista',       '15/07', 'orcamento','orcamento', '28/05'),
(NULL, 'Empresa XYZ', 'EX', 'Câmeras CFTV',        3500.00,   NULL, 'À vista',       '20/07', 'orcamento','orcamento', '01/06');

-- Contas a pagar
INSERT INTO contas_pagar (fornecedor, descricao, valor, vencimento, status) VALUES
('Elétrica Peças', 'Materiais câmeras — Carlos',     850.00, '2025-06-19', 'pendente'),
('InfoPeças Ltda',  'Componentes notebook',           320.00, '2025-06-25', 'pendente'),
('TeleRede',        'Cabo UTP Cat6',                 1130.00, '2025-06-30', 'pendente'),
('Elétrica Peças', 'Materiais rede — Restaurante',   680.00, '2025-06-10', 'pago');

-- Contas a receber
INSERT INTO contas_receber (cliente_id, cliente_nome, initials, referente, valor, vencimento, tipo, status, dias_atraso) VALUES
(1, 'Carlos Alves',   'CA', 'Câmeras — Parcela 2/3', 316.67, '2025-06-10', 'Parcelado', 'vencido',  8),
(3, 'Maria Santos',   'MS', 'Serviço avulso',         900.00, '2025-06-12', 'À vista',   'vencido',  6),
(2, 'Ana Lima',       'AL', 'Site — Parcela 1/6',     466.67, '2025-06-20', 'Parcelado', 'pendente', 0),
(4, 'Pedro Ferreira', 'PF', 'Suporte TI',             350.00, '2025-06-30', 'À vista',   'pendente', 0),
(NULL, 'Fernanda T.', 'FT', 'Fechadura eletrônica',   320.00, '2025-06-05', 'À vista',   'pago',     0);

-- Contratos
INSERT INTO contratos (cliente_id, cliente, cpf, endereco, servico, descricao_servico, valor, parcelas, valor_parcela, prazo, garantia, status) VALUES
(1, 'Carlos Alves', '000.000.000-00', 'Rua das Flores, 123 — Perdões/MG',
 'CFTV', 'Instalação e configuração de sistema de câmeras de segurança CFTV com 4 câmeras HD, DVR e acesso remoto.',
 950.00, 3, 316.67, '20 de junho de 2025', '90 dias para defeitos de instalação e 12 meses para equipamentos.', 'aguardando'),
(2, 'Ana Lima', '111.111.111-11', 'Av. Central, 500 — Perdões/MG',
 'Site institucional', 'Desenvolvimento de site institucional responsivo com até 5 páginas, SEO básico e hospedagem por 12 meses.',
 2800.00, 6, 466.67, '30 de julho de 2025', '60 dias para ajustes e revisões.', 'aceito'),
(3, 'Maria Santos', '222.222.222-22', 'Rua XV de Nov., 88 — Perdões/MG',
 'Manutenção rede', 'Manutenção preventiva e corretiva da infraestrutura de rede local.',
 600.00, 1, 600.00, '14 de junho de 2025', '30 dias para os serviços executados.', 'aceito');

-- Clientes do sistema (admin)
INSERT INTO admin_clientes (empresa, contato, plano, setup, recorrencia, modulos, status) VALUES
('Eletro Silva', 'João Silva',   'profissional', 147.00, 79.00,  '["Dashboard","Vendas","Financeiro","Contratos"]', 'ativo'),
('NetFix TI',    'Carlos Mota',  'empresa',      247.00, 129.00, '["Todos"]',                                     'ativo'),
('PC Rápido',    'Ana Rocha',    'essencial',     97.00,  49.00, '["Dashboard","Vendas","Cadastros"]',             'ativo');
