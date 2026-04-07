<?php
// ── CORS + Security Headers ──────────────────────────────

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Whitelist explícita de origens permitidas
$allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost',
    'https://controlcash.virtualcore.com.br',
];

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header("Access-Control-Allow-Origin: https://controlcash.virtualcore.com.br");
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-Id, X-User-Role');

// ── Security Headers ─────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

// HSTS — descomente em produção com HTTPS
// header('Strict-Transport-Security: max-age=31536000; includeSubDomains');

// ── Global error handler (não vaza detalhes) ─────────────
set_error_handler(function($errno, $errstr) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno do servidor']);
    exit;
});

set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno do servidor']);
    exit;
});

// Responde preflight OPTIONS e encerra
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
