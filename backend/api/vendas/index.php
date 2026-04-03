<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$user   = getCurrentUser();

switch ($method) {

    // Listar vendas do tenant atual
    case 'GET':
        $filter = tenantFilter('v');
        $stmt   = $pdo->query("
            SELECT v.*, cl.telefone
            FROM vendas v
            LEFT JOIN clientes cl ON v.cliente_id = cl.id
            WHERE {$filter}
            ORDER BY v.criado_em DESC
        ");
        echo json_encode($stmt->fetchAll());
        break;

    // Criar nova venda
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        $required = ['cliente_nome', 'servico', 'valor'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                http_response_code(400);
                echo json_encode(['error' => "Campo '$field' é obrigatório"]);
                exit;
            }
        }

        $nome     = $data['cliente_nome'];
        $initials = mb_strtoupper(
            implode('', array_map(fn($p) => mb_substr($p, 0, 1), explode(' ', $nome)))
        );
        $initials = mb_substr($initials, 0, 2);

        $stmt = $pdo->prepare('
            INSERT INTO vendas (usuario_id, cliente_id, cliente_nome, initials, servico, valor, material, pagamento, prazo, prazo_pagamento, status, kanban_status, data_envio)
            VALUES (:usuario_id, :cliente_id, :cliente_nome, :initials, :servico, :valor, :material, :pagamento, :prazo, :prazo_pgto, :status, :kanban_status, :data_envio)
        ');
        $stmt->execute([
            'cliente_id'    => $data['cliente_id']       ?? null,
            'usuario_id'    => $user['id'],
            'cliente_nome'  => $nome,
            'initials'      => $initials,
            'servico'       => $data['servico'],
            'valor'         => (float) $data['valor'],
            'material'      => isset($data['material']) ? (float) $data['material'] : null,
            'pagamento'     => $data['pagamento']        ?? 'À vista',
            'prazo'         => $data['prazo']            ?? null,
            'prazo_pgto'    => $data['prazo_pagamento']  ?? null,
            'status'        => $data['status']           ?? 'orcamento',
            'kanban_status' => $data['kanban_status']    ?? 'orcamento',
            'data_envio'    => $data['data_envio']       ?? null,
        ]);

        $id   = $pdo->lastInsertId();
        $novo = $pdo->prepare('SELECT * FROM vendas WHERE id = ?');
        $novo->execute([$id]);

        http_response_code(201);
        echo json_encode($novo->fetch());
        break;

    case 'PATCH':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        assertOwnership($pdo, 'vendas', $id);
        $data = json_decode(file_get_contents('php://input'), true);

        $nome     = $data['cliente_nome'] ?? null;
        $initials = $nome ? mb_strtoupper(mb_substr(implode('', array_map(fn($p) => mb_substr($p, 0, 1), explode(' ', $nome))), 0, 2)) : null;

        $pdo->prepare('
            UPDATE vendas
            SET cliente_nome=COALESCE(:nome,cliente_nome), initials=COALESCE(:initials,initials),
                servico=:servico, valor=:valor, material=:material,
                pagamento=:pagamento, prazo=:prazo, prazo_pagamento=:prazo_pgto,
                status=:status, kanban_status=:kanban, arquivado=:arquivado
            WHERE id=:id
        ')->execute([
            'nome'      => $nome,
            'initials'  => $initials,
            'servico'   => $data['servico']          ?? null,
            'valor'     => (float) ($data['valor']   ?? 0),
            'material'  => isset($data['material']) ? (float) $data['material'] : null,
            'pagamento' => $data['pagamento']        ?? 'À vista',
            'prazo'     => $data['prazo']            ?? null,
            'prazo_pgto'=> $data['prazo_pagamento']  ?? null,
            'status'    => $data['status']           ?? 'orcamento',
            'kanban'    => $data['kanban_status']    ?? $data['status'] ?? 'orcamento',
            'arquivado' => (int) ($data['arquivado'] ?? 0),
            'id'        => $id,
        ]);

        $stmt = $pdo->prepare('SELECT v.*, cl.telefone FROM vendas v LEFT JOIN clientes cl ON v.cliente_id = cl.id WHERE v.id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        assertOwnership($pdo, 'vendas', $id);
        // Cascade: remove conta a receber vinculada (mesmo cliente + serviço)
        $v = $pdo->prepare('SELECT cliente_nome, servico FROM vendas WHERE id = ?');
        $v->execute([$id]);
        $venda = $v->fetch();
        if ($venda) {
            $pdo->prepare('DELETE FROM contas_receber WHERE cliente_nome = ? AND referente = ?')
                ->execute([$venda['cliente_nome'], $venda['servico']]);
        }
        $pdo->prepare('DELETE FROM vendas WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
