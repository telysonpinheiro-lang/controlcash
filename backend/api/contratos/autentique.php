<?php
/**
 * Integração com Autentique — Assinatura Eletrônica de Contratos
 * API GraphQL: https://api.autentique.com.br/v2/graphql
 * Docs: https://docs.autentique.com.br/api
 *
 * Configuração (.env.backend):
 *   AUTENTIQUE_TOKEN=seu_token_aqui
 *   AUTENTIQUE_SANDBOX=true  (para testes, não consome créditos)
 */

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

$pdo    = getConnection();
$user   = getCurrentUser();
$method = $_SERVER['REQUEST_METHOD'];

// Carrega token da Autentique
$envFile = __DIR__ . '/../../../.env.backend';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v);
    }
}

$AUTENTIQUE_TOKEN   = $_ENV['AUTENTIQUE_TOKEN']   ?? '';
$AUTENTIQUE_SANDBOX = ($_ENV['AUTENTIQUE_SANDBOX'] ?? 'true') === 'true';
$AUTENTIQUE_URL     = 'https://api.autentique.com.br/v2/graphql';

if (empty($AUTENTIQUE_TOKEN)) {
    http_response_code(400);
    echo json_encode(['error' => 'Token da Autentique não configurado. Adicione AUTENTIQUE_TOKEN no .env.backend']);
    exit;
}

/**
 * Executa uma query/mutation GraphQL na Autentique
 */
function autentiqueRequest(string $query, array $variables = [], ?string $filePath = null): array {
    global $AUTENTIQUE_TOKEN, $AUTENTIQUE_URL;

    $headers = [
        "Authorization: Bearer {$AUTENTIQUE_TOKEN}",
    ];

    if ($filePath && file_exists($filePath)) {
        // Multipart form-data para upload de arquivo
        $boundary = uniqid('----', true);
        $headers[] = "Content-Type: multipart/form-data; boundary={$boundary}";

        $operations = json_encode([
            'query'     => $query,
            'variables' => array_merge($variables, ['file' => null]),
        ]);

        $map = json_encode(['file' => ['variables.file']]);

        $body  = "--{$boundary}\r\n";
        $body .= "Content-Disposition: form-data; name=\"operations\"\r\n\r\n";
        $body .= $operations . "\r\n";
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Disposition: form-data; name=\"map\"\r\n\r\n";
        $body .= $map . "\r\n";
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Disposition: form-data; name=\"file\"; filename=\"contrato.pdf\"\r\n";
        $body .= "Content-Type: application/pdf\r\n\r\n";
        $body .= file_get_contents($filePath) . "\r\n";
        $body .= "--{$boundary}--\r\n";
    } else {
        // JSON simples (queries sem upload)
        $headers[] = 'Content-Type: application/json';
        $body = json_encode([
            'query'     => $query,
            'variables' => $variables,
        ]);
    }

    $ch = curl_init($AUTENTIQUE_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err      = curl_error($ch);
    curl_close($ch);

    if ($err) {
        return ['error' => "Erro de conexão: {$err}"];
    }

    $json = json_decode($response, true);
    if (isset($json['errors'])) {
        return ['error' => $json['errors'][0]['message'] ?? 'Erro na API Autentique'];
    }

    return $json['data'] ?? $json;
}

// ── Ação baseada no parâmetro "acao" ─────────────────────
$data = json_decode(file_get_contents('php://input'), true) ?? [];
$acao = $data['acao'] ?? $_GET['acao'] ?? '';

switch ($acao) {

    // ── Criar documento e enviar para assinatura ─────────
    case 'criar':
        $contratoId = (int) ($data['contrato_id'] ?? 0);
        if (!$contratoId) {
            http_response_code(400);
            echo json_encode(['error' => 'contrato_id é obrigatório']);
            exit;
        }

        // Busca contrato no banco
        $stmt = $pdo->prepare('SELECT c.*, cl.email, cl.telefone FROM contratos c LEFT JOIN clientes cl ON cl.nome = c.cliente WHERE c.id = ?');
        $stmt->execute([$contratoId]);
        $contrato = $stmt->fetch();

        if (!$contrato) {
            http_response_code(404);
            echo json_encode(['error' => 'Contrato não encontrado']);
            exit;
        }

        // Nome do signatário e email
        $signerName  = $contrato['cliente'];
        $signerEmail = $contrato['email'] ?? $data['email'] ?? '';

        if (empty($signerEmail)) {
            http_response_code(400);
            echo json_encode(['error' => 'E-mail do cliente é obrigatório para enviar à Autentique']);
            exit;
        }

        // Monta o texto do contrato
        $textoContrato = "CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\n"
            . "CONTRATANTE: {$contrato['cliente']}"
            . ($contrato['cpf'] ? ", CPF {$contrato['cpf']}" : '')
            . ($contrato['endereco'] ? ", residente em {$contrato['endereco']}" : '')
            . ".\n\n"
            . "OBJETO: {$contrato['descricao_servico']}\n\n"
            . "VALOR: R$ " . number_format($contrato['valor'], 2, ',', '.')
            . ($contrato['parcelas'] > 1 ? ", em {$contrato['parcelas']} parcelas" : '')
            . ".\n\n"
            . ($contrato['prazo'] ? "PRAZO: {$contrato['prazo']}.\n\n" : '')
            . ($contrato['garantia'] ? "GARANTIA: {$contrato['garantia']}.\n\n" : '')
            . "Ambas as partes concordam com os termos acima mediante aceite eletrônico.\n";

        // Cria PDF temporário
        $tmpFile = tempnam(sys_get_temp_dir(), 'contrato_') . '.pdf';

        // PDF simples com texto — se jsPDF não disponível no backend, usa texto puro
        // A Autentique aceita .pdf, .doc, .docx
        // Cria um PDF mínimo válido
        $pdfContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            . "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            . "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n"
            . "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
            . "5 0 obj<</Length " . strlen($textoContrato) . ">>\nstream\nBT /F1 11 Tf 50 750 Td (" . addcslashes($textoContrato, '()\\') . ") Tj ET\nendstream\nendobj\n"
            . "xref\n0 6\n0000000000 65535 f \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF";

        file_put_contents($tmpFile, $pdfContent);

        // Mutation GraphQL para criar documento
        $mutation = '
            mutation CreateDocumentMutation(
                $document: DocumentInput!,
                $signers: [SignerInput!]!,
                $file: Upload!
            ) {
                createDocument(
                    document: $document,
                    signers: $signers,
                    file: $file
                ) {
                    id
                    name
                    created_at
                    signatures {
                        public_id
                        name
                        email
                        action { name }
                        link { short_link }
                    }
                }
            }
        ';

        $variables = [
            'document' => [
                'name' => "Contrato - {$contrato['cliente']} - {$contrato['servico']}",
            ],
            'signers' => [
                [
                    'email'  => $signerEmail,
                    'action' => 'SIGN',
                    'name'   => $signerName,
                ],
            ],
        ];

        // Adiciona sandbox para testes
        if ($AUTENTIQUE_SANDBOX) {
            $variables['document']['sandbox'] = true;
        }

        $result = autentiqueRequest($mutation, $variables, $tmpFile);
        unlink($tmpFile);

        if (isset($result['error'])) {
            http_response_code(502);
            echo json_encode(['error' => $result['error']]);
            exit;
        }

        $doc = $result['createDocument'] ?? null;
        if (!$doc) {
            http_response_code(502);
            echo json_encode(['error' => 'Resposta inesperada da Autentique', 'raw' => $result]);
            exit;
        }

        // Salva ID da Autentique no contrato
        $signLink = $doc['signatures'][0]['link']['short_link'] ?? null;
        $pdo->prepare('
            UPDATE contratos SET
                autentique_id = ?,
                autentique_link = ?,
                status = "aguardando"
            WHERE id = ?
        ')->execute([
            $doc['id'],
            $signLink,
            $contratoId,
        ]);

        echo json_encode([
            'ok'              => true,
            'autentique_id'   => $doc['id'],
            'autentique_link' => $signLink,
            'documento'       => $doc,
        ]);
        break;

    // ── Consultar status de assinatura ────────────────────
    case 'status':
        $contratoId = (int) ($data['contrato_id'] ?? $_GET['contrato_id'] ?? 0);
        if (!$contratoId) {
            http_response_code(400);
            echo json_encode(['error' => 'contrato_id é obrigatório']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT autentique_id FROM contratos WHERE id = ?');
        $stmt->execute([$contratoId]);
        $autId = $stmt->fetchColumn();

        if (!$autId) {
            echo json_encode(['error' => 'Contrato não enviado para Autentique']);
            exit;
        }

        $query = '
            query {
                document(id: "' . $autId . '") {
                    id
                    name
                    created_at
                    signatures {
                        public_id
                        name
                        email
                        signed { created_at }
                        rejected { created_at }
                        action { name }
                        link { short_link }
                    }
                }
            }
        ';

        $result = autentiqueRequest($query);

        if (isset($result['error'])) {
            http_response_code(502);
            echo json_encode(['error' => $result['error']]);
            exit;
        }

        $doc = $result['document'] ?? null;
        if (!$doc) {
            echo json_encode(['error' => 'Documento não encontrado na Autentique']);
            exit;
        }

        // Verifica se foi assinado
        $assinado = false;
        foreach ($doc['signatures'] ?? [] as $sig) {
            if (!empty($sig['signed'])) {
                $assinado = true;
                // Atualiza status no banco
                $pdo->prepare('
                    UPDATE contratos SET status = "aceito", aceite_data = ? WHERE id = ?
                ')->execute([
                    $sig['signed']['created_at'],
                    $contratoId,
                ]);
            }
            if (!empty($sig['rejected'])) {
                $pdo->prepare('
                    UPDATE contratos SET status = "cancelado" WHERE id = ?
                ')->execute([$contratoId]);
            }
        }

        echo json_encode([
            'ok'       => true,
            'assinado' => $assinado,
            'documento'=> $doc,
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Ação inválida. Use: criar, status']);
}
