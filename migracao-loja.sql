-- Loja do Solar Viva Viva
-- Executar uma vez:
--   wrangler d1 execute solar-viva-viva-db --file=./migracao-loja.sql --remote
-- (Pode ser rodado de novo sem problema: usa IF NOT EXISTS.)

CREATE TABLE IF NOT EXISTS loja_categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loja_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  categoria_id INTEGER,
  tipo TEXT NOT NULL DEFAULT 'venda' CHECK (tipo IN ('venda', 'aluguel', 'ambos')),
  descricao TEXT,
  preco_venda REAL,
  preco_aluguel REAL,
  unidade_aluguel TEXT CHECK (unidade_aluguel IS NULL OR unidade_aluguel IN ('evento', 'dia', 'semana')),
  tamanhos TEXT,
  cor TEXT,
  estoque INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0,
  destaque INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT,
  FOREIGN KEY (categoria_id) REFERENCES loja_categorias(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS loja_fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  midia_id INTEGER NOT NULL,
  posicao INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES loja_itens(id) ON DELETE CASCADE,
  FOREIGN KEY (midia_id) REFERENCES midia(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loja_itens_categoria ON loja_itens(categoria_id);
CREATE INDEX IF NOT EXISTS idx_loja_itens_ativo ON loja_itens(ativo, destaque, ordem);
CREATE INDEX IF NOT EXISTS idx_loja_fotos_item ON loja_fotos(item_id, posicao);