<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        $stmt = $pdo->query('SELECT * FROM contratos ORDER BY criado_em DESC');
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['valor']        = (float) $r['valor'];
            $r['valor_parcela'] = (float) $r['valor_parcela'];
            $r['parcelas']     = (int)   $r['parcelas'];
        }
        echo json_encode($rows);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['cliente']) || empty($data['servico'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Cliente e serviço são obrigatórios']);
            exit;
        }

        $valor         = (float) ($data['valor'] ?? 0);
        $parcelas      = (int)   ($data['parcelas'] ?? 1);
        $valor_parcela = $parcelas > 0 ? round($valor / $parcelas, 2) : $valor;

        $stmt = $pdo->prepare('
            INSERT INTO contratos (cliente_id, cliente, cpf, endereco, servico, descricao_servico, valor, parcelas, valor_parcela, prazo, garantia, status)
            VALUES (:cliente_id, :cliente, :cpf, :endereco, :servico, :descricao_servico, :valor, :parcelas, :valor_parcela, :prazo, :garantia, "aguardando")
        ');
        $stmt->execute([
            'cliente_id'        => $data['cliente_id']        ?? null,
            'cliente'           => $data['cliente'],
            'cpf'               => $data['cpf']               ?? null,
            'endereco'          => $data['endereco']          ?? null,
            'servico'           => $data['servico'],
            'descricao_servico' => $data['descricao_servico'] ?? $data['servico'],
            'valor'             => $valor,
            'parcelas'          => $parcelas,
            'valor_parcela'     => $valor_parcela,
            'prazo'             => $data['prazo']             ?? null,
            'garantia'          => $data['garantia']          ?? null,
        ]);

        $id   = $pdo->lastInsertId();
        $novo = $pdo->prepare('SELECT * FROM contratos WHERE id = ?');
        $novo->execute([$id]);

        http_response_code(201);
        echo json_encode($novo->fetch());
        break;

    case 'DELETE':
        if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $pdo->prepare('DELETE FROM contratos WHERE id = ?')->execute([(int) $_GET['id']]);
        echo json_encode(['ok' => true]);
        break;

    // Editar contrato: PATCH /contratos/index.php?id=1
    case 'PATCH':
        if (!isset($_GET['id'])) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $id   = (int) $_GET['id'];
        $data = json_decode(file_get_contents('php://input'), true);

        $valor         = (float) ($data['valor'] ?? 0);
        $parcelas      = (int)   ($data['parcelas'] ?? 1);
        $valor_parcela = $parcelas > 0 ? round($valor / $parcelas, 2) : $valor;

        $pdo->prepare('UPDATE contratos SET cliente=:cliente, servico=:servico, descricao_servico=:descricao_servico, valor=:valor, parcelas=:parcelas, valor_parcela=:valor_parcela, prazo=:prazo, garantia=:garantia WHERE id=:id')
            ->execute(['cliente' => $data['cliente'], 'servico' => $data['servico'], 'descricao_servico' => $data['descricao_servico'] ?? $data['servico'], 'valor' => $valor, 'parcelas' => $parcelas, 'valor_parcela' => $valor_parcela, 'prazo' => $data['prazo'] ?? null, 'garantia' => $data['garantia'] ?? null, 'id' => $id]);

        $stmt = $pdo->prepare('SELECT * FROM contratos WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        $row['valor']         = (float) $row['valor'];
        $row['valor_parcela'] = (float) $row['valor_parcela'];
        $row['parcelas']      = (int)   $row['parcelas'];
        echo json_encode($row);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
