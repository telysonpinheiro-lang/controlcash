-- ============================================================
-- Virtual Core — Tabela de segurança (rate limiting)
-- Execute após database.sql e database_updates.sql
-- ============================================================

USE virtualcore;

-- ── RATE LIMITING DE LOGIN ───────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    ip           VARCHAR(45) NOT NULL,
    usuario      VARCHAR(255) NOT NULL,
    sucesso      TINYINT(1) DEFAULT 0,
    tentativa_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_time (ip, tentativa_em),
    INDEX idx_cleanup (tentativa_em)
);
