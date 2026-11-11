-- Executar com: wrangler d1 execute solar-viva-viva-db --file=./schema.sql --remote

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessoes (
  token TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  expira_em TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);

CREATE TABLE IF NOT EXISTS comunicados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  publicado_em TEXT,          -- YYYY-MM-DD (NULL = imediato)
  encerra_em TEXT,            -- YYYY-MM-DD (NULL = sem prazo)
  destaque INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS letreiro (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  texto TEXT NOT NULL DEFAULT '',
  ativo INTEGER NOT NULL DEFAULT 0,
  velocidade INTEGER NOT NULL DEFAULT 80,  -- px/segundo
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS midia (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chave TEXT UNIQUE NOT NULL,
  nome_original TEXT NOT NULL,
  tipo TEXT NOT NULL,
  mime TEXT NOT NULL,
  tamanho INTEGER NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS promocoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem_id INTEGER,
  data_inicio TEXT NOT NULL,  -- YYYY-MM-DD
  data_fim TEXT,              -- YYYY-MM-DD (NULL = sem prazo)
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (imagem_id) REFERENCES midia(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS login_tentativas (
  ip TEXT PRIMARY KEY,
  tentativas INTEGER NOT NULL DEFAULT 0,
  bloqueado_ate TEXT
);

INSERT INTO letreiro (id, texto, ativo, velocidade)
VALUES (1, 'Bem-vindo ao Solar Viva Viva!', 0, 80)
ON CONFLICT(id) DO NOTHING;