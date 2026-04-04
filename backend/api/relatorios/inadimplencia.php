<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/tenant.php';

$pdo    = getConnection();
$user   = getCurrentUser();
$filter = tenantFilter('cr');

// Atualiza status vencido automaticamente
$pdo->exec("
    UPDATE contas_receber
    SET status = 'vencido', dias_atraso = DATEDIFF(CURDATE(), vencimento)
    WHERE status = 'pendente' AND vencimento < CURDATE()
");
$pdo->exec("
    UPDATE contas_receber
    SET dias_atraso = DATEDIFF(CURDATE(), vencimento)
    WHERE status = 'vencido'
");

// Aging report: apenas contas VENCIDAS (prazo já passou)
$stmt = $pdo->query("
    SELECT
        cr.*,
        DATEDIFF(CURDATE(), cr.vencimento) AS dias_atraso_atual,
        CASE
            WHEN DATEDIFF(CURDATE(), cr.vencimento) BETWEEN 1  AND 30  THEN '1-30 dias'
            WHEN DATEDIFF(CURDATE(), cr.vencimento) BETWEEN 31 AND 60  THEN '31-60 dias'
            WHEN DATEDIFF(CURDATE(), cr.vencimento) BETWEEN 61 AND 90  THEN '61-90 dias'
            WHEN DATEDIFF(CURDATE(), cr.vencimento) > 90               THEN 'Acima de 90 dias'
            ELSE 'A vencer'
        END AS faixa_atraso
    FROM contas_receber cr
    WHERE {$filter}
      AND cr.status = 'vencido'
      AND cr.vencimento < CURDATE()
    ORDER BY cr.vencimento ASC
");
$lancamentos = $stmt->fetchAll();

// Resumo por faixa
$resumo = [];
$totalGeral = 0;
foreach ($lancamentos as $l) {
    $faixa = $l['faixa_atraso'];
    if (!isset($resumo[$faixa])) {
        $resumo[$faixa] = ['faixa' => $faixa, 'quantidade' => 0, 'total' => 0.0];
    }
    $resumo[$faixa]['quantidade']++;
    $resumo[$faixa]['total'] += (float) $l['valor'] + (float) ($l['valor_material'] ?? 0);
    $totalGeral += (float) $l['valor'] + (float) ($l['valor_material'] ?? 0);
}

// Top devedores
$topStmt = $pdo->query("
    SELECT cliente_nome, SUM(valor + COALESCE(valor_material,0)) AS total_devido, COUNT(*) AS qtd_parcelas
    FROM contas_receber cr
    WHERE {$filter} AND cr.status = 'vencido'
    GROUP BY cliente_nome
    ORDER BY total_devido DESC
    LIMIT 10
");

echo json_encode([
    'lancamentos'   => $lancamentos,
    'resumo_faixas' => array_values($resumo),
    'top_devedores' => $topStmt->fetchAll(),
    'total_geral'   => $totalGeral,
    'gerado_em'     => date('d/m/Y H:i'),
]);
