'use strict';
/* ============================================================
   VITRINE DA LOJA — site público
   Lê /api/loja e preenche a seção #loja.
   ============================================================ */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const secao = $('#loja');
  const grid = $('#loja-grid');
  const filtros = $('#loja-filtros');
  if (!secao || !grid || !filtros) return;

  const escapar = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const brl = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const UNIDADES = { evento: 'por evento', dia: 'por dia', semana: 'por semana' };
  const LOGO = 'assets/Logo-Solar-Viva-Viva-removebg-preview.png';

  const estado = { itens: [], cat: '', modo: '' };
  const vende = (i) => i.tipo === 'venda' || i.tipo === 'ambos';
  const aluga = (i) => i.tipo === 'aluguel' || i.tipo === 'ambos';

  /* ---------- WhatsApp ---------- */
  function numeroWa() {
    const a = document.querySelector('a[data-wa]');
    const m = /wa\.me\/(\d+)/.exec(a ? a.getAttribute('href') : '');
    return m ? m[1] : '5521992424254';
  }

  function mensagem(item, modo) {
    const acao = modo === 'alugar' ? 'alugar' : modo === 'comprar' ? 'comprar' : 'saber mais sobre';
    
    let texto = `Olá! Vi no site do Solar Viva Viva e quero ${acao} o item “${item.nome}”.`;

    // Monta a lista de especificações (Tamanho, Cor, Preço)
    let detalhes = [];
    if (item.tamanhos) detalhes.push(`*Tamanho:* ${item.tamanhos}`);
    if (item.cor) detalhes.push(`*Cor:* ${item.cor}`);
    
    if (modo === 'comprar' && item.preco_venda != null) {
      detalhes.push(`*Valor:* ${brl(item.preco_venda)}`);
    } else if (modo === 'alugar' && item.preco_aluguel != null) {
      const unidade = UNIDADES[item.unidade_aluguel] || 'por evento';
      detalhes.push(`*Valor do aluguel:* ${brl(item.preco_aluguel)} ${unidade}`);
    }

    // Se houver detalhes, adiciona na mensagem formatado
    if (detalhes.length > 0) {
      texto += `\n\n*Detalhes do item:*\n${detalhes.join('\n')}`;
    }

    const extra = item.disponivel ? '' : '\n\nVi que está indisponível no momento. Quando terão de novo?';
    return texto + extra;
  }

  const linkWa = (item, modo) => `https://wa.me/${numeroWa()}?text=${encodeURIComponent(mensagem(item, modo))}`;

  /* ---------- filtros ---------- */
  function grupo(rotulo, chave, opcoes) {
    return `<div class="loja__grupo" role="group" aria-label="${rotulo}">` +
      opcoes.map(([valor, texto]) =>
        `<button type="button" class="loja-chip" data-filtro="${chave}" data-valor="${escapar(valor)}" aria-pressed="${estado[chave] === valor}">${escapar(texto)}</button>`
      ).join('') + '</div>';
  }

  function renderFiltros() {
    const cats = [...new Map(estado.itens.filter((i) => i.categoria_id).map((i) => [i.categoria_id, i.categoria])).entries()];
    const partes = [];
    if (cats.length > 1) {
      partes.push(grupo('Categoria', 'cat', [['', 'Todas'], ...cats.map(([id, nome]) => [String(id), nome])]));
    }
    if (estado.itens.some(vende) && estado.itens.some(aluga)) {
      partes.push(grupo('Tipo', 'modo', [['', 'Tudo'], ['comprar', 'Comprar'], ['alugar', 'Alugar']]));
    }
    filtros.innerHTML = partes.join('');
    filtros.hidden = !partes.length;
  }

  /* ---------- cartões ---------- */
  function botao(item, modo, texto) {
    return `<a class="btn btn--ouro btn--pequeno" href="${escapar(linkWa(item, modo))}" data-wa-item="${item.id}" data-modo="${modo}" target="_blank" rel="noopener noreferrer"><svg class="icone-wa" aria-hidden="true"><use href="#wa-icon"/></svg>${texto}</a>`;
  }

  function card(i) {
    const fotos = i.fotos || [];
    const capa = fotos.length
      ? `<img class="loja-card__img" src="${escapar(fotos[0])}" alt="${escapar(i.nome)}" loading="lazy" decoding="async">`
      : `<img class="loja-card__img loja-card__img--logo" src="${LOGO}" alt="" loading="lazy">`;
    const miniaturas = fotos.length > 1
      ? `<div class="loja-card__miniaturas">${fotos.slice(0, 5).map((u, k) =>
          `<button type="button" class="loja-thumb${k ? '' : ' on'}" data-foto="${escapar(u)}" aria-label="Ver foto ${k + 1} de ${escapar(i.nome)}"><img src="${escapar(u)}" alt="" loading="lazy"></button>`
        ).join('')}</div>`
      : '';

    const selos = [
      i.destaque ? '<span class="loja-selo">Destaque</span>' : '',
      !i.disponivel ? '<span class="loja-selo loja-selo--off">Indisponível</span>' : '',
    ].join('');

    const precos = [
      vende(i) && i.preco_venda != null ? `<p class="loja-preco"><small>Comprar</small>${brl(i.preco_venda)}</p>` : '',
      aluga(i) && i.preco_aluguel != null ? `<p class="loja-preco"><small>Alugar ${UNIDADES[i.unidade_aluguel] || ''}</small>${brl(i.preco_aluguel)}</p>` : '',
    ].join('');

    const detalhes = [i.tamanhos ? `Tamanhos: ${escapar(i.tamanhos)}` : '', i.cor ? `Cor: ${escapar(i.cor)}` : '']
      .filter(Boolean).map((t) => `<li>${t}</li>`).join('');

    let botoes;
    if (!i.disponivel) botoes = botao(i, '', 'Consultar disponibilidade');
    else if (vende(i) && aluga(i)) botoes = botao(i, 'comprar', 'Comprar') + botao(i, 'alugar', 'Alugar');
    else botoes = botao(i, vende(i) ? 'comprar' : 'alugar', vende(i) ? 'Comprar' : 'Alugar');

    return `
    <article class="loja-card${i.disponivel ? '' : ' loja-card--off'}">
      <div class="loja-card__foto">${capa}<div class="loja-card__selos">${selos}</div></div>
      ${miniaturas}
      <div class="loja-card__corpo">
        ${i.categoria ? `<p class="loja-card__cat">${escapar(i.categoria)}</p>` : ''}
        <h3 class="loja-card__nome">${escapar(i.nome)}</h3>
        ${i.descricao ? `<p class="loja-card__desc">${escapar(i.descricao)}</p>` : ''}
        ${detalhes ? `<ul class="loja-card__detalhes">${detalhes}</ul>` : ''}
        <div class="loja-card__precos">${precos}</div>
        <div class="loja-card__acoes">${botoes}</div>
      </div>
    </article>`;
  }

  function renderGrid() {
    const lista = estado.itens.filter((i) =>
      (!estado.cat || String(i.categoria_id) === estado.cat) &&
      (!estado.modo || (estado.modo === 'comprar' ? vende(i) : aluga(i)))
    );
    grid.innerHTML = lista.length
      ? lista.map(card).join('')
      : '<p class="loja__vazio">Nenhum item encontrado nesse filtro. Fale com a gente pelo WhatsApp que ajudamos.</p>';
  }

  /* ---------- eventos ---------- */
  filtros.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filtro]');
    if (!b) return;
    estado[b.dataset.filtro] = b.dataset.valor;
    renderFiltros();
    renderGrid();
  });

  grid.addEventListener('click', (e) => {
    const wa = e.target.closest('[data-wa-item]');
    if (wa) {
      const item = estado.itens.find((x) => x.id === Number(wa.dataset.waItem));
      if (!item) return;
      e.preventDefault();
      window.open(linkWa(item, wa.dataset.modo), '_blank', 'noopener');
      return;
    }
    const th = e.target.closest('[data-foto]');
    if (th) {
      const c = th.closest('.loja-card');
      c.querySelector('.loja-card__img').src = th.dataset.foto;
      c.querySelectorAll('.loja-thumb').forEach((b) => b.classList.toggle('on', b === th));
    }
  });

  /* ---------- menu e carga ---------- */
  function adicionarLinkNav() {
    const nav = $('.nav__lista');
    if (!nav || nav.querySelector('a[href="#loja"]')) return;
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#loja';
    a.textContent = 'Loja';
    a.setAttribute('data-nav', '');
    li.appendChild(a);
    const contato = nav.querySelector('a[href="#contato"]');
    if (contato && contato.parentElement) nav.insertBefore(li, contato.parentElement);
    else nav.appendChild(li);
  }

  async function carregar() {
    try {
      // Adiciona o link no menu imediatamente, independente do conteúdo
      adicionarLinkNav();
      secao.hidden = false; // Mostra a seção

      const res = await fetch('/api/loja', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('API indisponível');
      
      const dados = await res.json();
      estado.itens = dados.itens || [];
      
      if (!estado.itens.length) {
        grid.innerHTML = '<p class="loja__vazio">Nossa vitrine está sendo preparada. Fale com a gente pelo WhatsApp para saber o que temos disponível!</p>';
        return;
      }
      
      renderFiltros();
      renderGrid();
    } catch (err) {
      console.warn('Loja indisponível:', err);
      secao.hidden = false;
      grid.innerHTML = '<p class="loja__vazio">Não foi possível carregar a loja agora. Por favor, tente novamente mais tarde.</p>';
    }
  }

  carregar();
})();