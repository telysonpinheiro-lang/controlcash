<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

$currentUser = getCurrentUser();
$uid         = $currentUser['id'];

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;         // movimento id
$itemId = isset($_GET['estoque_id']) ? (int) $_GET['estoque_id'] : null;

switch ($method) {

    case 'GET':
        // Lista histórico de um item
        if (!$itemId) { http_response_code(400); echo json_encode(['error' => 'estoque_id obrigatório']); exit; }
        $stmt = $pdo->prepare('
            SELECT m.*
            FROM estoque_movimentos m
            JOIN estoque e ON e.id = m.estoque_id AND e.usuario_id = ?
            WHERE m.estoque_id = ?
            ORDER BY m.criado_em DESC
        ');
        $stmt->execute([$uid, $itemId]);
        echo json_encode($stmt->fetchAll());
        break;

    case 'DELETE':
        // Apaga movimento e reverte o saldo no estoque
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }

        // Busca o movimento (verifica ownership via JOIN)
        $mov = $pdo->prepare('
            SELECT m.* FROM estoque_movimentos m
            JOIN estoque e ON e.id = m.estoque_id AND e.usuario_id = ?
            WHERE m.id = ?
        ');
        $mov->execute([$uid, $id]);
        $m = $mov->fetch();
        if (!$m) { http_response_code(404); echo json_encode(['error' => 'Movimento não encontrado']); exit; }

        // Reverte o saldo
        if ($m['tipo'] === 'saida') {
            $pdo->prepare('UPDATE estoque SET qtd_atual = qtd_atual + ? WHERE id = ?')->execute([$m['quantidade'], $m['estoque_id']]);
        } else {
            // Para entrada: verifica se há saldo suficiente antes de reverter
            $saldo = $pdo->prepare('SELECT qtd_atual FROM estoque WHERE id = ?');
            $saldo->execute([$m['estoque_id']]);
            $s = $saldo->fetchColumn();
            if ($s < $m['quantidade']) {
                http_response_code(422);
                echo json_encode(['error' => 'Não é possível excluir: saldo atual seria negativo']);
                exit;
            }
            $pdo->prepare('UPDATE estoque SET qtd_atual = qtd_atual - ? WHERE id = ?')->execute([$m['quantidade'], $m['estoque_id']]);
        }

        $pdo->prepare('DELETE FROM estoque_movimentos WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
