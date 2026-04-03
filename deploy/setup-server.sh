#!/bin/bash
# ============================================================
# ControlCash — Deploy completo no CentOS 9 Stream (Contabo)
# Execute como root: bash setup-server.sh
# ============================================================

set -e

DOMAIN="controlcash.virtualcore.com.br"
DB_NAME="virtualcore"
DB_USER="controlcash"
DB_PASS="Cc@$(openssl rand -hex 8)"
JWT_SECRET="$(openssl rand -hex 32)"
APP_DIR="/var/www/controlcash"

echo "========================================="
echo "  ControlCash — Setup CentOS 9 Stream"
echo "========================================="
echo ""
echo "Domínio/IP: $DOMAIN"
echo "Banco: $DB_NAME"
echo "Usuário DB: $DB_USER"
echo ""

# ── 1. Atualizar sistema ─────────────────────────────────
echo "[1/9] Atualizando sistema..."
dnf update -y -q
dnf install -y -q epel-release

# ── 2. Instalar Nginx ────────────────────────────────────
echo "[2/9] Instalando Nginx..."
dnf install -y -q nginx
systemctl enable nginx
systemctl start nginx

# ── 3. Instalar PHP 8.1 + extensões ─────────────────────
echo "[3/9] Instalando PHP 8.1..."
dnf install -y -q dnf-utils
dnf install -y -q https://rpms.remirepo.net/enterprise/remi-release-9.rpm 2>/dev/null || true
dnf module reset php -y -q 2>/dev/null || true
dnf module enable php:remi-8.1 -y -q 2>/dev/null || true
dnf install -y -q php php-fpm php-mysqlnd php-pdo php-mbstring php-json php-curl php-xml php-zip php-bcmath

# Configura PHP-FPM para Nginx
sed -i 's/^user = apache/user = nginx/' /etc/php-fpm.d/www.conf
sed -i 's/^group = apache/group = nginx/' /etc/php-fpm.d/www.conf
sed -i 's|^listen = .*|listen = /run/php-fpm/www.sock|' /etc/php-fpm.d/www.conf
sed -i 's|^;listen.owner = .*|listen.owner = nginx|' /etc/php-fpm.d/www.conf
sed -i 's|^;listen.group = .*|listen.group = nginx|' /etc/php-fpm.d/www.conf

systemctl enable php-fpm
systemctl start php-fpm

# ── 4. Instalar MariaDB ─────────────────────────────────
echo "[4/9] Instalando MariaDB..."
dnf install -y -q mariadb-server mariadb
systemctl enable mariadb
systemctl start mariadb

# Criar banco e usuário
mysql -u root <<EOSQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOSQL
echo "  Banco '${DB_NAME}' e usuário '${DB_USER}' criados."

# ── 5. Instalar Node.js 20 LTS ──────────────────────────
echo "[5/9] Instalando Node.js 20..."
dnf install -y -q nodejs npm 2>/dev/null || {
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y -q nodejs
}

# ── 6. Instalar Git e clonar repositório ─────────────────
echo "[6/9] Clonando repositório..."
dnf install -y -q git
rm -rf ${APP_DIR}
git clone https://github.com/telysonpinheiro-lang/controlcash.git ${APP_DIR}
cd ${APP_DIR}

# ── 7. Importar banco de dados ───────────────────────────
echo "[7/9] Importando banco de dados..."
mysql -u ${DB_USER} -p"${DB_PASS}" ${DB_NAME} < ${APP_DIR}/backend/database.sql
mysql -u ${DB_USER} -p"${DB_PASS}" ${DB_NAME} < ${APP_DIR}/backend/database_updates.sql
mysql -u ${DB_USER} -p"${DB_PASS}" ${DB_NAME} < ${APP_DIR}/backend/database_security.sql
echo "  Tabelas importadas com sucesso."

# ── 8. Configurar backend ────────────────────────────────
echo "[8/9] Configurando backend..."

# .env.backend com credenciais reais
cat > ${APP_DIR}/.env.backend <<ENVEOF
JWT_SECRET=${JWT_SECRET}
DB_HOST=localhost
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
DB_NAME=${DB_NAME}
DB_PORT=3306
# WA_API_URL=
# WA_API_TOKEN=
# WA_INSTANCE=virtualcore
ENVEOF

# Atualizar database.php para ler do .env.backend
cat > ${APP_DIR}/backend/config/database.php <<'DBEOF'
<?php
// Carrega .env.backend
$_envFile = __DIR__ . '/../../.env.backend';
if (file_exists($_envFile)) {
    foreach (file($_envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $_line) {
        if (str_starts_with(trim($_line), '#') || !str_contains($_line, '=')) continue;
        [$_k, $_v] = explode('=', $_line, 2);
        $_ENV[trim($_k)] = trim($_v);
    }
}

define('DB_HOST', $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'localhost');
define('DB_USER', $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?: '');
define('DB_NAME', $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'virtualcore');
define('DB_PORT', (int)($_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: 3306));

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

# Build do frontend apontando para API de produção
cat > ${APP_DIR}/.env <<FENVEOF
VITE_API_URL=http://${DOMAIN}/api
FENVEOF

cd ${APP_DIR}
npm ci --production=false
npx vite build

# Permissões
chown -R nginx:nginx ${APP_DIR}
chmod -R 755 ${APP_DIR}
chmod 600 ${APP_DIR}/.env.backend

# ── 9. Configurar Nginx ──────────────────────────────────
echo "[9/9] Configurando Nginx..."

cat > /etc/nginx/conf.d/controlcash.conf <<NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};

    root ${APP_DIR}/dist;
    index index.html;

    # Segurança
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # API PHP → backend
    location /api/ {
        alias ${APP_DIR}/backend/api/;
        try_files \$uri \$uri/ =404;

        location ~ \.php$ {
            fastcgi_pass unix:/run/php-fpm/www.sock;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME \$request_filename;
            include fastcgi_params;
        }
    }

    # Frontend SPA → React
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Bloqueia acesso a arquivos sensíveis
    location ~ /\.env { deny all; return 404; }
    location ~ /\.git { deny all; return 404; }
    location ~ /node_modules { deny all; return 404; }
}
NGINXEOF

# Remove config padrão se existir
rm -f /etc/nginx/conf.d/default.conf 2>/dev/null

# Testa e reinicia
nginx -t
systemctl restart nginx
systemctl restart php-fpm

# ── Firewall ─────────────────────────────────────────────
echo "Configurando firewall..."
firewall-cmd --permanent --add-service=http 2>/dev/null || true
firewall-cmd --permanent --add-service=https 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true

# SELinux
setsebool -P httpd_can_network_connect 1 2>/dev/null || true
setsebool -P httpd_can_network_connect_db 1 2>/dev/null || true
chcon -R -t httpd_sys_content_t ${APP_DIR} 2>/dev/null || true
chcon -R -t httpd_sys_rw_content_t ${APP_DIR}/backend 2>/dev/null || true
chcon -R -t httpd_sys_rw_content_t ${APP_DIR}/.env.backend 2>/dev/null || true

# ── Cron de cobranças (diário 8h) ────────────────────────
echo "Configurando cron..."
(crontab -l 2>/dev/null; echo "0 8 * * * /usr/bin/php ${APP_DIR}/backend/cron/cobrar_vencidos.php >> /var/log/controlcash-cron.log 2>&1") | crontab -

# ── SSL com Certbot (Let's Encrypt) ──────────────────────
echo "Instalando SSL..."
dnf install -y -q certbot python3-certbot-nginx
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@virtualcore.com.br --redirect 2>/dev/null || {
    echo "  [AVISO] SSL falhou — verifique se o DNS aponta para este IP"
    echo "  Depois rode: certbot --nginx -d ${DOMAIN}"
}

# Atualiza .env do frontend para HTTPS
cat > ${APP_DIR}/.env <<FENVEOF2
VITE_API_URL=https://${DOMAIN}/api
FENVEOF2
cd ${APP_DIR} && npx vite build --mode production 2>/dev/null
chown -R nginx:nginx ${APP_DIR}/dist

# Renovação automática do SSL
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet >> /var/log/certbot-renew.log 2>&1") | crontab -

# ── Criar usuário admin no sistema ───────────────────────
ADMIN_PASS='Admin@123'
ADMIN_HASH=$(php -r "echo password_hash('${ADMIN_PASS}', PASSWORD_BCRYPT);")

mysql -u ${DB_USER} -p"${DB_PASS}" ${DB_NAME} <<EOSQL2
INSERT INTO usuarios (email, usuario, senha, nome, role, plano, ativo)
VALUES ('admin@controlcash.com', 'admin', '${ADMIN_HASH}', 'Administrador', 'admin', 'empresa', 1)
ON DUPLICATE KEY UPDATE senha='${ADMIN_HASH}';
EOSQL2

# ── Resumo ───────────────────────────────────────────────
echo ""
echo "========================================="
echo "  DEPLOY CONCLUÍDO COM SUCESSO!"
echo "========================================="
echo ""
echo "  URL: http://${DOMAIN}"
echo ""
echo "  Login:"
echo "    Usuário: admin"
echo "    Senha:   ${ADMIN_PASS}"
echo ""
echo "  Banco de Dados:"
echo "    Host:    localhost"
echo "    Banco:   ${DB_NAME}"
echo "    Usuário: ${DB_USER}"
echo "    Senha:   ${DB_PASS}"
echo ""
echo "  JWT Secret: ${JWT_SECRET}"
echo ""
echo "  IMPORTANTE:"
echo "    1. Troque a senha do admin no primeiro login"
echo "    2. Troque a senha SSH do servidor"
echo "    3. Para SSL, aponte um domínio e rode:"
echo "       dnf install certbot python3-certbot-nginx -y"
echo "       certbot --nginx -d seudominio.com.br"
echo ""
echo "  Cron de cobranças: diariamente às 08:00"
echo "  Logs: /var/log/controlcash-cron.log"
echo "========================================="
