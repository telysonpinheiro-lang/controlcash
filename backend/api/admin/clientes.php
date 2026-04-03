<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';

$pdo    = getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        $stmt = $pdo->query('SELECT * FROM admin_clientes ORDER BY empresa');
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['modulos'] = json_decode($r['modulos'] ?? '[]');
        }
        echo json_encode($rows);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        if (empty($data['empresa']) || empty($data['contato'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Empresa e contato são obrigatórios']);
            exit;
        }
        if (empty($data['email_contato'])) {
            http_response_code(400);
            echo json_encode(['error' => 'E-mail do contato é obrigatório para criar o acesso']);
            exit;
        }

        // Verifica se já existe admin_cliente com este email
        $chkCli = $pdo->prepare('SELECT id FROM admin_clientes WHERE email_contato = ?');
        $chkCli->execute([$data['email_contato']]);
        if ($chkCli->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Já existe um cliente com este e-mail']);
            exit;
        }

        $planos = ['essencial' => 49, 'profissional' => 79, 'empresa' => 129];
        $plano  = $data['plano'] ?? 'essencial';
        $preco  = $planos[$plano] ?? 49;

        // Gera senha temporária
        $tempSenha = strtoupper(substr(str_replace(['+','/','='], '', base64_encode(random_bytes(8))), 0, 8));
        $hash      = password_hash($tempSenha, PASSWORD_BCRYPT);

        // Cria ou reutiliza usuário
        $chkUser = $pdo->prepare('SELECT id FROM usuarios WHERE email = ?');
        $chkUser->execute([$data['email_contato']]);
        $existente = $chkUser->fetch();

        if ($existente) {
            // Reutiliza usuario existente — reseta senha
            $uid = $existente['id'];
            $pdo->prepare('UPDATE usuarios SET senha = ?, nome = ?, plano = ?, ativo = 1 WHERE id = ?')
                ->execute([$hash, $data['contato'], $plano, $uid]);
        } else {
            // Cria novo usuario
            $usuario = strtolower(explode('@', $data['email_contato'])[0]);
            $pdo->prepare('
                INSERT INTO usuarios (email, usuario, senha, nome, role, plano, ativo)
                VALUES (:email, :usuario, :senha, :nome, "user", :plano, 1)
            ')->execute([
                'email'   => $data['email_contato'],
                'usuario' => $usuario,
                'senha'   => $hash,
                'nome'    => $data['contato'],
                'plano'   => $plano,
            ]);
            $uid = $pdo->lastInsertId();
        }

        // Cria admin_cliente
        $pdo->prepare('
            INSERT INTO admin_clientes
              (empresa, contato, cpf_cnpj, telefone, email_contato, plano, setup, recorrencia, modulos, status, usuario_id, primeiro_acesso)
            VALUES
              (:empresa, :contato, :cpf_cnpj, :telefone, :email, :plano, :setup, :recorrencia, :modulos, "ativo", :uid, 1)
        ')->execute([
            'empresa'    => $data['empresa'],
            'contato'    => $data['contato'],
            'cpf_cnpj'   => $data['cpf_cnpj']      ?? null,
            'telefone'   => $data['telefone']       ?? null,
            'email'      => $data['email_contato'],
            'plano'      => $plano,
            'setup'      => $data['setup']          ?? $preco * 3,
            'recorrencia'=> $data['recorrencia']    ?? $preco,
            'modulos'    => json_encode([]),
            'uid'        => $uid,
        ]);

        $id   = $pdo->lastInsertId();
        $novo = $pdo->prepare('SELECT * FROM admin_clientes WHERE id = ?');
        $novo->execute([$id]);
        $row = $novo->fetch();
        $row['modulos']    = json_decode($row['modulos'] ?? '[]');
        $row['temp_senha'] = $tempSenha;   // retorna para o frontend exibir / enviar WhatsApp

        http_response_code(201);
        echo json_encode($row);
        break;

    case 'PATCH':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }
        $data = json_decode(file_get_contents('php://input'), true);

        $planos = ['essencial' => 49, 'profissional' => 79, 'empresa' => 129];
        $plano  = $data['plano'] ?? 'essencial';
        $preco  = $planos[$plano] ?? 49;

        $pdo->prepare('
            UPDATE admin_clientes
            SET empresa=:empresa, contato=:contato, cpf_cnpj=:cpf_cnpj,
                telefone=:telefone, email_contato=:email, plano=:plano,
                setup=:setup, recorrencia=:recorrencia
            WHERE id=:id
        ')->execute([
            'empresa'    => $data['empresa'],
            'contato'    => $data['contato'],
            'cpf_cnpj'   => $data['cpf_cnpj']   ?? null,
            'telefone'   => $data['telefone']    ?? null,
            'email'      => $data['email_contato'] ?? null,
            'plano'      => $plano,
            'setup'      => $data['setup']       ?? $preco * 3,
            'recorrencia'=> $data['recorrencia'] ?? $preco,
            'id'         => $id,
        ]);

        // Atualiza plano do usuário vinculado também
        $cli = $pdo->prepare('SELECT usuario_id FROM admin_clientes WHERE id = ?');
        $cli->execute([$id]);
        $c = $cli->fetch();
        if ($c['usuario_id']) {
            $pdo->prepare('UPDATE usuarios SET plano=? WHERE id=?')->execute([$plano, $c['usuario_id']]);
        }

        $stmt = $pdo->prepare('SELECT * FROM admin_clientes WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        $row['modulos'] = json_decode($row['modulos'] ?? '[]');
        echo json_encode($row);
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID obrigatório']); exit; }

        // Cascade: cobranças, usuario vinculado
        $cli = $pdo->prepare('SELECT usuario_id FROM admin_clientes WHERE id = ?');
        $cli->execute([$id]);
        $c = $cli->fetch();
        $pdo->prepare('DELETE FROM admin_cobrancas WHERE admin_cliente_id = ?')->execute([$id]);
        $pdo->prepare('DELETE FROM admin_clientes WHERE id = ?')->execute([$id]);
        if ($c && $c['usuario_id']) {
            // Não deletar usuários admin
            $chkAdmin = $pdo->prepare("SELECT role, plano FROM usuarios WHERE id = ?");
            $chkAdmin->execute([$c['usuario_id']]);
            $uAdm = $chkAdmin->fetch();
            if (!$uAdm || ($uAdm['role'] !== 'admin' && $uAdm['plano'] !== 'admin')) {
                $pdo->prepare('DELETE FROM notificacoes WHERE usuario_id = ?')->execute([$c['usuario_id']]);
                $pdo->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$c['usuario_id']]);
            }
        }

        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método não permitido']);
}
