<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/jwt.php';

set_error_handler(function($errno, $errstr) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno']);
    exit;
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

$body    = json_decode(file_get_contents('php://input'), true);
$usuario = trim($body['usuario'] ?? $body['email'] ?? '');
$senha   = trim($body['senha']   ?? '');

if (!$usuario || !$senha) {
    http_response_code(400);
    echo json_encode(['error' => 'Usuário e senha são obrigatórios']);
    exit;
}

// Sanitiza input — máximo 255 chars, sem caracteres de controle
$usuario = substr(preg_replace('/[\x00-\x1F\x7F]/', '', $usuario), 0, 255);
$senha   = substr($senha, 0, 255);

try {
    $pdo = getConnection();
    $ip  = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    // ── Rate Limiting (por IP) ──────────────────────────────
    // Máximo 5 tentativas por IP em 15 minutos
    $stmtRate = $pdo->prepare('
        SELECT COUNT(*) AS tentativas
        FROM login_attempts
        WHERE ip = ? AND sucesso = 0 AND tentativa_em > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    ');
    $stmtRate->execute([$ip]);
    $tentativas = (int) $stmtRate->fetchColumn();

    if ($tentativas >= 5) {
        http_response_code(429);
        echo json_encode(['error' => 'Muitas tentativas de login. Aguarde 15 minutos.']);
        exit;
    }

    // ── Busca usuário ───────────────────────────────────────
    $stmt = $pdo->prepare('SELECT id, email, usuario, senha, nome, role, plano, ativo FROM usuarios WHERE usuario = ? OR email = ? LIMIT 1');
    $stmt->execute([$usuario, $usuario]);
    $user = $stmt->fetch();

    // ── Proteção contra timing attack ───────────────────────
    // Sempre executa password_verify mesmo se usuário não existir
    $dummyHash = '$2y$10$dummyhashfortimingatttackprotection000000000000000000';
    $hashToCheck = $user ? $user['senha'] : $dummyHash;
    $passwordValid = password_verify($senha, $hashToCheck);

    if (!$user || !$passwordValid) {
        // Registra tentativa falha
        $pdo->prepare('INSERT INTO login_attempts (ip, usuario, sucesso) VALUES (?, ?, 0)')
            ->execute([$ip, $usuario]);

        http_response_code(401);
        echo json_encode(['error' => 'Usuário ou senha incorretos']);
        exit;
    }

    if (isset($user['ativo']) && !$user['ativo']) {
        http_response_code(403);
        echo json_encode(['error' => 'Conta inativa. Entre em contato com o administrador.']);
        exit;
    }

    // ── Registra login bem-sucedido ─────────────────────────
    $pdo->prepare('INSERT INTO login_attempts (ip, usuario, sucesso) VALUES (?, ?, 1)')
        ->execute([$ip, $usuario]);

    // Limpa tentativas antigas (manutenção)
    $pdo->exec("DELETE FROM login_attempts WHERE tentativa_em < DATE_SUB(NOW(), INTERVAL 24 HOUR)");

    // ── Gera JWT ────────────────────────────────────────────
    $token = jwt_encode([
        'sub'  => $user['id'],
        'role' => $user['role'] ?? 'user',
        'nome' => $user['nome'],
    ]);

    unset($user['senha'], $user['ativo']);
    echo json_encode([
        'ok'    => true,
        'user'  => $user,
        'token' => $token,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro no servidor']);
}
