<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;
$user   = getCurrentUser();

switch ($method) {

    case 'GET':
        $filter = tenantFilter();
        $stmt = $pdo->query("SELECT *, DATE_FORMAT(vencimento, '%d/%m/%Y') AS vencimento_fmt FROM contas_pagar WHERE {$filter} ORDER BY vencimento ASC");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['vencimento'] = $r['vencimento_fmt'];
            unset($r['vencimento_fmt']);
            $r['valor'] = (float) $r['valor'];
        }
        echo json_encode($rows);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['fornecedor']) || empty($data['valor']) || empty($data['vencimento'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Fornecedor, valor e vencimento são obrigatórios']);
            exit;
        }

        $stmt = $pdo->prepare('
            INSERT INTO contas_pagar (usuario_id, fornecedor, descricao, valor, vencimento, status)
            VALUES (:uid, :fornecedor, :descricao, :valor, :vencimento, "pendente")
        ');
        $stmt->execute([
            'uid'        => $user['id'],
            'fornecedor' => $data['fornecedor'],
            'descricao'  => $data['descricao'] ?? null,
            'valor'      => (float) $data['valor'],
            'vencimento' => $data['vencimento'],
        ]);

        $newId = $pdo->lastInsertId();
        $novo  = $pdo->prepare('SELECT *, DATE_FORMAT(vencimento, "%d/%m/%Y") AS vencimento FROM contas_pagar WHERE id = ?');
        $novo->execute([$newId]);

        http_response_code(201);
        echo json_encode($novo->fetch());
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        assertOwnership($pdo, 'contas_pagar', $id);
        $pdo->prepare('DELETE FROM contas_pagar WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    // Editar conta: PATCH /contas-pagar/index.php?id=1
    case 'PATCH':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        assertOwnership($pdo, 'contas_pagar', $id);
        $data = json_decode(file_get_contents('php://input'), true);

        $pdo->prepare('UPDATE contas_pagar SET fornecedor=:fornecedor, descricao=:descricao, valor=:valor, vencimento=:vencimento WHERE id=:id')
            ->execute(['fornecedor' => $data['fornecedor'], 'descricao' => $data['descricao'] ?? null, 'valor' => (float)$data['valor'], 'vencimento' => $data['vencimento'], 'id' => $id]);

        $stmt = $pdo->prepare('SELECT *, DATE_FORMAT(vencimento, "%d/%m/%Y") AS vencimento FROM contas_pagar WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        $row['valor'] = (float) $row['valor'];
        echo json_encode($row);
        break;

    // Marcar como pago: PUT /contas-pagar/index.php?id=1
    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        assertOwnership($pdo, 'contas_pagar', $id);
        $pdo->prepare('UPDATE contas_pagar SET status = "pago" WHERE id = ?')->execute([$id]);

        $stmt = $pdo->prepare('SELECT *, DATE_FORMAT(vencimento, "%d/%m/%Y") AS vencimento FROM contas_pagar WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
