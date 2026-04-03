<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// usuario_id vindo do header ou query (simplificado — em produção usar JWT)
$uid = (int) ($_GET['usuario_id'] ?? $_SERVER['HTTP_X_USER_ID'] ?? 0);

if (!$uid) {
    http_response_code(401);
    echo json_encode(['error' => 'usuario_id obrigatório']);
    exit;
}

switch ($method) {

    // Listar notificações do usuário
    case 'GET':
        $apenasNaoLidas = isset($_GET['nao_lidas']);
        $sql  = 'SELECT * FROM notificacoes WHERE usuario_id = ?';
        $params = [$uid];
        if ($apenasNaoLidas) { $sql .= ' AND lida = 0'; }
        $sql .= ' ORDER BY criado_em DESC LIMIT 50';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Contagem de não lidas
        $countStmt = $pdo->prepare('SELECT COUNT(*) FROM notificacoes WHERE usuario_id = ? AND lida = 0');
        $countStmt->execute([$uid]);

        echo json_encode([
            'notificacoes' => $rows,
            'nao_lidas'    => (int) $countStmt->fetchColumn(),
        ]);
        break;

    // Marcar como lida: PUT ?id=X  ou PUT ?all=1
    case 'PUT':
        if (isset($_GET['all'])) {
            $pdo->prepare('UPDATE notificacoes SET lida = 1 WHERE usuario_id = ?')->execute([$uid]);
            echo json_encode(['ok' => true, 'mensagem' => 'Todas marcadas como lidas']);
        } elseif (isset($_GET['id'])) {
            $id = (int) $_GET['id'];
            $pdo->prepare('UPDATE notificacoes SET lida = 1 WHERE id = ? AND usuario_id = ?')->execute([$id, $uid]);
            echo json_encode(['ok' => true]);
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Informe id ou all=1']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
