// Utilitários da Loja: validação do item e leitura das fotos. Não é uma rota.

const TIPOS = ['venda', 'aluguel', 'ambos'];
const UNIDADES = ['evento', 'dia', 'semana'];
export const MAX_FOTOS = 8;

// vazio -> null | inválido -> NaN | válido -> número com 2 casas
function preco(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1e7 ? Math.round(n * 100) / 100 : NaN;
}

export function validarItem(b) {
  const nome = String(b.nome || '').trim();
  if (nome.length < 2 || nome.length > 120) return { erro: 'O nome deve ter de 2 a 120 caracteres.' };

  const tipo = String(b.tipo || '');
  if (!TIPOS.includes(tipo)) return { erro: 'Tipo inválido.' };

  const venda = tipo === 'aluguel' ? null : preco(b.preco_venda);
  const aluguel = tipo === 'venda' ? null : preco(b.preco_aluguel);
  if (tipo !== 'aluguel' && (venda === null || Number.isNaN(venda))) return { erro: 'Preço de venda inválido.' };
  if (tipo !== 'venda' && (aluguel === null || Number.isNaN(aluguel))) return { erro: 'Preço de aluguel inválido.' };

  const unidade = tipo === 'venda' ? null : String(b.unidade_aluguel || '');
  if (unidade !== null && !UNIDADES.includes(unidade)) return { erro: 'Unidade de aluguel inválida.' };

  const estoque = Number(b.estoque);
  if (!Number.isInteger(estoque) || estoque < 0 || estoque > 99999) return { erro: 'Estoque inválido.' };

  const categoria_id = b.categoria_id ? parseInt(b.categoria_id, 10) : null;
  if (b.categoria_id && !categoria_id) return { erro: 'Categoria inválida.' };

  const fotos = Array.isArray(b.fotos) ? [...new Set(b.fotos.map(Number))] : [];
  if (fotos.length > MAX_FOTOS || fotos.some((n) => !Number.isInteger(n) || n <= 0)) {
    return { erro: `Fotos inválidas (máximo de ${MAX_FOTOS}).` };
  }

  return {
    v: {
      nome,
      categoria_id,
      tipo,
      descricao: String(b.descricao || '').trim().slice(0, 1000),
      preco_venda: venda,
      preco_aluguel: aluguel,
      unidade_aluguel: unidade,
      tamanhos: String(b.tamanhos || '').trim().slice(0, 80),
      cor: String(b.cor || '').trim().slice(0, 40),
      estoque,
      ordem: parseInt(b.ordem, 10) || 0,
      destaque: b.destaque ? 1 : 0,
      ativo: b.ativo === false ? 0 : 1,
    },
    fotos,
  };
}

// Confere se a categoria e as fotos existem. Retorna a mensagem de erro ou null.
export async function conferirReferencias(env, v, fotos) {
  if (v.categoria_id) {
    const c = await env.DB.prepare('SELECT 1 AS ok FROM loja_categorias WHERE id = ?').bind(v.categoria_id).first();
    if (!c) return 'Categoria não encontrada.';
  }
  if (fotos.length) {
    const ph = fotos.map(() => '?').join(',');
    const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM midia WHERE tipo = 'imagem' AND id IN (${ph})`).bind(...fotos).first();
    if (!r || r.n !== fotos.length) return 'Uma das fotos não existe mais na biblioteca de mídia.';
  }
  return null;
}

export function statementsFotos(env, itemId, fotos) {
  return fotos.map((midiaId, i) =>
    env.DB.prepare('INSERT INTO loja_fotos (item_id, midia_id, posicao) VALUES (?, ?, ?)').bind(itemId, midiaId, i)
  );
}

// Mapa item_id -> [{ midia_id, chave }] já na ordem das fotos
export async function listarFotos(env) {
  const r = await env.DB.prepare(`
    SELECT lf.item_id, lf.midia_id, m.chave
    FROM loja_fotos lf JOIN midia m ON m.id = lf.midia_id
    ORDER BY lf.item_id, lf.posicao, lf.id
  `).all();
  const mapa = new Map();
  for (const f of r.results || []) {
    if (!mapa.has(f.item_id)) mapa.set(f.item_id, []);
    mapa.get(f.item_id).push(f);
  }
  return mapa;
}