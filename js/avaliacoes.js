/* =========================================================
   AVALIACOES.JS — Sistema de avaliações de produto
   ========================================================= */

'use strict';


let produtoAvaliacaoAtual = null;
let notaSelecionada = 0;


/* =========================================================
   CARREGAR AVALIAÇÕES DE UM PRODUTO
   ========================================================= */

async function carregarAvaliacoes(produtoId) {

    const wrap = document.getElementById('reviewsSection');
    if (!wrap) return;

    try {

        const snap = await db.collection('reviews')
            .where('produtoId', '==', produtoId)
            .get();

        const reviews = snap.docs.map(function (doc) {
            const d = doc.data();
            d.id = doc.id;
            d.data = d.data && d.data.toDate ? d.data.toDate() : d.data;
            return d;
        });

        /* Ordena: mais recentes primeiro */
        reviews.sort(function (a, b) {
            return new Date(b.data) - new Date(a.data);
        });

        renderizarResumo(reviews);
        renderizarLista(reviews);

        /* Checa se o usuário logado já avaliou */
        checarAvaliacaoExistente(reviews);

        /* Atualiza nota no header do produto */
        atualizarNotaNoProduto(reviews);

    } catch (err) {
        console.error('[avaliações] Erro ao carregar:', err);
    }
}


/* =========================================================
   RESUMO (média + total)
   ========================================================= */

function renderizarResumo(reviews) {

    const notaEl  = document.getElementById('reviewsNotaMedia');
    const totalEl = document.getElementById('reviewsTotal');
    const starsEl = document.getElementById('reviewsStarsMedia');

    if (!notaEl) return;

    if (reviews.length === 0) {

        notaEl.textContent = '—';
        totalEl.textContent = 'Nenhuma avaliação';
        starsEl.innerHTML = gerarEstrelas(0, 'estrela-media');
        return;
    }

    const soma = reviews.reduce(function (acc, r) {
        return acc + (r.nota || 0);
    }, 0);

    const media = soma / reviews.length;

    notaEl.textContent = media.toFixed(1);
    totalEl.textContent = reviews.length === 1
        ? '1 avaliação'
        : reviews.length + ' avaliações';

    starsEl.innerHTML = gerarEstrelas(media, 'estrela-media');
}


/* =========================================================
   LISTA DE AVALIAÇÕES
   ========================================================= */

function renderizarLista(reviews) {

    const lista = document.getElementById('reviewsList');
    if (!lista) return;

    if (reviews.length === 0) {

        lista.innerHTML =
            '<div class="reviews-empty">' +
                '<div class="reviews-empty-mark">∅</div>' +
                '<p>Seja o primeiro a avaliar este produto.</p>' +
            '</div>';
        return;
    }

    /* UID do usuário logado (ou null) */
    const meuUid = (window.auth && auth.currentUser) ? auth.currentUser.uid : null;

    lista.innerHTML = reviews.map(function (r) {

        const nome = r.userNome || 'Cliente';
        const letra = nome.charAt(0).toUpperCase();

        const data = r.data
            ? new Date(r.data).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric'
              })
            : '';

        /* Mostra botão de excluir só se for a review do próprio usuário */
        const ehMinha = meuUid && r.userUid === meuUid;

        const botaoExcluir = ehMinha
            ? '<button type="button" class="review-delete" ' +
                'onclick="excluirMinhaAvaliacao(\'' + r.id + '\')" ' +
                'title="Excluir minha avaliação" ' +
                'aria-label="Excluir minha avaliação">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                    '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>' +
                    '<path d="M10 11v6M14 11v6"/>' +
                '</svg>' +
              '</button>'
            : '';

        return '<article class="review-card' + (ehMinha ? ' review-card--minha' : '') + '">' +
            '<header class="review-head">' +
                '<div class="review-avatar">' + letra + '</div>' +
                '<div class="review-info">' +
                    '<span class="review-name">' + escapeHtml(nome) + (ehMinha ? ' <em class="review-tag">você</em>' : '') + '</span>' +
                    '<span class="review-date">' + data + '</span>' +
                '</div>' +
                '<div class="estrelas">' + gerarEstrelas(r.nota, '') + '</div>' +
                botaoExcluir +
            '</header>' +
            (r.comentario
                ? '<p class="review-comentario">' + escapeHtml(r.comentario) + '</p>'
                : '') +
        '</article>';
    }).join('');
}


/* =========================================================
   EXCLUIR A PRÓPRIA AVALIAÇÃO (cliente)
   ========================================================= */

async function excluirMinhaAvaliacao(reviewId) {

    if (!window.auth || !auth.currentUser) {
        toast('Você precisa estar logado', 'warn');
        return;
    }

    if (!confirm('Excluir sua avaliação? Essa ação não pode ser desfeita.')) return;

    try {

        /* Confirma que a review pertence ao usuário antes de excluir */
        const doc = await db.collection('reviews').doc(reviewId).get();

        if (!doc.exists) {
            toast('Avaliação não encontrada', 'error');
            return;
        }

        if (doc.data().userUid !== auth.currentUser.uid) {
            toast('Você só pode excluir suas próprias avaliações', 'error');
            return;
        }

        await db.collection('reviews').doc(reviewId).delete();

        toast('Avaliação excluída', 'success');

        /* Recarrega a lista — o form volta a aparecer pro usuário avaliar de novo */
        await carregarAvaliacoes(produtoAvaliacaoAtual);

    } catch (err) {

        console.error('[avaliações] Erro ao excluir:', err);
        toast('Erro ao excluir. Tente novamente.', 'error');
    }
}


/* =========================================================
   GERAR ESTRELAS (HTML)
   ========================================================= */

function gerarEstrelas(nota, extraClass) {

    var html = '';

    for (var i = 1; i <= 5; i++) {

        var cls = 'estrela ' + (extraClass || '');

        if (nota >= i)        cls += ' cheia';
        else if (nota >= i - 0.5) cls += ' meia';

        html += '<svg class="' + cls + '" viewBox="0 0 24 24" fill="currentColor">' +
                    '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>' +
                '</svg>';
    }

    return html;
}


/* =========================================================
   CHECAR SE JÁ AVALIOU
   ========================================================= */

function checarAvaliacaoExistente(reviews) {

    var formWrap = document.getElementById('reviewFormWrap');
    var loginMsg = document.getElementById('reviewLoginMsg');

    if (!formWrap) return;

    /* Não logado → mostra mensagem */
    if (!window.auth || !auth.currentUser) {

        formWrap.style.display = 'none';
        if (loginMsg) {
            loginMsg.style.display = 'block';
            loginMsg.innerHTML = 'Você precisa estar logado pra avaliar. ' +
                '<a href="login.html">Entrar ou criar conta</a>';
        }

        return;
    }

    /* Logado → checa se já avaliou */
    var meuUid = auth.currentUser.uid;

    var jaAvaliou = reviews.some(function (r) {
        return r.userUid === meuUid;
    });

    if (jaAvaliou) {

        formWrap.style.display = 'none';
        if (loginMsg) {

            loginMsg.style.display = 'block';
            loginMsg.innerHTML = 'Você já avaliou este produto. ' +
                'Pra enviar outra, exclua a sua avaliação na lista abaixo.';
        }

    } else {

        formWrap.style.display = 'block';
        if (loginMsg) loginMsg.style.display = 'none';
    }
}


/* =========================================================
   SELECIONAR ESTRELAS
   ========================================================= */

function selecionarNota(nota) {

    notaSelecionada = nota;

    var botoes = document.querySelectorAll('.review-star-pick');

    botoes.forEach(function (btn, idx) {

        if (idx < nota) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}


function hoverNota(nota) {

    var botoes = document.querySelectorAll('.review-star-pick');

    botoes.forEach(function (btn, idx) {

        if (idx < nota) btn.classList.add('hover');
        else btn.classList.remove('hover');
    });
}


function sairHoverNota() {

    var botoes = document.querySelectorAll('.review-star-pick');

    botoes.forEach(function (btn) {
        btn.classList.remove('hover');
    });
}


/* =========================================================
   ENVIAR AVALIAÇÃO
   ========================================================= */

async function enviarAvaliacao(event) {

    if (event) event.preventDefault();

    if (!window.auth || !auth.currentUser) {
        toast('Você precisa estar logado pra avaliar', 'warn');
        return;
    }

    if (notaSelecionada === 0) {
        toast('Escolha uma nota de 1 a 5 estrelas', 'warn');
        return;
    }

    var texto = document.getElementById('reviewTexto').value.trim();
    var botao = document.getElementById('reviewSubmitBtn');

    if (botao) {
        botao.disabled = true;
        botao.textContent = 'Enviando...';
    }

    try {

        await db.collection('reviews').add({
            produtoId:  produtoAvaliacaoAtual,
            userUid:    auth.currentUser.uid,
            userNome:   auth.currentUser.displayName || 'Cliente',
            userEmail:  auth.currentUser.email,
            nota:       notaSelecionada,
            comentario: texto,
            data:       firebase.firestore.FieldValue.serverTimestamp()
        });

        toast('Avaliação enviada. Obrigado!', 'success');

        /* Limpa form */
        document.getElementById('reviewTexto').value = '';
        notaSelecionada = 0;

        /* Esconde o form na hora — o usuário já avaliou */
        var formWrap = document.getElementById('reviewFormWrap');
        var loginMsg = document.getElementById('reviewLoginMsg');

        if (formWrap) formWrap.style.display = 'none';
        if (loginMsg) {
            loginMsg.style.display = 'block';
            loginMsg.innerHTML = 'Você já avaliou este produto. ' +
                'Pra enviar outra, exclua a sua avaliação na lista abaixo.';
        }

        /* Recarrega lista (com try próprio — não deixa travar o form) */
        try {
            await carregarAvaliacoes(produtoAvaliacaoAtual);
        } catch (e) {
            console.warn('[avaliações] Falha ao recarregar lista:', e);
        }

    } catch (err) {

        console.error('[avaliações] Erro ao enviar:', err);
        toast('Erro ao enviar. Tente novamente.', 'error');

    } finally {

        /* Sempre reabilita o botão */
        if (botao) {
            botao.disabled = false;
            botao.textContent = 'Enviar avaliação';
        }
    }
}


/* =========================================================
   ATUALIZAR NOTA NO HEADER DO PRODUTO
   ========================================================= */

function atualizarNotaNoProduto(reviews) {

    var el = document.getElementById('produtoNotaHeader');
    if (!el) return;

    if (reviews.length === 0) {
        el.innerHTML = '';
        return;
    }

    var soma = reviews.reduce(function (acc, r) {
        return acc + (r.nota || 0);
    }, 0);

    var media = soma / reviews.length;

    el.innerHTML =
        '<div class="product-rating">' +
            '<div class="estrelas">' + gerarEstrelas(media, '') + '</div>' +
            '<span class="product-rating-nota">' +
                media.toFixed(1) + ' (' + reviews.length + ')' +
            '</span>' +
        '</div>';
}


/* =========================================================
   HELPER
   ========================================================= */

function escapeHtml(str) {

    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* =========================================================
   INIT — dispara quando o produto carregar
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

    /* Form de avaliação */
    var form = document.getElementById('reviewForm');

    if (form) form.addEventListener('submit', enviarAvaliacao);

    /* Detecta qual produto está na URL (só na produto.html) */
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');

    if (id && document.getElementById('reviewsSection')) {

        produtoAvaliacaoAtual = id;

        /* Espera Firebase + produto estar pronto */
        var tentar = 0;

        var intervalo = setInterval(function () {

            tentar++;

            if (window.__firebasePronto) {

                clearInterval(intervalo);
                carregarAvaliacoes(id);
            }

            if (tentar > 50) {
                clearInterval(intervalo);
                console.warn('[avaliações] Timeout aguardando Firebase');
            }

        }, 100);
    }
});


/* =========================================================
   EXPÕE
   ========================================================= */

window.carregarAvaliacoes     = carregarAvaliacoes;
window.selecionarNota         = selecionarNota;
window.hoverNota              = hoverNota;
window.sairHoverNota          = sairHoverNota;
window.enviarAvaliacao        = enviarAvaliacao;
window.excluirMinhaAvaliacao  = excluirMinhaAvaliacao;