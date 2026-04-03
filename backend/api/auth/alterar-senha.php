<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

$user = getCurrentUser();
$data = json_decode(file_get_contents('php://input'), true);

$senhaAtual = $data['senha_atual'] ?? '';
$senhaNova  = $data['senha_nova']  ?? '';

if (!$senhaAtual || !$senhaNova) {
    http_response_code(400);
    echo json_encode(['error' => 'Senha atual e nova senha são obrigatórias']);
    exit;
}

if (strlen($senhaNova) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'A nova senha deve ter no mínimo 6 caracteres']);
    exit;
}

$pdo = getConnection();

// Busca senha atual do usuário
$stmt = $pdo->prepare('SELECT senha FROM usuarios WHERE id = ?');
$stmt->execute([$user['id']]);
$row = $stmt->fetch();

if (!$row) {
    http_response_code(404);
    echo json_encode(['error' => 'Usuário não encontrado']);
    exit;
}

// Verifica senha atual
if (!password_verify($senhaAtual, $row['senha'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Senha atual incorreta']);
    exit;
}

// Atualiza para nova senha
$hash = password_hash($senhaNova, PASSWORD_BCRYPT);
$pdo->prepare('UPDATE usuarios SET senha = ? WHERE id = ?')->execute([$hash, $user['id']]);

echo json_encode(['ok' => true, 'message' => 'Senha alterada com sucesso']);
