'use strict';

/* ============================================================
   DYNAMIC.JS — Carrega e injeta conteúdo dinâmico vindo da API
   (letreiro, comunicados, promoções).
   Executado com `defer`, após o script.js principal.
   ============================================================ */

(function () {
  const $  = (s, c = document) => c.querySelector(s);

  const escapar = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const fmtData = (iso) => {
    if (!iso) return '';
    const [a, m, d] = String(iso).split('T')[0].split('-');
    return d && m && a ? `${d}/${m}/${a}` : iso;
  };

  /* ---------- LETREIRO ---------- */
  function aplicarLetreiro(cfg) {
    if (!cfg || !cfg.ativo || !cfg.texto || !cfg.texto.trim()) return;
    const linhas = cfg.texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!linhas.length) return;

    const ticker = $('#ticker');
    const track  = $('#ticker-track');
    if (!ticker || !track) return;

    const conteudoHTML = linhas.map((l) => `<span>${escapar(l)}</span>`).join('');
    
    // Limpa o track e cria o elemento base
    track.innerHTML = '';
    const baseContent = document.createElement('div');
    baseContent.className = 'ticker__content';
    baseContent.innerHTML = conteudoHTML;
    track.appendChild(baseContent);

    // Mede a largura de uma única cópia do texto
    const larguraBase = baseContent.offsetWidth;
    if (larguraBase === 0) return;

    // Calcula quantas cópias são necessárias para preencher o dobro da tela
    const telaLargura = window.innerWidth;
    let numCopias = Math.ceil((telaLargura * 2) / larguraBase);
    
    // IMPORTANTE: O número de cópias DEVE ser par para o cálculo de -50% funcionar perfeito
    if (numCopias % 2 !== 0) numCopias++;
    numCopias = Math.max(2, numCopias);

    // Adiciona as cópias restantes
    for (let i = 1; i < numCopias; i++) {
      const clone = baseContent.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }

    // Duração baseada na metade da largura total (o -50% do CSS)
    const distanciaTotal = track.offsetWidth / 2;
    const velocidade = Math.max(20, Math.min(200, Number(cfg.velocidade) || 70));
    const dur = Math.max(10, distanciaTotal / velocidade); // Mínimo de 10s para não ficar tonto

    track.style.setProperty('--dur', `${dur.toFixed(2)}s`);

    ticker.hidden = false;
    document.body.classList.add('has-ticker');

    // Esconde o ticker ao rolar (para não competir com o header fixo)
    const aoRolar = () => {
      document.body.classList.toggle('ticker-oculto', window.scrollY > 24);
    };
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
  }

  /* ---------- COMUNICADOS ---------- */
  function aplicarComunicados(itens) {
    if (!Array.isArray(itens) || !itens.length) return;
    const secao = $('#comunicados');
    const lista = $('#comunicados-lista');
    if (!secao || !lista) return;

    lista.innerHTML = itens.map((c) => `
      <article class="comunicado ${c.destaque ? 'comunicado--destaque' : ''}">
        <div class="comunicado__meta">
          ${c.destaque ? '<span class="comunicado__tag">Destaque</span>' : ''}
          ${c.publicado_em ? `<span class="comunicado__data">${fmtData(c.publicado_em)}</span>` : ''}
          ${c.encerra_em   ? `<span>até ${fmtData(c.encerra_em)}</span>` : ''}
        </div>
        <h3 class="comunicado__titulo">${escapar(c.titulo)}</h3>
        <p class="comunicado__descricao">${escapar(c.descricao)}</p>
      </article>
    `).join('');

    secao.hidden = false;
    adicionarLinkNav('#comunicados', 'Comunicados');
  }

  /* ---------- PROMOÇÕES ---------- */
  function aplicarPromocoes(itens) {
    if (!Array.isArray(itens) || !itens.length) return;
    const secao = $('#promocoes');
    const lista = $('#promocoes-lista');
    if (!secao || !lista) return;

    lista.innerHTML = itens.map((p) => `
      <article class="promo">
        ${p.imagem_url ? `<img class="promo__img" src="${escapar(p.imagem_url)}" alt="${escapar(p.titulo)}" loading="lazy" decoding="async">` : ''}
        <div class="promo__corpo">
          <p class="promo__meta">
            ${fmtData(p.data_inicio)}${p.data_fim ? ` → ${fmtData(p.data_fim)}` : ''}
          </p>
          <h3 class="promo__titulo">${escapar(p.titulo)}</h3>
          ${p.descricao ? `<p class="promo__descricao">${escapar(p.descricao)}</p>` : ''}
        </div>
      </article>
    `).join('');

    secao.hidden = false;
    adicionarLinkNav('#promocoes', 'Promoções');
  }

  /* ---------- NAV DINÂMICO ---------- */
  function adicionarLinkNav(href, texto) {
    const nav = $('.nav__lista');
    if (!nav || nav.querySelector(`a[href="${href}"]`)) return;

    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href = href;
    a.textContent = texto;
    a.setAttribute('data-nav', '');
    li.appendChild(a);

    const contatoLi = nav.querySelector('a[href="#contato"]')?.parentElement;
    if (contatoLi) nav.insertBefore(li, contatoLi);
    else nav.appendChild(li);

    // Também no rodapé
    const rodape = $('.rodape__links');
    if (rodape && !rodape.querySelector(`a[href="${href}"]`)) {
      const ra = document.createElement('a');
      ra.href = href;
      ra.textContent = texto;
      const contatoRod = rodape.querySelector('a[href="#contato"]');
      if (contatoRod) rodape.insertBefore(ra, contatoRod);
      else rodape.appendChild(ra);
    }
  }

  /* ---------- CARREGAR ---------- */
  async function carregar() {
    try {
      const res = await fetch('/api/site', { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return;
      const dados = await res.json();
      aplicarLetreiro(dados.letreiro);
      aplicarComunicados(dados.comunicados);
      aplicarPromocoes(dados.promocoes);
    } catch (err) {
      // Silencioso: se a API falhar, o site continua estático normalmente
      console.warn('Conteúdo dinâmico indisponível:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregar);
  } else {
    carregar();
  }
})();