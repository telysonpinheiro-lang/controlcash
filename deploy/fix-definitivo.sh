#!/bin/bash
# ============================================================
# FIX DEFINITIVO — Resolve todos os problemas de uma vez
# Execute como root: bash fix-definitivo.sh
# ============================================================
set -e

APP="/var/www/controlcash"
DB_USER="controlcash"
DB_PASS="Cc2025controlcash"
DB_HOST="127.0.0.1"
DB_NAME="virtualcore"

echo "=== FIX DEFINITIVO ==="

# ── 1. CORRIGE TODAS AS COLUNAS DO BANCO ─────────────────
echo "[1/4] Corrigindo banco..."
mysql -u $DB_USER -p"$DB_PASS" -h $DB_HOST $DB_NAME <<'SQL'
-- usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario VARCHAR(150) NULL AFTER email;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plano VARCHAR(30) DEFAULT 'essencial' AFTER role;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo TINYINT(1) DEFAULT 1 AFTER plano;

-- clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS initials CHAR(2) NULL AFTER nome;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rua VARCHAR(255) NULL;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro VARCHAR(150) NULL;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade VARCHAR(150) NULL;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep VARCHAR(10) NULL;

-- vendas
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_id INT NULL AFTER usuario_id;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS initials CHAR(2) NULL AFTER cliente_nome;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS material DECIMAL(10,2) NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS prazo_pagamento DATE NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS data_envio VARCHAR(20) NULL;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS arquivado TINYINT(1) DEFAULT 0;

-- contas_receber
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS cliente_id INT NULL;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS initials CHAR(2) NULL;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS arquivado TINYINT(1) DEFAULT 0;
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS dias_atraso INT DEFAULT 0;

-- contas_pagar
ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;

-- contratos
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS cliente_id INT NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS aceite_hash CHAR(64) NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS aceite_ip VARCHAR(45) NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS aceite_data DATETIME NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS token_aceite CHAR(64) NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS autentique_id VARCHAR(100) NULL;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS autentique_link VARCHAR(500) NULL;

-- fornecedores / servicos
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;
ALTER TABLE servicos ADD COLUMN IF NOT EXISTS usuario_id INT NULL AFTER id;

-- admin_clientes — remove ENUM e usa VARCHAR
ALTER TABLE admin_clientes MODIFY COLUMN plano VARCHAR(30) DEFAULT 'essencial';
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20) NULL AFTER contato;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS telefone VARCHAR(20) NULL AFTER cpf_cnpj;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS email_contato VARCHAR(150) NULL AFTER telefone;
ALTER TABLE admin_clientes ADD COLUMN IF NOT EXISTS usuario_id INT NULL;

-- tabelas auxiliares
CREATE TABLE IF NOT EXISTS notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL,
    tipo ENUM('cobranca','vencimento','sistema') DEFAULT 'sistema',
    titulo VARCHAR(200) NOT NULL, mensagem TEXT, referencia VARCHAR(100),
    lida TINYINT(1) DEFAULT 0, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY, ip VARCHAR(45) NOT NULL,
    usuario VARCHAR(255) NOT NULL, sucesso TINYINT(1) DEFAULT 0,
    tentativa_em DATETIME DEFAULT CURRENT_TIMESTAMP, INDEX idx_ip_time (ip, tentativa_em)
);
CREATE TABLE IF NOT EXISTS estoque (
    id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL,
    nome VARCHAR(200) NOT NULL, categoria VARCHAR(100), unidade VARCHAR(20) DEFAULT 'un',
    qtd_atual DECIMAL(10,2) DEFAULT 0, qtd_minima DECIMAL(10,2) DEFAULT 0,
    custo_unit DECIMAL(10,2) DEFAULT 0.00, fornecedor_id INT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS estoque_movimentos (
    id INT AUTO_INCREMENT PRIMARY KEY, estoque_id INT NOT NULL, usuario_id INT NOT NULL,
    tipo ENUM('entrada','saida') NOT NULL, quantidade DECIMAL(10,2) NOT NULL,
    referencia VARCHAR(100), observacao VARCHAR(255), criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_cobrancas (
    id INT AUTO_INCREMENT PRIMARY KEY, admin_cliente_id INT NOT NULL,
    mes_ref VARCHAR(7) NOT NULL, valor DECIMAL(10,2) NOT NULL,
    status ENUM('pendente','pago','atrasado') DEFAULT 'pendente',
    data_pagamento DATE NULL, criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

TRUNCATE TABLE login_attempts;
SQL
echo "  Banco OK!"

# ── 2. REESCREVE ARQUIVOS CRITICOS ───────────────────────
echo "[2/4] Reescrevendo arquivos PHP..."

# Remove qualquer debug.php injetado
find $APP/backend/api -name "*.php" -exec sed -i '/debug.php/d' {} \;

# database.php
cat > $APP/backend/config/database.php <<'DBEOF'
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
        http_response_code(500);
        echo json_encode(['error' => 'Falha na conexão com o banco de dados']);
        exit;
    }
    return $pdo;
}
DBEOF

# cors.php
cat > $APP/backend/config/cors.php <<'CORSEOF'
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
CORSEOF

# admin/clientes.php — VERSAO DEFINITIVA SIMPLIFICADA
cat > $APP/backend/api/admin/clientes.php <<'ACEOF'
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
        if (empty($data['email_contato'])) {
            http_response_code(400);
            echo json_encode(['error' => 'E-mail é obrigatório']);
            exit;
        }

        // Verifica se já existe cliente ativo com este email
        $chk = $pdo->prepare('SELECT id FROM admin_clientes WHERE email_contato = ?');
        $chk->execute([$data['email_contato']]);
        if ($chk->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Já existe um cliente com este e-mail']);
            exit;
        }

        $planos = ['essencial' => 49, 'profissional' => 79, 'empresa' => 129];
        $plano  = $data['plano'] ?? 'essencial';
        $preco  = $planos[$plano] ?? 49;

        // Gera senha temporária
        $tempSenha = strtoupper(substr(md5(random_bytes(16)), 0, 8));
        $hash      = password_hash($tempSenha, PASSWORD_BCRYPT);
        $usuario   = strtolower(explode('@', $data['email_contato'])[0]);

        // Cria ou atualiza usuario
        $chkUser = $pdo->prepare('SELECT id FROM usuarios WHERE email = ?');
        $chkUser->execute([$data['email_contato']]);
        $existe = $chkUser->fetch();

        if ($existe) {
            $uid = $existe['id'];
            $pdo->prepare('UPDATE usuarios SET senha=?, nome=?, usuario=?, plano=?, ativo=1 WHERE id=?')
                ->execute([$hash, $data['contato'], $usuario, $plano, $uid]);
        } else {
            $pdo->prepare('INSERT INTO usuarios (email, usuario, senha, nome, role, plano, ativo) VALUES (?,?,?,?,?,?,1)')
                ->execute([$data['email_contato'], $usuario, $hash, $data['contato'], 'user', $plano]);
            $uid = $pdo->lastInsertId();
        }

        // Cria admin_cliente
        $pdo->prepare('
            INSERT INTO admin_clientes (empresa, contato, cpf_cnpj, telefone, email_contato, plano, setup, recorrencia, status, usuario_id)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        ')->execute([
            $data['empresa'],
            $data['contato'],
            $data['cpf_cnpj'] ?? null,
            $data['telefone'] ?? null,
            $data['email_contato'],
            $plano,
            $preco * 3,
            $preco,
            'ativo',
            $uid,
        ]);

        $id = $pdo->lastInsertId();
        $novo = $pdo->prepare('SELECT * FROM admin_clientes WHERE id = ?');
        $novo->execute([$id]);
        $row = $novo->fetch();
        $row['temp_senha'] = $tempSenha;

        http_response_code(201);
        echo json_encode($row);
        break;

    case 'PATCH':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $data = json_decode(file_get_contents('php://input'), true);

        $planos = ['essencial' => 49, 'profissional' => 79, 'empresa' => 129];
        $plano  = $data['plano'] ?? 'essencial';
        $preco  = $planos[$plano] ?? 49;

        $pdo->prepare('
            UPDATE admin_clientes SET empresa=?, contato=?, cpf_cnpj=?, telefone=?, email_contato=?, plano=?, setup=?, recorrencia=? WHERE id=?
        ')->execute([
            $data['empresa'], $data['contato'], $data['cpf_cnpj'] ?? null,
            $data['telefone'] ?? null, $data['email_contato'] ?? null,
            $plano, $data['setup'] ?? $preco * 3, $data['recorrencia'] ?? $preco, $id,
        ]);

        // Atualiza plano do usuario vinculado
        $cli = $pdo->prepare('SELECT usuario_id FROM admin_clientes WHERE id = ?');
        $cli->execute([$id]);
        $c = $cli->fetch();
        if ($c && $c['usuario_id']) {
            $pdo->prepare('UPDATE usuarios SET plano=? WHERE id=?')->execute([$plano, $c['usuario_id']]);
        }

        $stmt = $pdo->prepare('SELECT * FROM admin_clientes WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }

        // Pega usuario_id antes de deletar
        $cli = $pdo->prepare('SELECT usuario_id FROM admin_clientes WHERE id = ?');
        $cli->execute([$id]);
        $c = $cli->fetch();

        // Deleta cobranças e cliente
        $pdo->prepare('DELETE FROM admin_cobrancas WHERE admin_cliente_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM admin_clientes WHERE id = ?')->execute([$id]);

        // Deleta usuario vinculado (e suas notificações)
        if ($c && $c['usuario_id']) {
            $pdo->prepare('DELETE FROM notificacoes WHERE usuario_id = ?')->execute([$c['usuario_id']]);
            $pdo->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$c['usuario_id']]);
        }

        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
ACEOF

# toggle_status.php
cat > $APP/backend/api/admin/toggle_status.php <<'TSEOF'
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
$cli = $pdo->prepare('SELECT usuario_id FROM admin_clientes WHERE id = ?');
$cli->execute([$id]);
$c = $cli->fetchColumn();
if ($c) { $pdo->prepare('UPDATE usuarios SET ativo = ? WHERE id = ?')->execute([$ativo, $c]); }
$stmt = $pdo->prepare('SELECT * FROM admin_clientes WHERE id = ?');
$stmt->execute([$id]);
echo json_encode($stmt->fetch());
TSEOF

# ── 3. NGINX ─────────────────────────────────────────────
echo "[3/4] Verificando Nginx..."

cat > /etc/nginx/conf.d/controlcash.conf <<'NGEOF'
server {
    listen 80;
    server_name controlcash.virtualcore.com.br 185.194.217.100;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name controlcash.virtualcore.com.br;
    ssl_certificate /etc/letsencrypt/live/controlcash.virtualcore.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/controlcash.virtualcore.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    root /var/www/controlcash/dist;
    index index.html;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    location ~ ^/api/(.+\.php)(.*)$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
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
    location / { try_files $uri $uri/ /index.html; }
    location ~* \.(js|css|png|jpg|ico|svg|woff2?)$ { expires 30d; }
    location ~ /\.env { deny all; return 404; }
    location ~ /\.git { deny all; return 404; }
}
NGEOF

# ── 4. PERMISSÕES E RESTART ──────────────────────────────
echo "[4/4] Permissões e restart..."

chown -R nginx:nginx $APP
chmod 644 $APP/.env.backend
touch /tmp/controlcash_errors.log
chmod 666 /tmp/controlcash_errors.log
setsebool -P httpd_can_network_connect 1 2>/dev/null || true
setsebool -P httpd_can_network_connect_db 1 2>/dev/null || true

nginx -t && systemctl restart nginx && systemctl restart php-fpm

# ── TESTE FINAL ──────────────────────────────────────────
echo ""
echo "=== TESTE FINAL ==="

echo -n "Login: "
curl -sk https://localhost/api/auth/login.php -X POST -H "Content-Type: application/json" -d '{"usuario":"telyson","senha":"VirtualCore@19#"}' | grep -o '"ok":true' || echo "FALHOU"

echo -n "Admin GET: "
curl -sk "https://localhost/api/admin/clientes.php" -H "X-User-Id: 8" -H "X-User-Role: admin" | head -c 5
echo ""

echo -n "Admin POST: "
curl -sk "https://localhost/api/admin/clientes.php" -X POST -H "X-User-Id: 8" -H "X-User-Role: admin" -H "Content-Type: application/json" -d '{"empresa":"FixTest","contato":"Fix","email_contato":"fix@test.com","plano":"essencial"}' | grep -o '"temp_senha"' || echo "FALHOU"

echo -n "Admin DELETE: "
ID=$(mysql -u $DB_USER -p"$DB_PASS" -h $DB_HOST $DB_NAME -N -e "SELECT id FROM admin_clientes WHERE empresa='FixTest' LIMIT 1;" 2>/dev/null)
if [ -n "$ID" ]; then
    curl -sk "https://localhost/api/admin/clientes.php?id=$ID" -X DELETE -H "X-User-Id: 8" -H "X-User-Role: admin" | grep -o '"ok":true' || echo "FALHOU"
else
    echo "SKIP"
fi

echo -n "Erros PHP: "
cat /tmp/controlcash_errors.log 2>/dev/null | tail -1
[ ! -s /tmp/controlcash_errors.log ] && echo "NENHUM"

echo ""
echo "=== FIX DEFINITIVO CONCLUIDO ==="
echo "URL: https://controlcash.virtualcore.com.br"
echo "Login: telyson / VirtualCore@19#"
