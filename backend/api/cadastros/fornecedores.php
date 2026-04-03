<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        $stmt = $pdo->query('SELECT * FROM fornecedores ORDER BY nome');
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['nome'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nome é obrigatório']);
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO fornecedores (nome, telefone, categoria) VALUES (:nome, :telefone, :categoria)');
        $stmt->execute([
            'nome'      => $data['nome'],
            'telefone'  => $data['telefone']  ?? null,
            'categoria' => $data['categoria'] ?? null,
        ]);

        $id   = $pdo->lastInsertId();
        $novo = $pdo->prepare('SELECT * FROM fornecedores WHERE id = ?');
        $novo->execute([$id]);

        http_response_code(201);
        echo json_encode($novo->fetch());
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $pdo->prepare('UPDATE estoque SET fornecedor_id = NULL WHERE fornecedor_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM fornecedores WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    case 'PATCH':
        $id   = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $data = json_decode(file_get_contents('php://input'), true);

        $pdo->prepare('UPDATE fornecedores SET nome=:nome, telefone=:telefone, categoria=:categoria WHERE id=:id')
            ->execute(['nome' => $data['nome'], 'telefone' => $data['telefone'] ?? null, 'categoria' => $data['categoria'] ?? null, 'id' => $id]);

        $stmt = $pdo->prepare('SELECT * FROM fornecedores WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
