<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

$currentUser = getCurrentUser();
$uid         = $currentUser['id'];

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch ($method) {

    case 'GET':
        if ($id) {
            // Histórico de movimentos de um item
            $stmt = $pdo->prepare('
                SELECT m.*, e.nome AS item_nome
                FROM estoque_movimentos m
                JOIN estoque e ON e.id = m.estoque_id
                WHERE m.estoque_id = ? AND m.usuario_id = ?
                ORDER BY m.criado_em DESC
            ');
            $stmt->execute([$id, $uid]);
            echo json_encode($stmt->fetchAll());
        } else {
            // Lista completa com alerta de estoque mínimo
            $stmt = $pdo->prepare('
                SELECT e.*, f.nome AS fornecedor_nome,
                    CASE WHEN e.qtd_atual <= e.qtd_minima THEN 1 ELSE 0 END AS estoque_baixo
                FROM estoque e
                LEFT JOIN fornecedores f ON f.id = e.fornecedor_id
                WHERE e.usuario_id = ?
                ORDER BY e.nome
            ');
            $stmt->execute([$uid]);
            echo json_encode($stmt->fetchAll());
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $acao = $data['acao'] ?? 'criar'; // 'criar' | 'entrada' | 'saida'

        if ($acao === 'criar') {
            if (empty($data['nome'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Nome é obrigatório']);
                exit;
            }
            $stmt = $pdo->prepare('
                INSERT INTO estoque (usuario_id, nome, categoria, unidade, qtd_atual, qtd_minima, custo_unit, fornecedor_id)
                VALUES (:uid, :nome, :cat, :un, :qtd, :min, :custo, :forn)
            ');
            $stmt->execute([
                'uid'   => $uid,
                'nome'  => $data['nome'],
                'cat'   => $data['categoria']    ?? null,
                'un'    => $data['unidade']      ?? 'un',
                'qtd'   => (float) ($data['qtd_atual']  ?? 0),
                'min'   => (float) ($data['qtd_minima'] ?? 0),
                'custo' => (float) ($data['custo_unit'] ?? 0),
                'forn'  => $data['fornecedor_id'] ?? null,
            ]);
            $newId = $pdo->lastInsertId();
            $novo  = $pdo->prepare('SELECT * FROM estoque WHERE id = ?');
            $novo->execute([$newId]);
            http_response_code(201);
            echo json_encode($novo->fetch());

        } elseif (in_array($acao, ['entrada', 'saida'])) {
            if (!$id || empty($data['quantidade'])) {
                http_response_code(400);
                echo json_encode(['error' => 'id e quantidade são obrigatórios']);
                exit;
            }
            $qty = abs((float) $data['quantidade']);

            // Verifica saldo para saída
            if ($acao === 'saida') {
                $saldo = $pdo->prepare('SELECT qtd_atual FROM estoque WHERE id = ? AND usuario_id = ?');
                $saldo->execute([$id, $uid]);
                $item = $saldo->fetch();
                if (!$item || $item['qtd_atual'] < $qty) {
                    http_response_code(422);
                    echo json_encode(['error' => 'Saldo insuficiente em estoque']);
                    exit;
                }
                $pdo->prepare('UPDATE estoque SET qtd_atual = qtd_atual - ? WHERE id = ? AND usuario_id = ?')
                    ->execute([$qty, $id, $uid]);
            } else {
                $pdo->prepare('UPDATE estoque SET qtd_atual = qtd_atual + ? WHERE id = ? AND usuario_id = ?')
                    ->execute([$qty, $id, $uid]);
            }

            // Registra movimento
            $pdo->prepare('
                INSERT INTO estoque_movimentos (estoque_id, usuario_id, tipo, quantidade, referencia, observacao)
                VALUES (?, ?, ?, ?, ?, ?)
            ')->execute([$id, $uid, $acao, $qty, $data['referencia'] ?? null, $data['observacao'] ?? null]);

            $atualizado = $pdo->prepare('SELECT * FROM estoque WHERE id = ?');
            $atualizado->execute([$id]);
            echo json_encode($atualizado->fetch());
        }
        break;

    case 'PATCH':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $pdo->prepare('
            UPDATE estoque
            SET nome=:nome, categoria=:cat, unidade=:un, qtd_minima=:min, custo_unit=:custo, fornecedor_id=:forn
            WHERE id=:id AND usuario_id=:uid
        ')->execute([
            'nome'  => $data['nome']          ?? null,
            'cat'   => $data['categoria']     ?? null,
            'un'    => $data['unidade']       ?? 'un',
            'min'   => (float) ($data['qtd_minima'] ?? 0),
            'custo' => (float) ($data['custo_unit']  ?? 0),
            'forn'  => $data['fornecedor_id'] ?? null,
            'id'    => $id,
            'uid'   => $uid,
        ]);
        $stmt = $pdo->prepare('
            SELECT e.*, f.nome AS fornecedor_nome,
                CASE WHEN e.qtd_atual <= e.qtd_minima THEN 1 ELSE 0 END AS estoque_baixo
            FROM estoque e LEFT JOIN fornecedores f ON f.id = e.fornecedor_id
            WHERE e.id = ?
        ');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $pdo->prepare('DELETE FROM estoque_movimentos WHERE estoque_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM estoque WHERE id = ? AND usuario_id = ?')->execute([$id, $uid]);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
