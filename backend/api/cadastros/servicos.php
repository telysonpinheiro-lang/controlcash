<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        $stmt = $pdo->query('SELECT * FROM servicos ORDER BY nome');
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['nome'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nome é obrigatório']);
            exit;
        }

        $vp     = (float) ($data['valor_padrao'] ?? 0);
        $cm     = (float) ($data['custo_min']    ?? 0);
        $margem = $vp > 0 ? (int) round((($vp - $cm) / $vp) * 100) : 0;

        $stmt = $pdo->prepare('INSERT INTO servicos (nome, valor_padrao, custo_min, margem) VALUES (:nome, :vp, :cm, :margem)');
        $stmt->execute(['nome' => $data['nome'], 'vp' => $vp, 'cm' => $cm, 'margem' => $margem]);

        $id   = $pdo->lastInsertId();
        $novo = $pdo->prepare('SELECT * FROM servicos WHERE id = ?');
        $novo->execute([$id]);

        http_response_code(201);
        echo json_encode($novo->fetch());
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        // Cascade: busca nome do serviço e remove vendas/contratos/contas vinculadas
        $s = $pdo->prepare('SELECT nome FROM servicos WHERE id = ?');
        $s->execute([$id]);
        $srv = $s->fetch();
        if ($srv) {
            $pdo->prepare('DELETE FROM contas_receber WHERE referente = ?')->execute([$srv['nome']]);
            $pdo->prepare('DELETE FROM contratos WHERE servico = ?')->execute([$srv['nome']]);
            $pdo->prepare('DELETE FROM vendas WHERE servico = ?')->execute([$srv['nome']]);
        }
        $pdo->prepare('DELETE FROM servicos WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    case 'PATCH':
        $id   = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $data = json_decode(file_get_contents('php://input'), true);

        $vp     = (float) ($data['valor_padrao'] ?? 0);
        $cm     = (float) ($data['custo_min']    ?? 0);
        $margem = $vp > 0 ? (int) round((($vp - $cm) / $vp) * 100) : 0;

        $pdo->prepare('UPDATE servicos SET nome=:nome, valor_padrao=:vp, custo_min=:cm, margem=:margem WHERE id=:id')
            ->execute(['nome' => $data['nome'], 'vp' => $vp, 'cm' => $cm, 'margem' => $margem, 'id' => $id]);

        $stmt = $pdo->prepare('SELECT * FROM servicos WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        $row['valor_padrao'] = (float) $row['valor_padrao'];
        $row['custo_min']    = (float) $row['custo_min'];
        $row['margem']       = (int)   $row['margem'];
        echo json_encode($row);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
