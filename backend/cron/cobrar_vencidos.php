<?php
/**
 * Cron job — Atualiza status vencidos + Notificações + WhatsApp automático
 *
 * Configure no cron do servidor:
 *   Linux:   0 8 * * * php /caminho/para/backend/cron/cobrar_vencidos.php
 *   Windows: Agendador de Tarefas, diariamente às 08:00
 */

require_once __DIR__ . '/../config/database.php';

// ── Carrega .env.backend ─────────────────────────────────
$envFile = __DIR__ . '/../../.env.backend';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v);
    }
}

// ── Configuração WhatsApp (Evolution API) ────────────────
define('WHATSAPP_API_URL',   $_ENV['WA_API_URL']   ?? getenv('WA_API_URL')   ?: '');
define('WHATSAPP_API_TOKEN', $_ENV['WA_API_TOKEN']  ?? getenv('WA_API_TOKEN') ?: '');
define('WHATSAPP_INSTANCE',  $_ENV['WA_INSTANCE']   ?? getenv('WA_INSTANCE')  ?: 'virtualcore');
define('WHATSAPP_ENABLED',   !empty(WHATSAPP_API_URL));

$pdo  = getConnection();
$hoje = date('Y-m-d');

echo "=== Cron iniciado: " . date('d/m/Y H:i:s') . " ===\n\n";

// ── 0. Atualiza status pendente → vencido ────────────────
$updated = $pdo->exec("
    UPDATE contas_receber
    SET status = 'vencido', dias_atraso = DATEDIFF(CURDATE(), vencimento)
    WHERE status = 'pendente' AND vencimento < CURDATE()
");
echo "[AUTO] {$updated} conta(s) marcada(s) como vencida(s)\n";

// Atualiza dias_atraso das já vencidas
$pdo->exec("
    UPDATE contas_receber
    SET dias_atraso = DATEDIFF(CURDATE(), vencimento)
    WHERE status = 'vencido'
");

// ── 1. Limpa contas órfãs (venda não está mais em concluído) ─
$pdo->exec("
    DELETE cr FROM contas_receber cr
    INNER JOIN vendas v ON v.cliente_nome = cr.cliente_nome AND v.servico = cr.referente
    WHERE cr.status IN ('pendente','vencido')
      AND v.kanban_status NOT IN ('concluido','recebido')
");

// ── 2. Notificações de contas vencidas ───────────────────
// Só notifica contas vencidas cuja venda está em "concluído" (aguardando pagamento)
$stmt = $pdo->prepare("
    SELECT cr.*,
           COALESCE(cl.telefone, cl2.telefone) AS telefone,
           u.nome AS nome_usuario, u.id AS uid
    FROM contas_receber cr
    JOIN usuarios u ON u.id = cr.usuario_id
    LEFT JOIN clientes cl  ON cr.cliente_id = cl.id
    LEFT JOIN clientes cl2 ON TRIM(cl2.nome) = TRIM(cr.cliente_nome) AND cr.cliente_id IS NULL
    WHERE cr.status = 'vencido'
      AND cr.vencimento < :hoje
      AND EXISTS (
          SELECT 1 FROM vendas v
          WHERE v.cliente_nome = cr.cliente_nome
            AND v.servico = cr.referente
            AND v.kanban_status = 'concluido'
      )
      AND NOT EXISTS (
          SELECT 1 FROM notificacoes n
          WHERE n.referencia = CONCAT('conta_receber:', cr.id)
            AND n.usuario_id = cr.usuario_id
            AND DATE(n.criado_em) = :hoje2
      )
");
$stmt->execute(['hoje' => $hoje, 'hoje2' => $hoje]);
$vencidas = $stmt->fetchAll();

echo "[VENCIDAS] " . count($vencidas) . " conta(s) para notificar\n";

foreach ($vencidas as $conta) {
    $diasAtraso = (int) floor((strtotime($hoje) - strtotime($conta['vencimento'])) / 86400);
    $titulo     = "Cobrança: {$conta['cliente_nome']} — {$diasAtraso}d em atraso";
    $mensagem   = "R$ " . number_format($conta['valor'], 2, ',', '.') . " referente a \"{$conta['referente']}\" está vencido há {$diasAtraso} dia(s).";

    // Salva notificação interna
    $pdo->prepare("
        INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, referencia)
        VALUES (:uid, 'cobranca', :titulo, :mensagem, :ref)
    ")->execute([
        'uid'      => $conta['uid'],
        'titulo'   => $titulo,
        'mensagem' => $mensagem,
        'ref'      => "conta_receber:{$conta['id']}",
    ]);

    // Dispara WhatsApp (se configurado)
    if (WHATSAPP_ENABLED && !empty($conta['telefone'])) {
        enviarWhatsApp(
            $conta['telefone'],
            "Olá {$conta['cliente_nome']}! Sua conta de R$ " . number_format($conta['valor'], 2, ',', '.') . " venceu há {$diasAtraso} dia(s). Entre em contato para regularizar. — ControlCash"
        );
    }

    echo "  [OK] {$titulo}\n";
}

// ── 3. Contas a pagar vencendo em 3 dias ─────────────────
$em3dias = date('Y-m-d', strtotime('+3 days'));
$stmt    = $pdo->prepare("
    SELECT cp.*, u.id AS uid
    FROM contas_pagar cp
    JOIN usuarios u ON u.id = cp.usuario_id
    WHERE cp.status = 'pendente'
      AND cp.vencimento BETWEEN :hoje AND :em3dias
      AND NOT EXISTS (
          SELECT 1 FROM notificacoes n
          WHERE n.referencia = CONCAT('conta_pagar:', cp.id)
            AND n.usuario_id = cp.usuario_id
            AND DATE(n.criado_em) = :hoje2
      )
");
$stmt->execute(['hoje' => $hoje, 'em3dias' => $em3dias, 'hoje2' => $hoje]);
$proximas = $stmt->fetchAll();

echo "\n[A PAGAR] " . count($proximas) . " conta(s) vencendo em 3 dias\n";

foreach ($proximas as $conta) {
    $pdo->prepare("
        INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, referencia)
        VALUES (:uid, 'vencimento', :titulo, :mensagem, :ref)
    ")->execute([
        'uid'      => $conta['uid'],
        'titulo'   => "Conta vence em breve: {$conta['fornecedor']}",
        'mensagem' => "R$ " . number_format($conta['valor'], 2, ',', '.') . " — {$conta['descricao']} vence em " . date('d/m/Y', strtotime($conta['vencimento'])) . ".",
        'ref'      => "conta_pagar:{$conta['id']}",
    ]);
    echo "  [OK] Alerta: {$conta['fornecedor']}\n";
}

// ── 4. Limpeza de notificações antigas (>90 dias) ────────
$limpas = $pdo->exec("DELETE FROM notificacoes WHERE lida = 1 AND criado_em < DATE_SUB(NOW(), INTERVAL 90 DAY)");
echo "\n[LIMPEZA] {$limpas} notificação(ões) antiga(s) removida(s)\n";

// ── 5. Limpeza de login_attempts antigas (>24h) ─────────
$limpasLogin = $pdo->exec("DELETE FROM login_attempts WHERE tentativa_em < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
echo "[LIMPEZA] {$limpasLogin} tentativa(s) de login antiga(s) removida(s)\n";

echo "\n=== Cron finalizado: " . date('d/m/Y H:i:s') . " ===\n";

// ── Helper WhatsApp ──────────────────────────────────────
function enviarWhatsApp(string $telefone, string $mensagem): void {
    $numero = preg_replace('/\D/', '', $telefone);
    if (strlen($numero) < 10) return;

    // Adiciona 55 apenas se necessário
    if (strlen($numero) <= 11) $numero = '55' . $numero;

    $payload = json_encode([
        'number'      => $numero,
        'textMessage' => ['text' => $mensagem],
    ]);

    $ch = curl_init(WHATSAPP_API_URL . '/message/sendText/' . WHATSAPP_INSTANCE);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'apikey: ' . WHATSAPP_API_TOKEN,
        ],
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $res = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) {
        echo "  [ERRO WhatsApp] {$numero}: {$err}\n";
    } else {
        echo "  [WhatsApp] Enviado para {$numero}\n";
    }
}
