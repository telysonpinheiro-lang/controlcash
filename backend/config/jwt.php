<?php
/**
 * Implementação JWT simples usando HMAC-SHA256.
 * Sem dependências externas — usa apenas funções nativas do PHP.
 */

// Carrega .env.backend se existir
$_envBackend = __DIR__ . '/../../.env.backend';
if (file_exists($_envBackend)) {
    foreach (file($_envBackend, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $_line) {
        if (str_starts_with(trim($_line), '#') || !str_contains($_line, '=')) continue;
        [$_k, $_v] = explode('=', $_line, 2);
        $_ENV[trim($_k)] = trim($_v);
    }
}

define('JWT_SECRET', $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: 'fallback_dev_only_' . md5(__DIR__));
define('JWT_EXPIRY', 3600); // 1 hora

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Gera um token JWT assinado com HMAC-SHA256.
 */
function jwt_encode(array $payload): string {
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));

    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRY;
    $body = base64url_encode(json_encode($payload));

    $signature = base64url_encode(
        hash_hmac('sha256', "{$header}.{$body}", JWT_SECRET, true)
    );

    return "{$header}.{$body}.{$signature}";
}

/**
 * Decodifica e valida um token JWT.
 * Retorna o payload ou null se inválido/expirado.
 */
function jwt_decode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $body, $signature] = $parts;

    // Verifica assinatura
    $expectedSig = base64url_encode(
        hash_hmac('sha256', "{$header}.{$body}", JWT_SECRET, true)
    );

    if (!hash_equals($expectedSig, $signature)) return null;

    $payload = json_decode(base64url_decode($body), true);
    if (!$payload) return null;

    // Verifica expiração
    if (isset($payload['exp']) && $payload['exp'] < time()) return null;

    return $payload;
}

/**
 * Extrai o token Bearer do header Authorization.
 */
function getBearerToken(): ?string {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        return $m[1];
    }
    return null;
}
