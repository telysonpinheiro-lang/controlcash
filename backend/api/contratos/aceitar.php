<?php
/**
 * Endpoint público de aceite eletrônico
 * GET  ?token=XXX  — exibe dados do contrato para o cliente confirmar
 * POST ?token=XXX  — registra aceite com IP + timestamp + hash SHA-256
 *
 * URL que o cliente recebe via WhatsApp:
 *   http://localhost/virtualcore-react/backend/api/contratos/aceitar.php?token=XXX
 */

require_once __DIR__ . '/../../config/database.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$pdo   = getConnection();
$token = trim($_GET['token'] ?? '');

if (!$token) {
    http_response_code(400);
    echo json_encode(['error' => 'Token inválido']);
    exit;
}

$stmt = $pdo->prepare('SELECT * FROM contratos WHERE token_aceite = ?');
$stmt->execute([$token]);
$contrato = $stmt->fetch();

if (!$contrato) {
    http_response_code(404);
    echo json_encode(['error' => 'Contrato não encontrado ou token expirado']);
    exit;
}

if ($contrato['status'] === 'aceito') {
    echo json_encode([
        'ok'           => true,
        'ja_aceito'    => true,
        'aceite_data'  => $contrato['aceite_data'],
        'aceite_ip'    => $contrato['aceite_ip'],
        'mensagem'     => 'Este contrato já foi aceito em ' . $contrato['aceite_data'],
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Retorna dados para exibição (frontend do cliente)
    echo json_encode([
        'ok'       => true,
        'contrato' => [
            'cliente'           => $contrato['cliente'],
            'servico'           => $contrato['servico'],
            'descricao_servico' => $contrato['descricao_servico'],
            'valor'             => $contrato['valor'],
            'parcelas'          => $contrato['parcelas'],
            'valor_parcela'     => $contrato['valor_parcela'],
            'prazo'             => $contrato['prazo'],
            'garantia'          => $contrato['garantia'],
            'status'            => $contrato['status'],
        ],
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Registra aceite
    $ip   = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $data = date('Y-m-d H:i:s');

    // Hash do aceite: SHA-256(id + token + ip + data)
    $hash = hash('sha256', $contrato['id'] . $token . $ip . $data);

    $pdo->prepare("
        UPDATE contratos
        SET status = 'aceito', aceite_ip = ?, aceite_data = ?, aceite_hash = ?, token_aceite = NULL
        WHERE id = ?
    ")->execute([$ip, $data, $hash, $contrato['id']]);

    echo json_encode([
        'ok'          => true,
        'mensagem'    => 'Contrato aceito com sucesso!',
        'aceite_hash' => $hash,
        'aceite_ip'   => $ip,
        'aceite_data' => $data,
        'aviso_legal' => 'Este aceite eletrônico registra seu IP e data/hora, sendo válido para disputas conforme Art. 10 da MP 2.200-2/2001. Para validade jurídica plena via ICP-Brasil, solicite assinatura digital certificada.',
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método não permitido']);
