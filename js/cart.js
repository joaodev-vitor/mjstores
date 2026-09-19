/* =========================================================
   CART.JS — Sistema de carrinho completo
   localStorage + badge sincronizado em todas as páginas
   ========================================================= */

'use strict';


const CART_KEY = 'artefatos_carrinho';


/* ---------------------------------------------------------
   LER / SALVAR
   --------------------------------------------------------- */
function lerCarrinho() {

    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}


function salvarCarrinho(items) {

    localStorage.setItem(CART_KEY, JSON.stringify(items));

    window.dispatchEvent(new Event('cartUpdated'));
}


/* ---------------------------------------------------------
   ADICIONAR
   --------------------------------------------------------- */
function adicionarAoCarrinho(id) {

    if (!id) return;

    const produtos = (typeof obterProdutos === 'function') ? obterProdutos() : [];
    const produto = produtos.find(p => p.id === id);

    if (!produto) {
        console.warn('Produto não encontrado:', id);
        return;
    }

    if (produto.estoque === false) {
        mostrarToast('Produto esgotado', 'warn');
        return;
    }

    const carrinho = lerCarrinho();
    const existente = carrinho.find(i => i.id === id);

    if (existente) {
        existente.quantidade += 1;
    } else {
        carrinho.push({
            id: produto.id,
            nome: produto.nome,
            preco: produto.preco,
            imagem: produto.imagem,
            categoria: produto.categoria,
            quantidade: 1
        });
    }

    salvarCarrinho(carrinho);

    /* Bump no badge */
    const badge = document.getElementById('cart-count');

    if (badge) {
        badge.classList.add('bump');
        setTimeout(() => badge.classList.remove('bump'), 500);
    }

    mostrarToast(`${produto.nome} adicionado`, 'success');
}


/* ---------------------------------------------------------
   REMOVER
   --------------------------------------------------------- */
function removerDoCarrinho(id) {

    let carrinho = lerCarrinho();
    carrinho = carrinho.filter(i => i.id !== id);

    salvarCarrinho(carrinho);

    if (document.getElementById('cart-items')) {
        renderizarCarrinhoPagina();
    }
}


/* ---------------------------------------------------------
   QUANTIDADE
   --------------------------------------------------------- */
function alterarQuantidade(id, delta) {

    const carrinho = lerCarrinho();
    const item = carrinho.find(i => i.id === id);

    if (!item) return;

    item.quantidade = Math.max(1, item.quantidade + delta);

    salvarCarrinho(carrinho);

    if (document.getElementById('cart-items')) {
        renderizarCarrinhoPagina();
    }
}


/* ---------------------------------------------------------
   LIMPAR
   --------------------------------------------------------- */
function limparCarrinho() {

    if (!confirm('Remover todos os itens da sacola?')) return;

    salvarCarrinho([]);

    if (document.getElementById('cart-items')) {
        renderizarCarrinhoPagina();
    }
}


/* ---------------------------------------------------------
   CONTADOR
   --------------------------------------------------------- */
function atualizarContador() {

    const badge = document.getElementById('cart-count');
    if (!badge) return;

    const carrinho = lerCarrinho();
    const total = carrinho.reduce((s, i) => s + i.quantidade, 0);

    badge.textContent = total;

    if (total === 0) {
        badge.style.display = 'none';
    } else {
        badge.style.display = '';
    }
}


/* ---------------------------------------------------------
   RENDER DA PÁGINA DO CARRINHO
   --------------------------------------------------------- */
function renderizarCarrinhoPagina() {

    const container = document.getElementById('cart-items');
    const empty = document.getElementById('cart-empty');
    const totalEl = document.getElementById('cart-total');
    const totalEl2 = document.getElementById('cart-total-2');
    const label = document.getElementById('cartItemsLabel');

    if (!container) return;

    const carrinho = lerCarrinho();


    /* Empty state */
    if (carrinho.length === 0) {

        container.innerHTML = '';
        container.style.display = 'none';

        if (empty) empty.style.display = 'flex';

        if (totalEl) totalEl.textContent = formatarMoeda(0);
        if (totalEl2) totalEl2.textContent = formatarMoeda(0);
        if (label) label.textContent = '0 peças';

        return;
    }


    if (empty) empty.style.display = 'none';
    container.style.display = 'flex';


    /* Itens */
    container.innerHTML = carrinho.map(item => {

        const subtotal = item.preco * item.quantidade;

        return `
            <article class="cart-item" data-id="${item.id}">

                <div class="cart-item-media">
                    <a href="produto.html?id=${item.id}">
                        <img src="${item.imagem}" alt="${item.nome}" loading="lazy">
                    </a>
                </div>

                <div class="cart-item-info">

                    <span class="cart-item-cat">${item.categoria}</span>

                    <h3 class="cart-item-name">
                        <a href="produto.html?id=${item.id}">${item.nome}</a>
                    </h3>

                    <span class="cart-item-price">
                        ${formatarMoeda(item.preco)} · unidade
                    </span>

                </div>

                <div class="cart-item-actions">

                    <div class="cart-qty">

                        <button
                            type="button"
                            onclick="alterarQuantidade('${item.id}', -1)"
                            aria-label="Diminuir"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <path d="M5 12h14"/>
                            </svg>
                        </button>

                        <span>${item.quantidade}</span>

                        <button
                            type="button"
                            onclick="alterarQuantidade('${item.id}', 1)"
                            aria-label="Aumentar"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <path d="M12 5v14M5 12h14"/>
                            </svg>
                        </button>

                    </div>

                    <strong class="cart-item-subtotal">
                        ${formatarMoeda(subtotal)}
                    </strong>

                    <button
                        class="cart-item-remove"
                        type="button"
                        onclick="removerDoCarrinho('${item.id}')"
                    >
                        Remover
                    </button>

                </div>

            </article>
        `;

    }).join('');


    /* Total */
    const total = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);

    if (totalEl) totalEl.textContent = formatarMoeda(total);
    if (totalEl2) totalEl2.textContent = formatarMoeda(total);


    /* Label "X peças" */
    if (label) {

        const totalItens = carrinho.reduce((s, i) => s + i.quantidade, 0);

        label.textContent = totalItens === 1
            ? '1 peça'
            : `${totalItens} peças`;
    }
}


/* ---------------------------------------------------------
   FINALIZAR
   --------------------------------------------------------- */
function finalizarCompra() {

    const carrinho = lerCarrinho();

    if (carrinho.length === 0) {
        mostrarToast('Sua sacola está vazia', 'warn');
        return;
    }

    window.location.href = 'finalizar.html';
}


/* ---------------------------------------------------------
   UTILITÁRIOS
   --------------------------------------------------------- */
function formatarMoeda(valor) {

    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}


function mostrarToast(mensagem, tipo = 'info') {

    let stack = document.getElementById('toastStack');

    if (!stack) {
        stack = document.createElement('div');
        stack.id = 'toastStack';
        stack.className = 'toast-stack';
        document.body.appendChild(stack);
    }

    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.textContent = mensagem;

    stack.appendChild(el);

    setTimeout(() => {

        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';

        setTimeout(() => el.remove(), 300);

    }, 3000);
}


/* ---------------------------------------------------------
   INICIALIZAÇÃO
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {

    atualizarContador();

    if (document.getElementById('cart-items')) {
        renderizarCarrinhoPagina();
    }

    window.addEventListener('storage', (e) => {

        if (e.key === CART_KEY) {

            atualizarContador();

            if (document.getElementById('cart-items')) {
                renderizarCarrinhoPagina();
            }
        }
    });
});


window.addEventListener('cartUpdated', atualizarContador);


/* ---------------------------------------------------------
   EXPÕE GLOBALMENTE
   --------------------------------------------------------- */
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.removerDoCarrinho = removerDoCarrinho;
window.alterarQuantidade = alterarQuantidade;
window.limparCarrinho = limparCarrinho;
window.finalizarCompra = finalizarCompra;
window.renderizarCarrinhoPagina = renderizarCarrinhoPagina;
window.atualizarContador = atualizarContador;
window.lerCarrinho = lerCarrinho;