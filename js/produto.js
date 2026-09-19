/* =========================================================
   PRODUTO.JS — Página individual de produto
   v2 — com favoritos + comprar agora
   Depende de: products.js, cart.js
   ========================================================= */

'use strict';

var produtoAtual = null;
let variacaoAtual = {
    cor: null,
    tamanho: null,
    quantidade: 1,
    imagemAtiva: 0
};
let produtoIniciado = false;


/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', iniciarPaginaProduto);
window.addEventListener('firebase-ready', () => {
    if (!produtoAtual) iniciarPaginaProduto();
});


function iniciarPaginaProduto() {

    if (produtoIniciado && produtoAtual) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) { produtoNaoEncontrado(); return; }

    const produtos = obterProdutos();
    const produto = produtos.find(p => p.id === id);

    if (!produto) {
        if (!window.__firebasePronto) return;
        produtoNaoEncontrado();
        return;
    }

    produtoAtual = produto;
    produtoIniciado = true;
    variacaoAtual.cor = produto.cores?.[0] || null;

    renderizarProduto(produto);
    renderizarRelacionados(produto);

    document.title = `${produto.nome} — ARTEFATOS`;
}


/* ---------------------------------------------------------
   RENDER PRINCIPAL
   --------------------------------------------------------- */
function renderizarProduto(p) {

    const bcCat = document.getElementById('breadcrumbCategoria');
    const bcProd = document.getElementById('breadcrumbProduto');

    if (bcCat) {
        bcCat.textContent = capitalizar(p.categoria);
        bcCat.href = `${p.categoria}.html`;
    }
    if (bcProd) bcProd.textContent = p.nome;

    const catEl = document.getElementById('detailCategoria');
    if (catEl) catEl.textContent = p.categoria.toUpperCase();

    const nomeEl = document.getElementById('detailNome');
    if (nomeEl) nomeEl.textContent = p.nome;

    const precoEl = document.getElementById('detailPreco');
    if (precoEl) precoEl.textContent = formatarPreco(p.preco);

    const oldEl  = document.getElementById('detailPrecoAntigo');
    const descEl = document.getElementById('detailDesconto');

    if (p.precoAntigo && p.precoAntigo > p.preco) {
        if (oldEl) oldEl.textContent = formatarPreco(p.precoAntigo);
        const desc = Math.round((1 - p.preco / p.precoAntigo) * 100);
        if (descEl) descEl.textContent = `-${desc}%`;
    } else {
        if (oldEl) oldEl.textContent = '';
        if (descEl) descEl.textContent = '';
    }

    const descrEl = document.getElementById('detailDescricao');
    const accEl   = document.getElementById('accordionDescricao');
    if (descrEl) descrEl.textContent = p.descricao;
    if (accEl)   accEl.textContent   = p.descricao;

    renderizarGaleria(p);
    renderizarCores(p);
    renderizarTamanhos(p);
    renderizarEstadoWish(p);

    if (p.estoque === false) {

        const btn = document.getElementById('btnAddCart');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Esgotado';
        }

        const btnBuy = document.getElementById('btnBuyNow');
        if (btnBuy) {
            btnBuy.disabled = true;
            btnBuy.textContent = 'Esgotado';
        }
    }
}


/* ---------------------------------------------------------
   ❤️ ESTADO DO BOTÃO DE FAVORITO
   --------------------------------------------------------- */
function renderizarEstadoWish(p) {

    var btn = document.getElementById('btnWish');
    if (!btn) return;

    var fav = (typeof ehFavorito === 'function') ? ehFavorito(p.id) : false;

    btn.classList.toggle('active', fav);
    btn.setAttribute('aria-label', fav
        ? 'Remover dos favoritos'
        : 'Adicionar aos favoritos');
}


/* ---------------------------------------------------------
   GALERIA
   --------------------------------------------------------- */
function renderizarGaleria(p) {

    const thumbsContainer = document.getElementById('galleryThumbs');
    const mainImg         = document.getElementById('galleryImage');

    if (!mainImg || !thumbsContainer) return;

    const imgs = [p.imagem];
    if (p.imagemAlt) imgs.push(p.imagemAlt);
    while (imgs.length < 3) imgs.push(p.imagem);

    mainImg.src = imgs[0];
    mainImg.alt = p.nome;
    mainImg.style.cursor = 'zoom-in';
    mainImg.onclick = abrirZoom;

    thumbsContainer.innerHTML = imgs.map((src, i) => `
        <button class="gallery-thumb${i === 0 ? ' active' : ''}"
                onclick="trocarImagem(${i}, '${src}', this)"
                aria-label="Imagem ${i + 1}"
                type="button">
            <img src="${src}" alt="" loading="lazy">
        </button>
    `).join('');
}


window.trocarImagem = function (index, src, btn) {

    const mainImg = document.getElementById('galleryImage');
    if (!mainImg) return;

    mainImg.style.opacity = '0';
    setTimeout(() => {
        mainImg.src = src;
        mainImg.style.opacity = '1';
    }, 150);

    document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    variacaoAtual.imagemAtiva = index;
};


/* ---------------------------------------------------------
   CORES
   --------------------------------------------------------- */
function renderizarCores(p) {

    const container = document.getElementById('detailCores');
    const field     = document.getElementById('detailFieldCores');
    const label     = document.getElementById('corSelecionada');

    if (!container || !field) return;

    if (!p.cores || p.cores.length === 0) {
        field.style.display = 'none';
        return;
    }

    container.innerHTML = p.cores.map((cor, i) => `
        <button class="detail-color${i === 0 ? ' active' : ''}"
                style="background:${cor}"
                onclick="selecionarCor('${cor}', this)"
                aria-label="Cor ${i + 1}"
                type="button"></button>
    `).join('');

    if (label) label.textContent = p.cores[0];
}


window.selecionarCor = function (cor, btn) {

    document.querySelectorAll('.detail-color').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const label = document.getElementById('corSelecionada');
    if (label) label.textContent = cor;

    variacaoAtual.cor = cor;
};


/* ---------------------------------------------------------
   TAMANHOS
   --------------------------------------------------------- */
function renderizarTamanhos(p) {

    const container = document.getElementById('detailTamanhos');
    const field     = document.getElementById('detailFieldTamanhos');

    if (!container || !field) return;

    if (!p.tamanhos || p.tamanhos.length === 0) {
        field.style.display = 'none';
        return;
    }

    container.innerHTML = p.tamanhos.map(t => `
        <button class="detail-size"
                onclick="selecionarTamanhoPagina('${t}', this)"
                type="button">${t}</button>
    `).join('');
}


window.selecionarTamanhoPagina = function (tamanho, btn) {

    document.querySelectorAll('.detail-size').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const label = document.getElementById('tamanhoSelecionado');
    if (label) label.textContent = tamanho;

    variacaoAtual.tamanho = tamanho;
};


/* ---------------------------------------------------------
   QUANTIDADE
   --------------------------------------------------------- */
window.alterarQtd = function (delta) {

    variacaoAtual.quantidade = Math.max(1, Math.min(10, variacaoAtual.quantidade + delta));
    const el = document.getElementById('qtdProduto');
    if (el) el.textContent = variacaoAtual.quantidade;
};


/* ---------------------------------------------------------
   ADICIONAR AO CARRINHO
   --------------------------------------------------------- */
window.adicionarProdutoCarrinho = function () {

    if (!produtoAtual) return;

    if (produtoAtual.tamanhos && produtoAtual.tamanhos.length > 1 && !variacaoAtual.tamanho) {
        mostrarToast('Selecione um tamanho antes de continuar', 'warn');
        return;
    }

    const id = produtoAtual.id;
    const qtd = variacaoAtual.quantidade;

    try {

        const carrinho = lerCarrinho();
        const existente = carrinho.find(i => i.id === id);

        if (existente) {
            existente.quantidade += qtd;
        } else {
            carrinho.push({
                id: produtoAtual.id,
                nome: produtoAtual.nome,
                preco: produtoAtual.preco,
                imagem: produtoAtual.imagem,
                categoria: produtoAtual.categoria,
                quantidade: qtd
            });
        }

        if (typeof salvarCarrinho === 'function') {
            salvarCarrinho(carrinho);
        } else {
            localStorage.setItem('artefatos_carrinho', JSON.stringify(carrinho));
            window.dispatchEvent(new Event('cartUpdated'));
        }

        if (typeof atualizarContador === 'function') atualizarContador();

        mostrarToast(`${produtoAtual.nome} adicionado à sacola`, 'success');

    } catch (e) {
        console.error('[produto] Erro ao adicionar:', e);
        mostrarToast('Não foi possível adicionar', 'error');
    }
};


/* ---------------------------------------------------------
   🛒 COMPRAR AGORA
   --------------------------------------------------------- */
window.comprarAgoraProduto = function () {

    if (!produtoAtual) return;

    /* Exige tamanho se houver mais de um */
    if (produtoAtual.tamanhos && produtoAtual.tamanhos.length > 1 && !variacaoAtual.tamanho) {
        mostrarToast('Selecione um tamanho antes de continuar', 'warn');
        return;
    }

    /* Delega pra função central em products.js (adiciona + redireciona) */
    if (typeof window.comprarAgora === 'function') {
        window.comprarAgora(produtoAtual.id, variacaoAtual.quantidade);
        return;
    }

    /* Fallback: faz o trabalho manualmente se a função central não existir */
    try {

        const id = produtoAtual.id;
        const qtd = variacaoAtual.quantidade;

        const carrinho = lerCarrinho();
        const existente = carrinho.find(i => i.id === id);

        if (existente) {
            existente.quantidade += qtd;
        } else {
            carrinho.push({
                id: produtoAtual.id,
                nome: produtoAtual.nome,
                preco: produtoAtual.preco,
                imagem: produtoAtual.imagem,
                categoria: produtoAtual.categoria,
                quantidade: qtd
            });
        }

        if (typeof salvarCarrinho === 'function') {
            salvarCarrinho(carrinho);
        } else {
            localStorage.setItem('artefatos_carrinho', JSON.stringify(carrinho));
            window.dispatchEvent(new Event('cartUpdated'));
        }

        window.location.href = 'finalizar.html';

    } catch (e) {
        console.error('[produto] Erro ao comprar agora:', e);
        mostrarToast('Não foi possível ir para o checkout', 'error');
    }
};


/* ---------------------------------------------------------
   ❤️ WISH (página do produto)
   --------------------------------------------------------- */
window.toggleWishProduto = function (btn) {

    if (!produtoAtual) {
        console.warn('[favoritos] Produto não carregado');
        return;
    }

    if (typeof toggleFavorito !== 'function') {
        console.error('[favoritos] toggleFavorito não disponível');
        return;
    }

    var adicionou = toggleFavorito(produtoAtual.id);

    btn.classList.toggle('active', adicionou);
    btn.setAttribute('aria-label', adicionou
        ? 'Remover dos favoritos'
        : 'Adicionar aos favoritos');

    if (adicionou) {
        mostrarToast('Adicionado aos favoritos ♥', 'success');
    } else {
        mostrarToast('Removido dos favoritos', 'info');
    }
};


/* ---------------------------------------------------------
   ZOOM
   --------------------------------------------------------- */
window.abrirZoom = function () {

    const mainImg = document.getElementById('galleryImage');
    const overlay = document.getElementById('zoomOverlay');
    const zoomImg = document.getElementById('zoomImage');

    if (!mainImg || !overlay || !zoomImg) return;

    zoomImg.src = mainImg.src;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
};


window.fecharZoom = function () {

    const overlay = document.getElementById('zoomOverlay');
    if (!overlay) return;

    overlay.classList.remove('open');
    document.body.style.overflow = '';
};


document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharZoom();
});


/* ---------------------------------------------------------
   GUIA DE TAMANHOS
   --------------------------------------------------------- */
window.abrirGuiaTamanhos = function () {

    alert(
        'Guia de tamanhos ARTEFATOS\n\n' +
        'P — Busto 96cm | Cintura 80cm\n' +
        'M — Busto 100cm | Cintura 84cm\n' +
        'G — Busto 106cm | Cintura 90cm\n' +
        'GG — Busto 112cm | Cintura 96cm\n\n' +
        'Para peças oversized, sugerimos manter seu tamanho habitual.'
    );
};


/* ---------------------------------------------------------
   RELACIONADOS
   --------------------------------------------------------- */
function renderizarRelacionados(produto) {

    const grid = document.getElementById('relatedGrid');
    const link = document.getElementById('linkVerTudoCategoria');

    if (!grid) return;

    if (link) link.href = `${produto.categoria}.html`;

    const todos = obterProdutos();

    const relacionados = todos
        .filter(p => p.categoria === produto.categoria && p.id !== produto.id)
        .slice(0, 4);

    if (relacionados.length < 4) {
        const extras = todos
            .filter(p => p.categoria !== produto.categoria && p.id !== produto.id)
            .slice(0, 4 - relacionados.length);
        relacionados.push(...extras);
    }

    if (relacionados.length === 0) {
        const section = grid.closest('.related-products');
        if (section) section.style.display = 'none';
        return;
    }

    if (typeof gerarCardHTML === 'function') {
        grid.innerHTML = relacionados.map(p => gerarCardHTML(p)).join('');
    } else {
        grid.innerHTML = '<p style="color:#a4b2ca;">Relacionados indisponíveis.</p>';
    }
}


/* ---------------------------------------------------------
   NÃO ENCONTRADO
   --------------------------------------------------------- */
function produtoNaoEncontrado() {

    const layout = document.getElementById('productLayout');
    if (!layout) return;

    layout.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:80px 20px;">
            <div style="font-family:'Playfair Display',serif;font-size:5rem;font-style:italic;color:rgba(127,176,255,.28);line-height:1;margin-bottom:20px;">∅</div>
            <h2 style="font-family:'Playfair Display',serif;font-size:2rem;font-style:italic;font-weight:400;color:#f5f7ff;margin:0 0 12px;">Peça não encontrada.</h2>
            <p style="color:#a4b2ca;margin:0 0 30px;">O link que você acessou não corresponde a nenhum produto do catálogo.</p>
            <a href="index.html" class="btn-secondary" style="display:inline-flex;padding:15px 28px;font-size:.72rem;letter-spacing:.28em;text-transform:uppercase;color:#f5f7ff;border:1px solid rgba(127,176,255,.3);text-decoration:none;">Voltar ao início</a>
        </div>
    `;

    document.title = 'Produto não encontrado — ARTEFATOS';
}


/* ---------------------------------------------------------
   TOAST
   --------------------------------------------------------- */
function mostrarToast(mensagem, tipo = 'info') {

    const stack = document.getElementById('toastStack');
    if (!stack) return;

    const icons = {
        success: '<path d="M20 6L9 17l-5-5"/>',
        error:   '<path d="M18 6L6 18M6 6l12 12"/>',
        warn:    '<path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
        info:    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'
    };

    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${icons[tipo] || icons.info}
        </svg>
        <span>${mensagem}</span>
    `;

    stack.appendChild(el);

    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

/* Expõe toast global — o avaliacoes.js usa isso */
window.toast = mostrarToast;


/* ---------------------------------------------------------
   HELPER
   --------------------------------------------------------- */
function capitalizar(str) {
    if (!str) return '';
    return str
        .split('-')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
}