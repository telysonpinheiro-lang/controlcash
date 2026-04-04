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
        // Primeiro: atualiza status para "vencido" em contas pendentes com vencimento passado
        $pdo->exec("
            UPDATE contas_receber
            SET status = 'vencido',
                dias_atraso = DATEDIFF(CURDATE(), vencimento)
            WHERE status = 'pendente'
              AND vencimento < CURDATE()
        ");

        // Atualiza dias_atraso das já vencidas
        $pdo->exec("
            UPDATE contas_receber
            SET dias_atraso = DATEDIFF(CURDATE(), vencimento)
            WHERE status = 'vencido'
        ");

        $stmt = $pdo->query('
            SELECT cr.*,
                   COALESCE(cl.telefone, cl2.telefone) AS telefone,
                   DATE_FORMAT(cr.vencimento, "%d/%m/%Y") AS vencimento_fmt
            FROM contas_receber cr
            LEFT JOIN clientes cl  ON cr.cliente_id = cl.id
            LEFT JOIN clientes cl2 ON TRIM(cl2.nome) = TRIM(cr.cliente_nome) AND cr.cliente_id IS NULL
            ORDER BY cr.vencimento ASC
        ');
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['vencimento'] = $r['vencimento_fmt'];
            unset($r['vencimento_fmt']);
        }
        echo json_encode($rows);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['cliente_nome']) || empty($data['valor']) || empty($data['vencimento'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Cliente, valor e vencimento são obrigatórios']);
            exit;
        }

        $nome     = $data['cliente_nome'];
        $initials = mb_strtoupper(
            implode('', array_map(fn($p) => mb_substr($p, 0, 1), explode(' ', $nome)))
        );

        // Se o vencimento já passou, já cria como "vencido"
        $venc       = $data['vencimento'];
        $jaVenceu   = strtotime($venc) < strtotime('today');
        $statusInit = $jaVenceu ? 'vencido' : 'pendente';
        $diasAtraso = $jaVenceu ? (int) floor((time() - strtotime($venc)) / 86400) : 0;

        $stmt = $pdo->prepare('
            INSERT INTO contas_receber (usuario_id, cliente_id, cliente_nome, initials, referente, valor, valor_material, vencimento, tipo, status, dias_atraso)
            VALUES (:uid, :cliente_id, :cliente_nome, :initials, :referente, :valor, :valor_material, :vencimento, :tipo, :status, :dias_atraso)
        ');
        $stmt->execute([
            'uid'            => $user['id'],
            'cliente_id'     => $data['cliente_id']     ?? null,
            'cliente_nome'   => $nome,
            'initials'       => mb_substr($initials, 0, 2),
            'referente'      => $data['referente']       ?? null,
            'valor'          => (float) $data['valor'],
            'valor_material' => (float) ($data['valor_material'] ?? 0),
            'vencimento'     => $venc,
            'tipo'           => $data['tipo']            ?? 'À vista',
            'status'         => $statusInit,
            'dias_atraso'    => $diasAtraso,
        ]);

        $newId = $pdo->lastInsertId();
        $novo  = $pdo->prepare('SELECT *, DATE_FORMAT(vencimento, "%d/%m/%Y") AS vencimento FROM contas_receber WHERE id = ?');
        $novo->execute([$newId]);

        http_response_code(201);
        echo json_encode($novo->fetch());
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        assertOwnership($pdo, 'contas_receber', $id);
        $pdo->prepare('DELETE FROM contas_receber WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    // Editar conta: PATCH /contas-receber/index.php?id=1
    case 'PATCH':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        assertOwnership($pdo, 'contas_receber', $id);
        $data = json_decode(file_get_contents('php://input'), true);

        $nome     = $data['cliente_nome'] ?? null;
        $initials = $nome ? mb_strtoupper(mb_substr(implode('', array_map(fn($p) => mb_substr($p, 0, 1), explode(' ', $nome))), 0, 2)) : null;

        // Se veio só arquivado, atualiza só isso
        if (isset($data['arquivado']) && count($data) === 1) {
            $pdo->prepare('UPDATE contas_receber SET arquivado=? WHERE id=?')
                ->execute([(int)$data['arquivado'], $id]);
        } else {
            $pdo->prepare('UPDATE contas_receber SET cliente_nome=COALESCE(:nome,cliente_nome), initials=COALESCE(:initials,initials), referente=:referente, valor=:valor, vencimento=:vencimento, tipo=:tipo, arquivado=:arq WHERE id=:id')
                ->execute(['nome' => $nome, 'initials' => $initials, 'referente' => $data['referente'] ?? null, 'valor' => (float)$data['valor'], 'vencimento' => $data['vencimento'], 'tipo' => $data['tipo'] ?? 'À vista', 'arq' => (int)($data['arquivado'] ?? 0), 'id' => $id]);
        }

        $stmt = $pdo->prepare('SELECT *, DATE_FORMAT(vencimento, "%d/%m/%Y") AS vencimento FROM contas_receber WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    // Confirmar recebimento: PUT /contas-receber/index.php?id=1
    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }

        $pdo->prepare('UPDATE contas_receber SET status = "pago" WHERE id = ?')->execute([$id]);

        $stmt = $pdo->prepare('SELECT *, DATE_FORMAT(vencimento, "%d/%m/%Y") AS vencimento FROM contas_receber WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
