<?php
/**
 * Middleware de isolamento multi-tenant com autenticação JWT.
 * Valida o token Bearer e extrai user ID e role do payload assinado.
 */

require_once __DIR__ . '/jwt.php';

/**
 * Autentica o usuário via JWT (Authorization: Bearer <token>).
 * Fallback temporário para X-User-Id durante migração.
 */
function getCurrentUser(): array {
    // 1. Tenta JWT (método seguro)
    $token = getBearerToken();
    if ($token) {
        $payload = jwt_decode($token);
        if ($payload && !empty($payload['sub'])) {
            return [
                'id'   => (int) $payload['sub'],
                'role' => $payload['role'] ?? 'user',
            ];
        }
        // Token inválido/expirado
        http_response_code(401);
        echo json_encode(['error' => 'Token inválido ou expirado']);
        exit;
    }

    // Não autenticado
    http_response_code(401);
    echo json_encode(['error' => 'Não autenticado']);
    exit;
}

/**
 * Retorna cláusula SQL de filtro por tenant usando prepared statement params.
 * Retorna [sql, params] para uso seguro em queries.
 */
function tenantFilterParam(string $alias = ''): array {
    $user = getCurrentUser();
    $col = $alias ? "{$alias}.usuario_id" : 'usuario_id';
    return ["{$col} = ?", [$user['id']]];
}

/**
 * @deprecated Use tenantFilterParam() para queries com prepared statements.
 * Mantido para compatibilidade — usa intval() para segurança.
 */
function tenantFilter(string $alias = ''): string {
    $user = getCurrentUser();
    $col = $alias ? "{$alias}.usuario_id" : 'usuario_id';
    $id = intval($user['id']); // Garante que é inteiro
    return "{$col} = {$id}";
}

/**
 * Garante que o registro pertence ao usuário atual antes de mutações.
 * Lança 403 se não pertencer.
 */
function assertOwnership(PDO $pdo, string $table, int $id): void {
    $user = getCurrentUser();

    // Usa whitelist de tabelas para evitar SQL injection no nome da tabela
    $allowedTables = [
        'vendas', 'contas_pagar', 'contas_receber', 'contratos',
        'clientes', 'fornecedores', 'servicos', 'estoque',
        'notificacoes', 'admin_clientes',
    ];
    if (!in_array($table, $allowedTables, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Tabela inválida']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM {$table} WHERE id = ? AND usuario_id = ?");
    $stmt->execute([$id, $user['id']]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode(['error' => 'Acesso negado a este recurso']);
        exit;
    }
}
