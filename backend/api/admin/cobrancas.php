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

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

switch ($method) {

    case 'GET':
        $stmt = $pdo->query('
            SELECT c.*, ac.empresa, ac.contato, ac.plano, ac.recorrencia AS valor_plano
            FROM admin_cobrancas c
            JOIN admin_clientes ac ON ac.id = c.admin_cliente_id
            ORDER BY c.mes_ref DESC, ac.empresa ASC
        ');
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $acao = $data['acao'] ?? 'gerar';

        if ($acao === 'gerar_mes') {
            // Gera cobranças do mês para todos os clientes ativos
            $mesRef = $data['mes_ref'] ?? date('Y-m');
            $clientes = $pdo->query("SELECT id, recorrencia FROM admin_clientes WHERE status = 'ativo'")->fetchAll();
            $gerados = 0;
            foreach ($clientes as $cli) {
                try {
                    $pdo->prepare('INSERT INTO admin_cobrancas (admin_cliente_id, mes_ref, valor) VALUES (?, ?, ?)')
                        ->execute([$cli['id'], $mesRef, $cli['recorrencia']]);
                    $gerados++;
                } catch (Exception $e) {
                    // Já existe cobrança para esse mês, ignora
                }
            }
            echo json_encode(['ok' => true, 'gerados' => $gerados, 'mes_ref' => $mesRef]);
        } else {
            // Gera cobrança individual
            if (empty($data['admin_cliente_id']) || empty($data['mes_ref'])) {
                http_response_code(400);
                echo json_encode(['error' => 'admin_cliente_id e mes_ref são obrigatórios']);
                exit;
            }
            $pdo->prepare('INSERT INTO admin_cobrancas (admin_cliente_id, mes_ref, valor) VALUES (?, ?, ?)')
                ->execute([$data['admin_cliente_id'], $data['mes_ref'], (float)($data['valor'] ?? 0)]);
            $novo = $pdo->prepare('SELECT * FROM admin_cobrancas WHERE id = ?');
            $novo->execute([$pdo->lastInsertId()]);
            http_response_code(201);
            echo json_encode($novo->fetch());
        }
        break;

    case 'PATCH':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $data = json_decode(file_get_contents('php://input'), true);

        // Se veio valor, atualiza o valor cobrado
        if (isset($data['valor'])) {
            $pdo->prepare('UPDATE admin_cobrancas SET valor=? WHERE id=?')
                ->execute([(float)$data['valor'], $id]);
        }

        // Se veio status, atualiza status e data de pagamento
        if (isset($data['status'])) {
            $status  = $data['status'];
            $dataPgto = $status === 'pago' ? date('Y-m-d') : null;
            $pdo->prepare('UPDATE admin_cobrancas SET status=?, data_pagamento=? WHERE id=?')
                ->execute([$status, $dataPgto, $id]);
        }

        $stmt = $pdo->prepare('
            SELECT c.*, ac.empresa, ac.contato, ac.plano, ac.recorrencia AS valor_plano
            FROM admin_cobrancas c
            JOIN admin_clientes ac ON ac.id = c.admin_cliente_id
            WHERE c.id = ?
        ');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $pdo->prepare('DELETE FROM admin_cobrancas WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
