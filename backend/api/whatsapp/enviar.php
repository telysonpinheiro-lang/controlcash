<?php
/**
 * Endpoint de disparo de WhatsApp on-demand (chamado pelo frontend React).
 *
 * Configuração (.env ou variáveis de ambiente do servidor):
 *   WA_API_URL      → URL base da Evolution API  ex: http://localhost:8080
 *   WA_API_TOKEN    → apikey da instância         ex: minhachave123
 *   WA_INSTANCE     → nome da instância           ex: virtualcore
 *
 * Sem essas variáveis, retorna ok=false com instruções de setup.
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$telefone = preg_replace('/\D/', '', $data['telefone'] ?? '');
$mensagem = trim($data['mensagem'] ?? '');

if (!$mensagem) {
    http_response_code(400);
    echo json_encode(['error' => 'mensagem é obrigatória']);
    exit;
}

// Tenta ler config do .env ou variáveis de ambiente
$envFile = __DIR__ . '/../../../.env.backend';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        putenv(trim($k) . '=' . trim($v));
    }
}

$apiUrl   = getenv('WA_API_URL')   ?: '';
$apiToken = getenv('WA_API_TOKEN') ?: '';
$instance = getenv('WA_INSTANCE')  ?: 'virtualcore';

// Sem configuração: retorna instruções de setup
if (empty($apiUrl)) {
    echo json_encode([
        'ok'      => false,
        'modo'    => 'simulado',
        'mensagem'=> "WhatsApp não configurado. Crie o arquivo backend/.env.backend com WA_API_URL, WA_API_TOKEN e WA_INSTANCE (Evolution API).",
        'payload' => ['para' => $telefone, 'texto' => $mensagem],
    ]);
    exit;
}

// Valida telefone
if (strlen($telefone) < 10) {
    http_response_code(422);
    echo json_encode(['error' => 'Número de telefone inválido ou não cadastrado para este cliente']);
    exit;
}

$numero = '55' . $telefone;

// Monta payload Evolution API
$payload = json_encode([
    'number'       => $numero,
    'textMessage'  => ['text' => $mensagem],
]);

$ch = curl_init("{$apiUrl}/message/sendText/{$instance}");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        "apikey: {$apiToken}",
    ],
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => "Falha de conexão com a Evolution API: {$curlErr}"]);
    exit;
}

$result = json_decode($response, true);

if ($httpCode >= 200 && $httpCode < 300) {
    // Salva log no banco
    $pdo = getConnection();
    $pdo->prepare("
        INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, referencia)
        VALUES (?, 'cobranca', ?, ?, ?)
    ")->execute([
        (int) ($_SERVER['HTTP_X_USER_ID'] ?? 1),
        "WhatsApp enviado para {$telefone}",
        $mensagem,
        "whatsapp:{$numero}",
    ]);

    echo json_encode(['ok' => true, 'numero' => $numero, 'response' => $result]);
} else {
    http_response_code(502);
    echo json_encode([
        'ok'       => false,
        'error'    => 'Falha no envio via Evolution API',
        'http_code'=> $httpCode,
        'response' => $result,
    ]);
}
