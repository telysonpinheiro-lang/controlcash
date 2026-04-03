#!/bin/bash
# ============================================================
# ControlCash — Script de correção completa do servidor
# Execute como root: bash fix-server.sh
# ============================================================
set -e

DB_USER="controlcash"
DB_PASS="Cc2025controlcash"
DB_HOST="127.0.0.1"
DB_NAME="virtualcore"
APP="/var/www/controlcash"

echo "========================================="
echo "  ControlCash — Correção Completa"
echo "========================================="

# ── 1. CORRIGE BANCO DE DADOS ────────────────────────────
echo "[1/6] Corrigindo banco de dados..."

mysql -u $DB_USER -p"$DB_PASS" -h $DB_HOST $DB_NAME <<'SQL'

-- Colunas faltantes em usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario VARCHAR(150) NULL AFTER email;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plano VARCHAR(30) DEFAULT 'essencial' AFTER role;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo TINYINT(1) DEFAULT 1 AFTER plano;

-- Colunas faltantes em clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS initials CHAR(2) NULL AFTER nome;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rua VARCHAR(255) NULL;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro VARCHAR(150) NULL;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade VARCHAR(150) NULL;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep VARCHAR(10) NULL;

-- Colunas faltantes em vendas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_id INT NULL AFTER usuario_id;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS initials CHAR(2) NULL AFTER cliente_nome;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS material DECIMAL(10,2) NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS prazo_pagamento DATE NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS data_envio VARCHAR(20) NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS arquivado TINYINT(1) DEFAULT 0;

-- Colunas faltantes em contas_receber
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS cliente_id INT NULL;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS initials CHAR(2) NULL;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS arquivado TINYINT(1) DEFAULT 0;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS dias_atraso INT DEFAULT 0;

-- Colunas faltantes em contas_pagar
ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;

-- Colunas faltantes em contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS cliente_id INT NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS aceite_hash CHAR(64) NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS aceite_ip VARCHAR(45) NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS aceite_data DATETIME NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS token_aceite CHAR(64) NULL;

-- Colunas faltantes em fornecedores
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;

-- Colunas faltantes em servicos
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;

-- Colunas faltantes em admin_clientes
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20) NULL AFTER contato;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS telefone VARCHAR(20) NULL AFTER cpf_cnpj;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS email_contato VARCHAR(150) NULL AFTER telefone;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS usuario_id INT NULL;

-- Tabela notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo       ENUM('cobranca','vencimento','sistema') DEFAULT 'sistema',
    titulo     VARCHAR(200) NOT NULL,
    mensagem   TEXT,
    referencia VARCHAR(100),
    lida       TINYINT(1) DEFAULT 0,
    criado_em  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela login_attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    ip           VARCHAR(45) NOT NULL,
    usuario      VARCHAR(255) NOT NULL,
    sucesso      TINYINT(1) DEFAULT 0,
    tentativa_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_time (ip, tentativa_em)
);

-- Tabela estoque
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
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela estoque_movimentos
CREATE TABLE IF NOT EXISTS estoque_movimentos (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    estoque_id   INT NOT NULL,
    usuario_id   INT NOT NULL,
    tipo         ENUM('entrada','saida') NOT NULL,
    quantidade   DECIMAL(10,2) NOT NULL,
    referencia   VARCHAR(100),
    observacao   VARCHAR(255),
    criado_em    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela admin_cobrancas
CREATE TABLE IF NOT EXISTS admin_cobrancas (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    admin_cliente_id  INT NOT NULL,
    mes_ref           VARCHAR(7) NOT NULL,
    valor             DECIMAL(10,2) NOT NULL,
    status            ENUM('pendente','pago','atrasado') DEFAULT 'pendente',
    data_pagamento    DATE NULL,
    criado_em         DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Limpa rate limiting
TRUNCATE TABLE login_attempts;

SQL

echo "  Banco corrigido!"

# ── 2. CORRIGE TODOS OS ARQUIVOS PHP ─────────────────────
echo "[2/6] Corrigindo arquivos PHP..."

# Remove debug.php de todos os arquivos
find $APP/backend/api -name "*.php" -exec sed -i '/debug.php/d' {} \;

# --- cors.php ---
cat > $APP/backend/config/cors.php <<'PHPEOF'
<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($origin)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: *");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-Id, X-User-Role');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/controlcash_errors.log');
error_reporting(E_ALL);

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("[$errno] $errstr in $errfile:$errline");
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno do servidor']);
    exit;
});

set_exception_handler(function($e) {
    error_log("Exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno do servidor']);
    exit;
});

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
PHPEOF

# --- database.php ---
cat > $APP/backend/config/database.php <<'PHPEOF'
<?php
$_envFile = __DIR__ . '/../../.env.backend';
if (file_exists($_envFile)) {
    foreach (file($_envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $_line) {
        if (str_starts_with(trim($_line), '#') || !str_contains($_line, '=')) continue;
        [$_k, $_v] = explode('=', $_line, 2);
        $_ENV[trim($_k)] = trim($_v);
    }
}

define('DB_HOST', $_ENV['DB_HOST'] ?? '127.0.0.1');
define('DB_USER', $_ENV['DB_USER'] ?? 'controlcash');
define('DB_PASS', $_ENV['DB_PASS'] ?? 'Cc2025controlcash');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'virtualcore');
define('DB_PORT', (int)($_ENV['DB_PORT'] ?? 3306));

function getConnection(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        error_log("DB Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Falha na conexão com o banco de dados']);
        exit;
    }
    return $pdo;
}
PHPEOF

# --- admin/clientes.php ---
cat > $APP/backend/api/admin/clientes.php <<'PHPEOF'
<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        $stmt = $pdo->query('SELECT * FROM admin_clientes ORDER BY empresa');
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['empresa']) || empty($data['contato'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Empresa e contato são obrigatórios']);
            exit;
        }

        $planos = ['essencial' => 49, 'profissional' => 79, 'empresa' => 129];
        $plano  = $data['plano'] ?? 'essencial';
        $preco  = $planos[$plano] ?? 49;

        $stmt = $pdo->prepare('
            INSERT INTO admin_clientes (empresa, contato, cpf_cnpj, telefone, email_contato, plano, setup, recorrencia, status, usuario_id)
            VALUES (:empresa, :contato, :cpf_cnpj, :telefone, :email, :plano, :setup, :recorrencia, "ativo", :uid)
        ');
        $stmt->execute([
            'empresa'     => $data['empresa'],
            'contato'     => $data['contato'],
            'cpf_cnpj'    => $data['cpf_cnpj'] ?? null,
            'telefone'    => $data['telefone'] ?? null,
            'email'       => $data['email_contato'] ?? null,
            'plano'       => $plano,
            'setup'       => $preco * 3,
            'recorrencia' => $preco,
            'uid'         => getCurrentUser()['id'],
        ]);

        $newId = $pdo->lastInsertId();
        $tempSenha = null;
        if (!empty($data['email_contato'])) {
            $tempSenha = substr(str_shuffle('abcdefghijkmnpqrstuvwxyz23456789'), 0, 8);
            $hash = password_hash($tempSenha, PASSWORD_BCRYPT);
            $usuario = strtolower(explode('@', $data['email_contato'])[0]);
            $pdo->prepare('
                INSERT INTO usuarios (email, usuario, senha, nome, role, plano, ativo)
                VALUES (:email, :usuario, :senha, :nome, "user", :plano, 1)
                ON DUPLICATE KEY UPDATE id=id
            ')->execute([
                'email'   => $data['email_contato'],
                'usuario' => $usuario,
                'senha'   => $hash,
                'nome'    => $data['contato'],
                'plano'   => $plano,
            ]);
        }

        $novo = $pdo->prepare('SELECT * FROM admin_clientes WHERE id = ?');
        $novo->execute([$newId]);
        $result = $novo->fetch();
        if ($tempSenha) $result['temp_senha'] = $tempSenha;

        http_response_code(201);
        echo json_encode($result);
        break;

    case 'PATCH':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $data = json_decode(file_get_contents('php://input'), true);

        $planos = ['essencial' => 49, 'profissional' => 79, 'empresa' => 129];
        $plano  = $data['plano'] ?? 'essencial';
        $preco  = $planos[$plano] ?? 49;

        $pdo->prepare('
            UPDATE admin_clientes SET empresa=:empresa, contato=:contato, cpf_cnpj=:cpf_cnpj,
            telefone=:telefone, email_contato=:email, plano=:plano, setup=:setup, recorrencia=:recorrencia
            WHERE id=:id
        ')->execute([
            'empresa'     => $data['empresa'],
            'contato'     => $data['contato'],
            'cpf_cnpj'    => $data['cpf_cnpj'] ?? null,
            'telefone'    => $data['telefone'] ?? null,
            'email'       => $data['email_contato'] ?? null,
            'plano'       => $plano,
            'setup'       => $data['setup'] ?? $preco * 3,
            'recorrencia' => $data['recorrencia'] ?? $preco,
            'id'          => $id,
        ]);

        $stmt = $pdo->prepare('SELECT * FROM admin_clientes WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }

        $cli = $pdo->prepare('SELECT email_contato FROM admin_clientes WHERE id = ?');
        $cli->execute([$id]);
        $email = $cli->fetchColumn();
        if ($email) {
            $pdo->prepare('DELETE FROM notificacoes WHERE usuario_id IN (SELECT id FROM usuarios WHERE email = ?)')->execute([$email]);
            $pdo->prepare('DELETE FROM usuarios WHERE email = ?')->execute([$email]);
        }
        $pdo->prepare('DELETE FROM admin_cobrancas WHERE admin_cliente_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM admin_clientes WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
PHPEOF

# --- admin/toggle_status.php ---
cat > $APP/backend/api/admin/toggle_status.php <<'PHPEOF'
<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : null;
if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }

$data = json_decode(file_get_contents('php://input'), true);
$status = ($data['status'] ?? '') === 'ativo' ? 'ativo' : 'inativo';
$ativo  = $status === 'ativo' ? 1 : 0;

$pdo = getConnection();
$pdo->prepare('UPDATE admin_clientes SET status = ? WHERE id = ?')->execute([$status, $id]);

$cli = $pdo->prepare('SELECT email_contato FROM admin_clientes WHERE id = ?');
$cli->execute([$id]);
$email = $cli->fetchColumn();
if ($email) {
    $pdo->prepare('UPDATE usuarios SET ativo = ? WHERE email = ?')->execute([$ativo, $email]);
}

$stmt = $pdo->prepare('SELECT * FROM admin_clientes WHERE id = ?');
$stmt->execute([$id]);
echo json_encode($stmt->fetch());
PHPEOF

# ── 3. NGINX ─────────────────────────────────────────────
echo "[3/6] Configurando Nginx..."

cat > /etc/nginx/nginx.conf <<'NGINXEOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;
include /usr/share/nginx/modules/*.conf;
events { worker_connections 1024; }
http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent';
    access_log /var/log/nginx/access.log main;
    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    types_hash_max_size 4096;
    client_max_body_size 10M;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    include /etc/nginx/conf.d/*.conf;
}
NGINXEOF

cat > /etc/nginx/conf.d/controlcash.conf <<'NGINXEOF'
server {
    listen 80;
    server_name controlcash.virtualcore.com.br 185.194.217.100;

    root /var/www/controlcash/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location ~ ^/api/(.+\.php)(.*)$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME /var/www/controlcash/backend/api/$1;
        fastcgi_param PATH_INFO $2;
        fastcgi_param REQUEST_METHOD $request_method;
        fastcgi_param CONTENT_TYPE $content_type;
        fastcgi_param CONTENT_LENGTH $content_length;
        fastcgi_param QUERY_STRING $query_string;
        fastcgi_param REQUEST_URI $request_uri;
        fastcgi_param SERVER_PROTOCOL $server_protocol;
        fastcgi_param REMOTE_ADDR $remote_addr;
        fastcgi_param HTTP_ORIGIN $http_origin;
        fastcgi_param HTTP_AUTHORIZATION $http_authorization;
        fastcgi_param HTTP_X_USER_ID $http_x_user_id;
        fastcgi_param HTTP_X_USER_ROLE $http_x_user_role;
        include fastcgi_params;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~ /\.env { deny all; return 404; }
    location ~ /\.git { deny all; return 404; }
}
NGINXEOF

rm -f /etc/nginx/conf.d/default.conf

# ── 4. PERMISSÕES E SELINUX ──────────────────────────────
echo "[4/6] Corrigindo permissões..."

chown -R nginx:nginx $APP
chmod -R 755 $APP/backend
chmod 644 $APP/.env.backend
touch /tmp/controlcash_errors.log
chmod 666 /tmp/controlcash_errors.log

setsebool -P httpd_can_network_connect 1 2>/dev/null || true
setsebool -P httpd_can_network_connect_db 1 2>/dev/null || true
chcon -R -t httpd_sys_content_t $APP 2>/dev/null || true
chcon -R -t httpd_sys_rw_content_t $APP/backend 2>/dev/null || true
chcon -t httpd_sys_rw_content_t $APP/.env.backend 2>/dev/null || true

# ── 5. REINICIA SERVIÇOS ─────────────────────────────────
echo "[5/6] Reiniciando serviços..."

nginx -t && systemctl restart nginx && systemctl restart php-fpm

# ── 6. TESTES ─────────────────────────────────────────────
echo "[6/6] Testando endpoints..."
echo ""

echo "--- Login ---"
curl -s http://localhost/api/auth/login.php -X POST -H "Content-Type: application/json" -d '{"usuario":"telyson","senha":"VirtualCore@19#"}' | python3 -m json.tool 2>/dev/null || curl -s http://localhost/api/auth/login.php -X POST -H "Content-Type: application/json" -d '{"usuario":"telyson","senha":"VirtualCore@19#"}'
echo ""

echo "--- Clientes GET ---"
curl -s "http://localhost/api/cadastros/clientes.php" -H "X-User-Id: 8" -H "X-User-Role: admin" | head -c 100
echo ""

echo "--- Vendas GET ---"
curl -s "http://localhost/api/vendas/index.php" -H "X-User-Id: 8" -H "X-User-Role: admin" | head -c 100
echo ""

echo "--- Admin Clientes POST ---"
curl -s "http://localhost/api/admin/clientes.php" -X POST -H "X-User-Id: 8" -H "X-User-Role: admin" -H "Content-Type: application/json" -d '{"empresa":"TesteFix","contato":"Fix","plano":"essencial"}'
echo ""

echo "--- Contas Receber GET ---"
curl -s "http://localhost/api/contas-receber/index.php" -H "X-User-Id: 8" -H "X-User-Role: admin" | head -c 100
echo ""

echo "--- Contas Pagar GET ---"
curl -s "http://localhost/api/contas-pagar/index.php" -H "X-User-Id: 8" -H "X-User-Role: admin" | head -c 100
echo ""

echo "--- Estoque GET ---"
curl -s "http://localhost/api/estoque/index.php" -H "X-User-Id: 8" -H "X-User-Role: admin" | head -c 100
echo ""

echo "--- Contratos GET ---"
curl -s "http://localhost/api/contratos/index.php" -H "X-User-Id: 8" -H "X-User-Role: admin" | head -c 100
echo ""

echo "--- Erros PHP ---"
cat /tmp/controlcash_errors.log 2>/dev/null || echo "Sem erros"
echo ""

echo "========================================="
echo "  CORREÇÃO CONCLUÍDA!"
echo "========================================="
echo "  URL: http://controlcash.virtualcore.com.br"
echo "  Login: telyson / VirtualCore@19#"
echo "========================================="
