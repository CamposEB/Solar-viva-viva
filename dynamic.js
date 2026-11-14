'use strict';

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
    track.innerHTML = '';
    const baseContent = document.createElement('div');
    baseContent.className = 'ticker__content';
    baseContent.innerHTML = conteudoHTML;
    track.appendChild(baseContent);
    ticker.hidden = false;
    document.body.classList.add('has-ticker');
    void track.offsetWidth;
    const larguraBase = baseContent.offsetWidth;
    if (larguraBase === 0) return; 
    const telaLargura = window.innerWidth;
    let numCopias = Math.ceil((telaLargura * 2) / larguraBase);
    if (numCopias % 2 !== 0) numCopias++;
    numCopias = Math.max(2, numCopias);
    for (let i = 1; i < numCopias; i++) {
      const clone = baseContent.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }
    const distanciaTotal = track.offsetWidth / 2;
    const velocidade = Math.max(20, Math.min(200, Number(cfg.velocidade) || 70));
    const dur = Math.max(10, distanciaTotal / velocidade);
    track.style.setProperty('--dur', `${dur.toFixed(2)}s`);
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
          <p class="promo__meta">${fmtData(p.data_inicio)}${p.data_fim ? ` → ${fmtData(p.data_fim)}` : ''}</p>
          <h3 class="promo__titulo">${escapar(p.titulo)}</h3>
          ${p.descricao ? `<p class="promo__descricao">${escapar(p.descricao)}</p>` : ''}
        </div>
      </article>
    `).join('');
    secao.hidden = false;
    adicionarLinkNav('#promocoes', 'Promoções');
  }

  /* ---------- GALERIA ---------- */
  function aplicarGaleria(itens) {
    if (!Array.isArray(itens) || !itens.length) return;
    const fotosDinamicas = itens.map(g => ({ src: g.url, alt: g.legenda || 'Foto da galeria', legenda: g.legenda || '' }));
    if (typeof window.renderGaleria === 'function') window.renderGaleria(fotosDinamicas);
  }

  /* ---------- DEPOIMENTOS ---------- */
  function aplicarDepoimentos(itens) {
    if (!Array.isArray(itens) || !itens.length) return;
    const secao = $('#depoimentos');
    const lista = $('#depoimentos-lista');
    if (!secao || !lista) return;

    lista.innerHTML = itens.map(d => `
      <blockquote class="depoimento">
        <p>"${escapar(d.texto)}"</p>
        <cite>— ${escapar(d.nome)}${d.tipo_evento ? `, ${escapar(d.tipo_evento)}` : ''}</cite>
      </blockquote>
    `).join('');

    secao.classList.remove('oculto');
    if (window.initReveal) setTimeout(window.initReveal, 100); 
  }

  /* ---------- CONFIGURAÇÕES E TEMAS ---------- */
  function aplicarConfiguracoes(cfg) {
    if (!cfg) return;
    
    document.body.classList.remove('tema-natal', 'tema-ano-novo', 'tema-dia-das-maes', 'tema-dia-dos-pais');
    
    let fraseTema = '';
    if (cfg.tema_ativo && cfg.tema_ativo !== 'padrao') {
      document.body.classList.add(`tema-${cfg.tema_ativo}`);
      
      const frases = {
        'natal': 'Feliz Natal!',
        'ano-novo': 'Feliz Ano Novo!',
        'dia-dos-pais': 'Feliz Dia dos Pais!',
        'dia-das-maes': 'Feliz Dia das Mães!'
      };
      fraseTema = frases[cfg.tema_ativo] || '';
    }

    // --- NOVA LÓGICA DA FRASE NO HERO ---
    const heroTitulo = $('#txt-hero-titulo');
    let elFraseHero = $('#tema-frase-hero');

    if (fraseTema) {
      // Se o elemento não existir, nós o criamos antes do título principal
      if (!elFraseHero && heroTitulo && heroTitulo.parentNode) {
        elFraseHero = document.createElement('div');
        elFraseHero.id = 'tema-frase-hero';
        elFraseHero.className = 'hero__tema-frase';
        heroTitulo.parentNode.insertBefore(elFraseHero, heroTitulo);
      }
      // Define o texto e exibe
      if (elFraseHero) {
        elFraseHero.textContent = fraseTema;
        elFraseHero.style.display = 'inline-block';
      }
    } else {
      // Se não houver tema, esconde o elemento
      if (elFraseHero) {
        elFraseHero.style.display = 'none';
      }
    }

    // Garante que o título principal NUNCA seja substituído de forma errada
    if (heroTitulo && cfg.hero_titulo) {
        heroTitulo.innerHTML = cfg.hero_titulo;
    }

    if (cfg.hero_subtitulo && $('#txt-hero-subtitulo')) $('#txt-hero-subtitulo').innerText = cfg.hero_subtitulo;
    if (cfg.espaco_titulo && $('#txt-espaco-titulo')) $('#txt-espaco-titulo').innerText = cfg.espaco_titulo;
    if (cfg.espaco_texto_1 && $('#txt-espaco-1')) $('#txt-espaco-1').innerText = cfg.espaco_texto_1;
    if (cfg.espaco_texto_2 && $('#txt-espaco-2')) $('#txt-espaco-2').innerText = cfg.espaco_texto_2;

    // Ativa as partículas (neve, fogos, pétalas, poeira)
    iniciarParticulasTema(cfg.tema_ativo);
  }

  /* ---------- CONTATOS E REDES ---------- */
  function aplicarContatos(cfg) {
    if (!cfg) return;
    const wppNumero = cfg.contato_whatsapp || '5521992424254';
    const wppLink = `https://wa.me/${wppNumero}`;
    
    document.querySelectorAll('a[href*="wa.me"], #link-whatsapp, #link-whatsapp-rodape').forEach(a => {
      a.href = wppLink;
    });
    
    if (cfg.contato_telefone) {
      document.querySelectorAll('a[href^="tel:"]').forEach(a => a.href = `tel:+${wppNumero}`);
      if ($('#link-telefone')) $('#link-telefone').textContent = cfg.contato_telefone;
    }
    
    if (cfg.contato_instagram) {
      document.querySelectorAll('a[href*="instagram.com"], #link-instagram').forEach(a => a.href = cfg.contato_instagram);
      if ($('#link-instagram')) $('#link-instagram').textContent = '@' + cfg.contato_instagram.split('/').filter(Boolean).pop();
    }
    
    if (cfg.contato_endereco) {
      document.querySelectorAll('#txt-endereco, #txt-endereco-rodape, #txt-endereco-footer').forEach(el => el.innerHTML = cfg.contato_endereco);
    }
    if (cfg.contato_horario && $('#txt-horario')) $('#txt-horario').textContent = cfg.contato_horario;
  }

  /* ---------- TEXTOS DE EVENTOS ---------- */
  function aplicarTextosEventos(cfg) {
    if (!cfg) return;
    const chaves = ['casamento', '15anos', 'aniversarios', 'formaturas', 'corporativos'];
    chaves.forEach(k => {
      if (cfg[`ev_${k}_titulo`] && $(`#txt-ev-${k}-titulo`)) $(`#txt-ev-${k}-titulo`).innerText = cfg[`ev_${k}_titulo`];
      if (cfg[`ev_${k}_frase`] && $(`#txt-ev-${k}-frase`)) $(`#txt-ev-${k}-frase`).innerText = cfg[`ev_${k}_frase`];
      if (cfg[`ev_${k}_nota`] && $(`#txt-ev-${k}-nota`)) $(`#txt-ev-${k}-nota`).innerText = cfg[`ev_${k}_nota`];
    });
  }

  /* ---------- FAQ ---------- */
  function aplicarFaq(itens) {
    if (!Array.isArray(itens) || !itens.length) return;
    const lista = $('#faq-lista');
    if (!lista) return;

    lista.innerHTML = itens.map(f => `
      <details class="faq__item">
        <summary>${escapar(f.pergunta)}<span class="faq__icone" aria-hidden="true"></span></summary>
        <div class="faq__resposta"><p>${escapar(f.resposta)}</p></div>
      </details>
    `).join('');

    if (typeof window.initFaq === 'function') window.initFaq();
    if (window.initReveal) setTimeout(window.initReveal, 100);
  }

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
  }

  /* ---------- SISTEMA DE PARTÍCULAS DOS TEMAS (CANVAS) ---------- */
  let canvasAnimId = null;
  let canvasElement = null;

  function iniciarParticulasTema(tema) {
    pararParticulasTema();
    if (!tema || tema === 'padrao' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    canvasElement = document.createElement('canvas');
    canvasElement.id = 'theme-particles-canvas';
    canvasElement.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;opacity:0.6;';
    document.body.appendChild(canvasElement);

    const ctx = canvasElement.getContext('2d');
    let particles = [];
    
    function resize() {
      canvasElement.width = window.innerWidth;
      canvasElement.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const configs = {
      'natal':      { color: '#ffffff', count: 60, type: 'snow',  speedY: [0.5, 1.5],  speedX: [-0.5, 0.5], size: [1, 3] },
      'ano-novo':   { color: '#ffd700', count: 80, type: 'spark', speedY: [-2, -0.5], speedX: [-1, 1],     size: [1, 2.5] }, 
      'dia-das-maes':{ color: '#ffb6c1', count: 40, type: 'petal', speedY: [0.5, 1.5],  speedX: [-1, 1],     size: [3, 6] },
      'dia-dos-pais':{ color: '#d4af37', count: 50, type: 'dust',  speedY: [0.2, 1],    speedX: [-0.3, 0.3], size: [1, 2] }
    };

    const cfg = configs[tema];
    if (!cfg) return;

    function criarParticula() {
      return {
        x: Math.random() * canvasElement.width,
        y: cfg.type === 'spark' ? canvasElement.height + 10 : Math.random() * canvasElement.height - canvasElement.height,
        size: Math.random() * (cfg.size[1] - cfg.size[0]) + cfg.size[0],
        speedY: Math.random() * (cfg.speedY[1] - cfg.speedY[0]) + cfg.speedY[0],
        speedX: Math.random() * (cfg.speedX[1] - cfg.speedX[0]) + cfg.speedX[0],
        opacity: Math.random() * 0.5 + 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05
      };
    }

    for (let i = 0; i < cfg.count; i++) {
      particles.push(criarParticula());
    }

    function draw() {
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.fillStyle = cfg.color;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.globalAlpha = p.opacity;

        if (cfg.type === 'petal') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          p.rotation += p.rotationSpeed;
        } else if (cfg.type === 'spark') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = p.opacity * 0.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y + p.size * 2, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        p.y += p.speedY;
        p.x += p.speedX + ((cfg.type === 'snow' || cfg.type === 'petal') ? Math.sin(p.y * 0.01) * 0.5 : 0);

        if (cfg.type === 'spark' && p.y < -10) {
          particles[i] = criarParticula();
          particles[i].y = canvasElement.height + 10;
        } else if (cfg.type !== 'spark' && p.y > canvasElement.height + 10) {
          particles[i] = criarParticula();
          particles[i].y = -10;
        }
      }
      canvasAnimId = requestAnimationFrame(draw);
    }
    draw();
  }

  function pararParticulasTema() {
    if (canvasAnimId) cancelAnimationFrame(canvasAnimId);
    if (canvasElement) {
      canvasElement.remove();
      canvasElement = null;
    }
  }

  /* ---------- CARREGAR ---------- */
  async function carregar() {
    try {
      const res = await fetch('/api/site?t=' + Date.now(), { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return;
      const dados = await res.json();
      
      aplicarConfiguracoes(dados.configuracoes);
      aplicarContatos(dados.configuracoes);
      aplicarTextosEventos(dados.configuracoes);
      aplicarLetreiro(dados.letreiro);
      aplicarComunicados(dados.comunicados);
      aplicarPromocoes(dados.promocoes);
      aplicarGaleria(dados.galeria); 
      aplicarDepoimentos(dados.depoimentos);
      aplicarFaq(dados.faq);
      
    } catch (err) {
      console.warn('Conteúdo dinâmico indisponível:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregar);
  } else {
    carregar();
  }
})();