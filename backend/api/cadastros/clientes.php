<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int) $_GET['id'] : null;

// Monta endereço completo a partir dos campos separados
function montarEndereco($data) {
    $partes = array_filter([
        $data['rua']    ?? null,
        $data['bairro'] ?? null,
        $data['cidade'] ?? null,
        $data['cep']    ?? null,
    ]);
    return implode(' — ', $partes) ?: ($data['endereco'] ?? null);
}

switch ($method) {

    case 'GET':
        $stmt = $pdo->query('
            SELECT c.*, COUNT(v.id) AS total_servicos
            FROM clientes c
            LEFT JOIN vendas v ON v.cliente_id = c.id
            GROUP BY c.id
            ORDER BY c.nome
        ');
        echo json_encode($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['nome'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Nome é obrigatório']);
            exit;
        }

        $nome     = $data['nome'];
        $initials = mb_strtoupper(
            implode('', array_map(fn($p) => mb_substr($p, 0, 1), explode(' ', $nome)))
        );

        $stmt = $pdo->prepare('
            INSERT INTO clientes (nome, initials, telefone, email, endereco, rua, bairro, cidade, cep)
            VALUES (:nome, :initials, :telefone, :email, :endereco, :rua, :bairro, :cidade, :cep)
        ');
        $stmt->execute([
            'nome'     => $nome,
            'initials' => mb_substr($initials, 0, 2),
            'telefone' => $data['telefone'] ?? null,
            'email'    => $data['email']    ?? null,
            'endereco' => montarEndereco($data),
            'rua'      => $data['rua']      ?? null,
            'bairro'   => $data['bairro']   ?? null,
            'cidade'   => $data['cidade']   ?? null,
            'cep'      => $data['cep']      ?? null,
        ]);

        $newId = $pdo->lastInsertId();
        $novo  = $pdo->prepare('SELECT *, 0 AS total_servicos FROM clientes WHERE id = ?');
        $novo->execute([$newId]);

        http_response_code(201);
        echo json_encode($novo->fetch());
        break;

    case 'PATCH':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $data = json_decode(file_get_contents('php://input'), true);

        $nome     = $data['nome'] ?? null;
        $initials = $nome ? mb_strtoupper(mb_substr(implode('', array_map(fn($p) => mb_substr($p, 0, 1), explode(' ', $nome))), 0, 2)) : null;

        $pdo->prepare('
            UPDATE clientes
            SET nome=COALESCE(:nome,nome), initials=COALESCE(:initials,initials),
                telefone=:telefone, email=:email, endereco=:endereco,
                rua=:rua, bairro=:bairro, cidade=:cidade, cep=:cep
            WHERE id=:id
        ')->execute([
            'nome'     => $nome,
            'initials' => $initials,
            'telefone' => $data['telefone'] ?? null,
            'email'    => $data['email']    ?? null,
            'endereco' => montarEndereco($data),
            'rua'      => $data['rua']      ?? null,
            'bairro'   => $data['bairro']   ?? null,
            'cidade'   => $data['cidade']   ?? null,
            'cep'      => $data['cep']      ?? null,
            'id'       => $id,
        ]);

        $stmt = $pdo->prepare('SELECT *, 0 AS total_servicos FROM clientes WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch());
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        // Cascade: remove tudo vinculado ao cliente
        $pdo->prepare('DELETE FROM contas_receber WHERE cliente_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM contratos WHERE cliente_id = ?')->execute([$id]);
        $pdo->prepare('UPDATE vendas SET cliente_id = NULL WHERE cliente_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM clientes WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
