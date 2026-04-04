<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

$adminUser = getCurrentUser();
if ($adminUser['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Acesso restrito ao administrador']);
    exit;
}

$pdo = getConnection();
$id  = isset($_GET['id']) ? (int) $_GET['id'] : null;

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH' || !$id) {
    http_response_code(400);
    echo json_encode(['error' => 'PATCH com id é obrigatório']);
    exit;
}

$data   = json_decode(file_get_contents('php://input'), true);
$status = $data['status'] ?? 'ativo';
$ativo  = $status === 'ativo' ? 1 : 0;

// Atualiza admin_clientes
$pdo->prepare('UPDATE admin_clientes SET status = ? WHERE id = ?')->execute([$status, $id]);

// Atualiza usuarios.ativo (vinculado)
$cli = $pdo->prepare('SELECT usuario_id FROM admin_clientes WHERE id = ?');
$cli->execute([$id]);
$c = $cli->fetch();
if ($c && $c['usuario_id']) {
    $pdo->prepare('UPDATE usuarios SET ativo = ? WHERE id = ?')->execute([$ativo, $c['usuario_id']]);
}

// Retorna atualizado
$stmt = $pdo->prepare('SELECT * FROM admin_clientes WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch();
$row['modulos'] = json_decode($row['modulos'] ?? '[]');
echo json_encode($row);
