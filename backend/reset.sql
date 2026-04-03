-- ============================================================
-- Virtual Core — Reset completo do banco (zera todos os dados)
-- Execute no phpMyAdmin: Database > virtualcore > SQL
-- ============================================================

USE virtualcore;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE estoque_movimentos;
TRUNCATE TABLE estoque;
TRUNCATE TABLE notificacoes;
TRUNCATE TABLE contratos;
TRUNCATE TABLE contas_receber;
TRUNCATE TABLE contas_pagar;
TRUNCATE TABLE vendas;
TRUNCATE TABLE servicos;
TRUNCATE TABLE fornecedores;
TRUNCATE TABLE clientes;
TRUNCATE TABLE admin_clientes;
TRUNCATE TABLE usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- Recria apenas o usuário admin (senha: 123456)
INSERT INTO usuarios (email, senha, nome, role) VALUES
('admin@virtualcore.com.br', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'admin');
