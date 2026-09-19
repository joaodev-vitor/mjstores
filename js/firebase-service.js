/* =========================================================
   FIREBASE-SERVICE.JS — Ponte com o banco de dados
   ========================================================= */

'use strict';

let app, db, auth;

try {

    app  = firebase.initializeApp(firebaseConfig);
    db   = firebase.firestore();
    auth = firebase.auth();

    console.log('[firebase] Conectado:', firebaseConfig.projectId);

} catch (e) {
    console.error('[firebase] Erro ao conectar:', e);
}


/* Cache em memória */
window.__catalogo = [];
window.__config   = {};
window.__pedidos  = [];
window.__firebasePronto = false;


/* ---------------------------------------------------------
   CARREGAR PRODUTOS
   --------------------------------------------------------- */
async function carregarCatalogo() {

    try {

        const snap = await db.collection('products').orderBy('criadoEm', 'desc').get();

        window.__catalogo = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('[firebase] Catálogo:', window.__catalogo.length, 'produtos');

    } catch (e) {

        console.error('[firebase] Erro catálogo:', e);
        window.__catalogo = [];
    }
}


/* ---------------------------------------------------------
   CARREGAR CONFIG
   --------------------------------------------------------- */
async function carregarConfigRemota() {

    try {

        const doc = await db.collection('config').doc('loja').get();

        window.__config = doc.exists ? doc.data() : {};

    } catch (e) {

        console.error('[firebase] Erro config:', e);
        window.__config = {};
    }
}


/* ---------------------------------------------------------
   CARREGAR PEDIDOS (admin)
   --------------------------------------------------------- */
async function carregarPedidosRemotos() {

    try {

        const snap = await db.collection('orders').orderBy('data', 'desc').get();

        window.__pedidos = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            data: doc.data().data?.toDate?.() || doc.data().data
        }));

        console.log('[firebase] Pedidos:', window.__pedidos.length);

        return window.__pedidos;

    } catch (e) {

        console.error('[firebase] Erro pedidos:', e);
        return [];
    }
}


/* ---------------------------------------------------------
   SALVAR PRODUTO
   --------------------------------------------------------- */
async function salvarProdutoFirebase(produto) {

    const dados = { ...produto };

    if (dados.id) {

        const id = dados.id;
        delete dados.id;

        await db.collection('products').doc(id).set(dados, { merge: true });

        return id;

    } else {

        dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp();

        const ref = await db.collection('products').add(dados);

        return ref.id;
    }
}


/* ---------------------------------------------------------
   EXCLUIR PRODUTO
   --------------------------------------------------------- */
async function excluirProdutoFirebase(id) {
    await db.collection('products').doc(id).delete();
    return true;
}


/* ---------------------------------------------------------
   SALVAR PEDIDO
   --------------------------------------------------------- */
async function salvarPedidoFirebase(pedido) {

    const dados = {
        ...pedido,
        data: firebase.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db.collection('orders').add(dados);

    console.log('[firebase] Pedido salvo:', ref.id);

    return ref.id;
}


/* ---------------------------------------------------------
   ATUALIZAR STATUS
   --------------------------------------------------------- */
async function atualizarStatusPedidoFirebase(id, novoStatus) {
    await db.collection('orders').doc(id).update({ status: novoStatus });
    return true;
}


/* ---------------------------------------------------------
   EXCLUIR PEDIDO
   --------------------------------------------------------- */
async function excluirPedidoFirebase(id) {
    await db.collection('orders').doc(id).delete();
    return true;
}


/* ---------------------------------------------------------
   SALVAR CONFIG
   --------------------------------------------------------- */
async function salvarConfigFirebase(config) {

    await db.collection('config').doc('loja').set(config, { merge: true });

    window.__config = { ...window.__config, ...config };

    return true;
}


/* ---------------------------------------------------------
   POPULAR COM CATÁLOGO INICIAL
   --------------------------------------------------------- */
async function popularFirestoreComCatalogo(produtos) {

    const lote = db.batch();

    produtos.forEach(p => {

        const ref = db.collection('products').doc(p.id);

        lote.set(ref, {
            ...p,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
    });

    await lote.commit();

    console.log('[firebase] Populado:', produtos.length, 'produtos');
}


/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
(async function init() {

    try {

        await carregarCatalogo();
        await carregarConfigRemota();

    } catch (e) {
        console.error('[firebase] Erro no init:', e);
    }

    window.__firebasePronto = true;

    window.dispatchEvent(new Event('firebase-ready'));

    console.log('[firebase] Pronto');
})();


/* ---------------------------------------------------------
   EXPÕE
   --------------------------------------------------------- */
window.db   = db;
window.auth = auth;

window.carregarCatalogo               = carregarCatalogo;
window.carregarConfigRemota           = carregarConfigRemota;
window.carregarPedidosRemotos         = carregarPedidosRemotos;
window.salvarProdutoFirebase          = salvarProdutoFirebase;
window.excluirProdutoFirebase         = excluirProdutoFirebase;
window.salvarPedidoFirebase           = salvarPedidoFirebase;
window.atualizarStatusPedidoFirebase  = atualizarStatusPedidoFirebase;
window.excluirPedidoFirebase          = excluirPedidoFirebase;
window.salvarConfigFirebase           = salvarConfigFirebase;
window.popularFirestoreComCatalogo    = popularFirestoreComCatalogo;