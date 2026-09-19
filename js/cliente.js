/* =========================================================
   CLIENTE.JS — Autenticação, conta, CEP, reembolso e notificações
   v8 — cancelamento sempre abre reembolso + notifica admin
   ========================================================= */

'use strict';


let clienteAtual = null;
let pedidosCliente = [];
let unsubscribePedidosCliente = null;

let pedidoReembolsoAtual = null;

/* 'cancelar' | 'reembolso' */
let modoReembolsoAtual = 'reembolso';

/* Guarda o último status conhecido de cada pedido */
let ultimoStatusPorPedido = {};

/* Pedidos que o cliente escondeu da lista */
let pedidosOcultos = [];


/* =========================================================
   INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {

    var formLogin = document.getElementById('formLogin');
    var formCadastro = document.getElementById('formCadastro');

    if (formLogin) formLogin.addEventListener('submit', fazerLogin);
    if (formCadastro) formCadastro.addEventListener('submit', fazerCadastro);

    var formDados = document.getElementById('formDados');
    var formEndereco = document.getElementById('formEndereco');

    if (formDados) formDados.addEventListener('submit', salvarDados);
    if (formEndereco) formEndereco.addEventListener('submit', salvarEndereco);

    var radios = document.querySelectorAll('input[name="motivoReembolso"]');
    radios.forEach(function (radio) {
        radio.addEventListener('change', verificarMotivoSelecionado);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            var modal = document.getElementById('reembolsoModal');
            if (modal && modal.classList.contains('open')) fecharModalReembolso();
        }
    });

    if (!window.auth) {
        console.warn('[cliente] auth não disponível');
        destravarConta();
        return;
    }

    var failsafe = setTimeout(function () {
        console.warn('[cliente] Failsafe: destravando tela');
        destravarConta();
    }, 4000);

    auth.onAuthStateChanged(function (user) {

        clearTimeout(failsafe);
        clienteAtual = user;

        console.log('[cliente]', user ? 'Logado: ' + user.email : 'Não logado');

        /* Se está na página de login e já autenticou */
        if (user && formLogin) {

            var ehAdmin = user.email === 'mjstores.contato@gmail.com';

            /* Admin tentou logar pela página de cliente → BLOQUEIA */
            if (ehAdmin) {

                console.warn('[cliente] Admin tentou logar pela página de cliente. Bloqueando.');

                auth.signOut().then(function () {

                    var erro = document.getElementById('loginErro');
                    if (erro) {
                        erro.textContent = 'Use o painel administrativo para entrar.';
                    }

                    var botao = formLogin.querySelector('button[type="submit"]');
                    if (botao) {
                        botao.disabled = false;
                        botao.querySelector('span').textContent = 'Entrar';
                    }

                    var campo = document.getElementById('loginSenha');
                    if (campo) campo.value = '';

                    var input = document.getElementById('loginEmail');
                    if (input) input.value = '';

                });

                return;
            }

            /* Cliente normal → vai pra conta dele */
            window.location.href = 'minha-conta.html';
            return;
        }

        var contaWrap = document.getElementById('contaWrap');
        var contaNaoLogado = document.getElementById('contaNaoLogado');
        var contaLoading = document.getElementById('contaLoading');

        if (contaLoading) contaLoading.style.display = 'none';

        if (contaWrap) {
            if (user) {
                contaWrap.style.display = 'block';
                if (contaNaoLogado) contaNaoLogado.style.display = 'none';
                renderizarConta().catch(function (e) {
                    console.error('[cliente] Erro ao renderizar conta:', e);
                });
            } else {
                contaWrap.style.display = 'none';
                if (contaNaoLogado) contaNaoLogado.style.display = 'flex';
            }
        }
    });

    setTimeout(atualizarBotaoNotificacoes, 500);
});


function destravarConta() {
    var contaLoading = document.getElementById('contaLoading');
    var contaWrap = document.getElementById('contaWrap');
    var contaNaoLogado = document.getElementById('contaNaoLogado');

    if (contaLoading) contaLoading.style.display = 'none';

    if (contaWrap && contaWrap.style.display !== 'block') {
        if (contaNaoLogado) contaNaoLogado.style.display = 'flex';
    }
}


/* =========================================================
   LOGIN
   ========================================================= */
async function fazerLogin(e) {

    e.preventDefault();

    var email = document.getElementById('loginEmail').value.trim();
    var senha = document.getElementById('loginSenha').value;
    var erro = document.getElementById('loginErro');
    var botao = e.target.querySelector('button[type="submit"]');

    if (!email || !senha) return;

    if (email.toLowerCase() === 'mjstores.contato@gmail.com') {
        if (erro) erro.textContent = 'Use o painel administrativo para entrar.';
        return;
    }

    if (erro) erro.textContent = '';
    if (botao) {
        botao.disabled = true;
        botao.querySelector('span').textContent = 'Entrando...';
    }

    try {
        await auth.signInWithEmailAndPassword(email, senha);
    } catch (err) {
        console.error(err);

        if (erro) {
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                erro.textContent = 'E-mail ou senha incorretos.';
            } else if (err.code === 'auth/user-not-found') {
                erro.textContent = 'Não encontramos uma conta com esse e-mail.';
            } else if (err.code === 'auth/too-many-requests') {
                erro.textContent = 'Muitas tentativas. Aguarde alguns minutos.';
            } else if (err.code === 'auth/invalid-email') {
                erro.textContent = 'E-mail inválido.';
            } else {
                erro.textContent = 'Erro ao entrar. Tente novamente.';
            }
        }

        if (botao) {
            botao.disabled = false;
            botao.querySelector('span').textContent = 'Entrar';
        }
    }
}


/* =========================================================
   CADASTRO
   ========================================================= */
async function fazerCadastro(e) {

    e.preventDefault();

    var nome = document.getElementById('cadNome').value.trim();
    var email = document.getElementById('cadEmail').value.trim();
    var telefone = document.getElementById('cadTelefone').value.trim();
    var senha = document.getElementById('cadSenha').value;
    var senha2 = document.getElementById('cadSenha2').value;
    var erro = document.getElementById('cadErro');
    var botao = e.target.querySelector('button[type="submit"]');

    if (erro) erro.textContent = '';

    if (email.toLowerCase() === 'mjstores.contato@gmail.com') {
        if (erro) erro.textContent = 'Esse e-mail é reservado.';
        return;
    }

    if (senha.length < 6) {
        if (erro) erro.textContent = 'A senha precisa ter pelo menos 6 caracteres.';
        return;
    }

    if (senha !== senha2) {
        if (erro) erro.textContent = 'As senhas não batem.';
        return;
    }

    if (botao) {
        botao.disabled = true;
        botao.querySelector('span').textContent = 'Criando conta...';
    }

    try {
        var cred = await auth.createUserWithEmailAndPassword(email, senha);
        await cred.user.updateProfile({ displayName: nome });

        await db.collection('clientes').doc(cred.user.uid).set({
            nome: nome,
            email: email.toLowerCase(),
            telefone: telefone,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            enderecos: [],
            pedidosOcultos: []
        });

        toast('Conta criada com sucesso!', 'success');

    } catch (err) {
        console.error(err);

        if (erro) {
            if (err.code === 'auth/email-already-in-use') {
                erro.textContent = 'Esse e-mail já tem uma conta. Tente entrar.';
            } else if (err.code === 'auth/invalid-email') {
                erro.textContent = 'E-mail inválido.';
            } else if (err.code === 'auth/weak-password') {
                erro.textContent = 'Senha muito fraca. Use pelo menos 6 caracteres.';
            } else {
                erro.textContent = 'Erro ao criar conta. Tente novamente.';
            }
        }

        if (botao) {
            botao.disabled = false;
            botao.querySelector('span').textContent = 'Criar minha conta';
        }
    }
}


/* =========================================================
   TROCAR ABA (login/cadastro)
   ========================================================= */
function trocarAba(aba, botao) {

    document.querySelectorAll('.auth-tab').forEach(function (b) {
        b.classList.remove('active');
    });

    botao.classList.add('active');

    var formLogin = document.getElementById('formLogin');
    var formCadastro = document.getElementById('formCadastro');

    if (aba === 'login') {
        formLogin.style.display = 'flex';
        formCadastro.style.display = 'none';
    } else {
        formLogin.style.display = 'none';
        formCadastro.style.display = 'flex';
    }
}


/* =========================================================
   RECUPERAR SENHA
   ========================================================= */
async function recuperarSenha() {

    var email = document.getElementById('loginEmail').value.trim();

    if (!email) {
        toast('Digite seu e-mail primeiro', 'warn');
        return;
    }

    if (email.toLowerCase() === 'mjstores.contato@gmail.com') {
        toast('Esse e-mail é reservado.', 'warn');
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        toast('Enviamos um link de recuperação pro seu e-mail.', 'success');
    } catch (err) {
        console.error(err);
        toast('Erro ao enviar e-mail. Confira o endereço.', 'error');
    }
}


/* =========================================================
   LOGOUT
   ========================================================= */
async function fazerLogoutCliente() {

    if (!confirm('Deseja sair da sua conta?')) return;

    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (err) {
        console.error(err);
        toast('Erro ao sair', 'error');
    }
}


/* =========================================================
   RENDERIZAR CONTA
   ========================================================= */
async function renderizarConta() {

    if (!clienteAtual) return;

    var nome = clienteAtual.displayName || 'cliente';

    var elNome = document.getElementById('contaNome');
    var elEmail = document.getElementById('contaEmail');

    if (elNome) elNome.textContent = nome.split(' ')[0] + '.';
    if (elEmail) elEmail.textContent = clienteAtual.email;

    try {
        await carregarDadosCliente();
    } catch (e) {
        console.warn('[cliente] Falha ao carregar dados:', e);
    }

    escutarPedidosCliente();
}


async function carregarDadosCliente() {

    try {
        var doc = await db.collection('clientes').doc(clienteAtual.uid).get();

        if (doc.exists) {
            var dados = doc.data();

            var inputNome = document.getElementById('dadosNome');
            var inputTelefone = document.getElementById('dadosTelefone');
            var inputEmail = document.getElementById('dadosEmail');

            if (inputNome) inputNome.value = dados.nome || '';
            if (inputTelefone) inputTelefone.value = dados.telefone || '';
            if (inputEmail) inputEmail.value = clienteAtual.email;

            window.__enderecosCliente = dados.enderecos || [];
            pedidosOcultos = dados.pedidosOcultos || [];

            renderizarEnderecos();

        } else {
            try {
                await db.collection('clientes').doc(clienteAtual.uid).set({
                    nome: clienteAtual.displayName || '',
                    email: clienteAtual.email,
                    telefone: '',
                    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
                    enderecos: [],
                    pedidosOcultos: []
                });
            } catch (e) {
                console.warn('[cliente] Não deu pra criar doc cliente:', e);
            }
            window.__enderecosCliente = [];
            pedidosOcultos = [];
            renderizarEnderecos();
        }

    } catch (err) {
        console.error('[cliente] Erro ao carregar dados:', err);
    }
}


/* =========================================================
   PEDIDOS DO CLIENTE — TEMPO REAL
   ========================================================= */
function escutarPedidosCliente() {

    var lista = document.getElementById('pedidosList');
    if (!lista || !clienteAtual) return;

    if (unsubscribePedidosCliente) {
        try { unsubscribePedidosCliente(); } catch (e) {}
        unsubscribePedidosCliente = null;
    }

    lista.innerHTML = '<div style="padding:40px;text-align:center;color:#a4b2ca;">Carregando pedidos...</div>';

    var email = (clienteAtual.email || '').toLowerCase();
    var uid = clienteAtual.uid;

    var pedidosUid = [];
    var pedidosEmail = [];

    var unsubUid = null;
    var unsubEmail = null;

    function mesclarERenderizar() {

        var map = {};

        pedidosUid.forEach(function (p) { map[p.id] = p; });
        pedidosEmail.forEach(function (p) { map[p.id] = p; });

        pedidosCliente = Object.keys(map).map(function (k) { return map[k]; });

        pedidosCliente.sort(function (a, b) {
            return new Date(b.data || 0) - new Date(a.data || 0);
        });

        verificarMudancasDeStatus();

        var badge = document.getElementById('contaBadgePedidos');
        if (badge) badge.textContent = contarPedidosVisiveis();

        renderizarPedidosCliente();
    }

    try {
        unsubUid = db.collection('orders')
            .where('userUid', '==', uid)
            .onSnapshot(function (snapshot) {

                pedidosUid = snapshot.docs.map(function (doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    d.data = d.data && d.data.toDate ? d.data.toDate() : (d.data || null);
                    return d;
                });

                mesclarERenderizar();

            }, function (err) {
                console.warn('[cliente] Listener UID falhou:', err);
            });
    } catch (e) {
        console.warn('[cliente] Não deu pra criar listener UID:', e);
    }

    try {
        unsubEmail = db.collection('orders')
            .where('cliente.email', '==', email)
            .onSnapshot(function (snapshot) {

                pedidosEmail = snapshot.docs.map(function (doc) {
                    var d = doc.data();
                    d.id = doc.id;
                    d.data = d.data && d.data.toDate ? d.data.toDate() : (d.data || null);
                    return d;
                });

                mesclarERenderizar();

            }, function (err) {
                console.warn('[cliente] Listener email falhou:', err);
                carregarPedidosClienteUmaVez();
            });
    } catch (e) {
        console.warn('[cliente] Não deu pra criar listener email:', e);
        carregarPedidosClienteUmaVez();
    }

    unsubscribePedidosCliente = function () {
        try { if (unsubUid)   unsubUid(); } catch (e) {}
        try { if (unsubEmail) unsubEmail(); } catch (e) {}
    };
}


/* =========================================================
   FALLBACK
   ========================================================= */
async function carregarPedidosClienteUmaVez() {

    var lista = document.getElementById('pedidosList');
    if (!lista || !clienteAtual) return;

    var email = (clienteAtual.email || '').toLowerCase();
    var uid = clienteAtual.uid;

    var map = {};

    try {
        var snapUid = await db.collection('orders').where('userUid', '==', uid).get();
        snapUid.docs.forEach(function (doc) {
            var d = doc.data();
            d.id = doc.id;
            d.data = d.data && d.data.toDate ? d.data.toDate() : (d.data || null);
            map[d.id] = d;
        });
    } catch (e) {
        console.warn('[cliente] Busca por UID falhou:', e);
    }

    try {
        var snapEmail = await db.collection('orders').where('cliente.email', '==', email).get();
        snapEmail.docs.forEach(function (doc) {
            var d = doc.data();
            d.id = doc.id;
            d.data = d.data && d.data.toDate ? d.data.toDate() : (d.data || null);
            map[d.id] = d;
        });
    } catch (e) {
        console.warn('[cliente] Busca por email falhou:', e);
    }

    pedidosCliente = Object.keys(map).map(function (k) { return map[k]; });

    pedidosCliente.sort(function (a, b) {
        return new Date(b.data || 0) - new Date(a.data || 0);
    });

    var badge = document.getElementById('contaBadgePedidos');
    if (badge) badge.textContent = contarPedidosVisiveis();

    renderizarPedidosCliente();
}


/* =========================================================
   🔔 NOTIFICAÇÕES
   ========================================================= */

var NOTIFICACOES_STATUS = {
    'pago':       { emoji: '💰', titulo: 'Pagamento confirmado',  texto: 'Seu pagamento foi aprovado!' },
    'preparando': { emoji: '📦', titulo: 'Preparando o envio',    texto: 'Seu pedido está sendo embalado.' },
    'enviado':    { emoji: '🚚', titulo: 'Saiu para entrega',     texto: 'Seu pedido está a caminho!' },
    'entregue':   { emoji: '✅', titulo: 'Pedido entregue',       texto: 'Seu pedido chegou! Aproveite.' },
    'cancelado':  { emoji: '⚠️', titulo: 'Pedido cancelado',      texto: 'Seu pedido foi cancelado.' }
};


async function ativarNotificacoes() {

    if (!('Notification' in window)) {
        toast('Seu navegador não suporta notificações', 'warn');
        return;
    }

    try {
        var permissao = await Notification.requestPermission();

        if (permissao === 'granted') {
            toast('Notificações ativadas! 🔔', 'success');
            mostrarNotificacao('🔔 Notificações ativas', 'Você vai receber um aviso a cada atualização do seu pedido.');
        } else if (permissao === 'denied') {
            toast('Permissão negada. Ative nas configurações do navegador.', 'warn');
        } else {
            toast('Permissão não concedida.', 'warn');
        }

        atualizarBotaoNotificacoes();

    } catch (e) {
        console.error('[notif] Erro:', e);
        toast('Erro ao ativar notificações', 'error');
    }
}


function mostrarNotificacao(titulo, texto) {

    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
        var n = new Notification(titulo, {
            body: texto,
            tag: 'mj-pedido',
            requireInteraction: false,
            silent: false
        });

        n.onclick = function () {
            window.focus();
            n.close();
        };

        tocarSomNotificacao();

    } catch (e) {
        console.error('[notif] Erro ao mostrar:', e);
    }
}


function tocarSomNotificacao() {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.15].forEach(function (delay, i) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = i === 0 ? 880 : 1100;
            var t = ctx.currentTime + delay;
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
            osc.start(t);
            osc.stop(t + 0.15);
        });
    } catch (e) {}
}


function verificarMudancasDeStatus() {

    if (Object.keys(ultimoStatusPorPedido).length === 0) {
        pedidosCliente.forEach(function (p) {
            ultimoStatusPorPedido[p.id] = p.status;
        });
        return;
    }

    pedidosCliente.forEach(function (p) {

        var anterior = ultimoStatusPorPedido[p.id];
        var atual = p.status;

        if (anterior && anterior !== atual) {

            var info = NOTIFICACOES_STATUS[atual];

            if (info) {
                mostrarNotificacao(
                    info.emoji + ' ' + info.titulo + ' — Pedido #' + (p.numero || ''),
                    info.texto
                );
                toast(info.emoji + ' Pedido #' + (p.numero || '') + ' — ' + info.titulo, 'success');
            }
        }

        ultimoStatusPorPedido[p.id] = atual;
    });
}


function atualizarBotaoNotificacoes() {

    var btn = document.getElementById('btnNotificacoes');
    var alvos = [btn].filter(Boolean);

    if (!('Notification' in window)) {
        alvos.forEach(function (b) { b.style.display = 'none'; });
        return;
    }

    alvos.forEach(function (b) {
        if (Notification.permission === 'granted') {
            b.classList.add('ativo');
            b.innerHTML = '🔔 Notificações ativas';
            b.disabled = true;
        } else if (Notification.permission === 'denied') {
            b.classList.remove('ativo');
            b.innerHTML = '🔕 Notificações bloqueadas';
            b.disabled = true;
        } else {
            b.classList.remove('ativo');
            b.innerHTML = '🔔 Ativar';
            b.disabled = false;
        }
    });
}


/* =========================================================
   FILTROS DE PEDIDOS
   ========================================================= */

window.filtroPedidosAtual = 'todos';

function filtrarPedidos(tipo, botao) {

    window.filtroPedidosAtual = tipo;

    document.querySelectorAll('.pedido-filtro').forEach(function (b) {
        b.classList.remove('active');
    });
    if (botao) botao.classList.add('active');

    renderizarPedidosCliente();
}


function categoriaDoPedido(p) {
    var s = p.status || 'processando';
    if (s === 'cancelado') return 'cancelados';
    if (s === 'entregue') return 'entregues';
    return 'andamento';
}


function atualizarContadoresFiltros() {

    var todos = pedidosCliente.filter(function (p) { return !pedidoOculto(p); });

    var andamento = todos.filter(function (p) { return categoriaDoPedido(p) === 'andamento'; }).length;
    var entregues = todos.filter(function (p) { return categoriaDoPedido(p) === 'entregues'; }).length;
    var cancelados = todos.filter(function (p) { return categoriaDoPedido(p) === 'cancelados'; }).length;

    var elTodos = document.getElementById('countTodos');
    var elAnd = document.getElementById('countAndamento');
    var elEnt = document.getElementById('countEntregues');
    var elCan = document.getElementById('countCancelados');

    if (elTodos) elTodos.textContent = todos.length;
    if (elAnd) elAnd.textContent = andamento;
    if (elEnt) elEnt.textContent = entregues;
    if (elCan) elCan.textContent = cancelados;
}


function gerarTimeline(p) {

    var s = p.status || 'processando';

    if (s === 'cancelado') return '';

    var etapaAtual = {
        'aguardando_pagamento': 1,
        'processando': 1,
        'pago': 2,
        'preparando': 2,
        'enviado': 3,
        'entregue': 4
    }[s] || 1;

    var etapas = [
        { label: 'Pedido feito', icone: '<path d="M20 6L9 17l-5-5"/>' },
        { label: 'Preparando', icone: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>' },
        { label: 'Em rota', icone: '<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' },
        { label: 'Entregue', icone: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>' }
    ];

    var html = '<div class="pedido-timeline">';

    for (var i = 0; i < etapas.length; i++) {

        var etapa = etapas[i];
        var passo = i + 1;

        var cls = 'timeline-passo';
        if (passo < etapaAtual) cls += ' completo';
        if (passo === etapaAtual) cls += ' completo atual';
        if (etapaAtual >= 4 && passo <= 4) cls += ' completo';

        html += '<div class="' + cls + '">';
        html += '<div class="timeline-icone">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + etapa.icone + '</svg>';
        html += '</div>';
        html += '<span class="timeline-label">' + etapa.label + '</span>';
        html += '</div>';
    }

    html += '</div>';

    return html;
}


/* =========================================================
   RENDERIZAÇÃO DE PEDIDOS
   ========================================================= */

function renderizarPedidosCliente() {

    var lista = document.getElementById('pedidosList');
    if (!lista) return;

    atualizarContadoresFiltros();

    if (clienteAtual) {
        var avatar = document.getElementById('contaAvatarHero');
        var nome = clienteAtual.displayName || 'C';
        if (avatar) avatar.textContent = nome.charAt(0).toUpperCase();

        var notifEmail = document.getElementById('notifEmailCliente');
        if (notifEmail) notifEmail.textContent = clienteAtual.email;
    }

    var badgeFav = document.getElementById('contaBadgeFavoritos');
    if (badgeFav) {
        try {
            var favs = JSON.parse(
                localStorage.getItem('artefatos_favoritos')
                || localStorage.getItem('miqjo_favoritos')
                || '[]'
            );
            badgeFav.textContent = favs.length;
        } catch (e) {}
    }

    var badgeCart = document.getElementById('contaBadgeCarrinho');
    if (badgeCart) {
        try {
            var cart = (typeof lerCarrinho === 'function') ? lerCarrinho() : [];
            badgeCart.textContent = cart.reduce(function (s, i) { return s + (i.quantidade || 1); }, 0);
        } catch (e) {}
    }

    var visiveis = pedidosCliente.filter(function (p) { return !pedidoOculto(p); });

    var filtro = window.filtroPedidosAtual || 'todos';
    if (filtro !== 'todos') {
        visiveis = visiveis.filter(function (p) {
            return categoriaDoPedido(p) === filtro;
        });
    }

    if (visiveis.length === 0) {

        var msg = filtro === 'todos'
            ? 'Você ainda não tem pedidos.'
            : 'Nenhum pedido nessa categoria.';

        lista.innerHTML =
            '<div class="pedidos-empty">' +
                '<div class="pedidos-empty-mark">∅</div>' +
                '<h3>Nada por aqui</h3>' +
                '<p>' + msg + '</p>' +
                '<a href="index.html" class="btn-primary">Explorar coleção</a>' +
            '</div>';
        return;
    }

    lista.innerHTML = visiveis.map(function (p) {
        return renderizarPedido(p);
    }).join('');
}


var STATUS_PEDIDO = {
    'aguardando_pagamento': { label: 'Aguardando pagamento', cls: 'warn' },
    'processando':          { label: 'Processando', cls: 'info' },
    'pago':                 { label: 'Pagamento confirmado', cls: 'info' },
    'preparando':           { label: 'Preparando o pedido', cls: 'info' },
    'enviado':              { label: 'Em rota de entrega', cls: 'info' },
    'entregue':             { label: 'Entregue', cls: 'success' },
    'cancelado':            { label: 'Cancelado', cls: 'danger' }
};

var STATUS_PAGOS = ['pago', 'preparando', 'enviado', 'entregue'];

var STATUS_CANCELAVEIS = ['aguardando_pagamento', 'processando', 'pago', 'preparando', 'enviado'];


function renderizarPedido(p) {

    var data = p.data ? new Date(p.data).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric'
    }) : '—';

    var status = p.status || 'processando';
    var info = STATUS_PEDIDO[status] || { label: status, cls: 'info' };

    var itens = p.itens || [];
    var ehCancelado = status === 'cancelado';

    var statusReembolso = (p.reembolso && p.reembolso.status) ? p.reembolso.status : null;
    var temReembolso = !!statusReembolso;

    var podeCancelar = STATUS_CANCELAVEIS.indexOf(status) !== -1 && !temReembolso;

    var podeReembolsar = false;
    if (statusReembolso === 'negado') {
        podeReembolsar = true;
    } else if (!temReembolso && status === 'entregue') {
        podeReembolsar = true;
    }

    var podeRemover = ehCancelado || status === 'entregue';

    var cardClass = 'pedido-card' + (ehCancelado ? ' pedido-card--cancelado' : '');

    var timelineHTML = gerarTimeline(p);

    var avisoReembolso = '';

    if (temReembolso) {
        var infoReemb = {
            'pendente': { label: 'Reembolso solicitado', desc: 'Aguardando análise da nossa equipe.', cls: 'info' },
            'aprovado': { label: 'Reembolso aprovado', desc: 'Devolução em até 5 dias úteis.', cls: 'success' },
            'pago':     { label: 'Reembolso pago', desc: 'Valor já devolvido pra sua conta.', cls: 'success' },
            'negado':   { label: 'Reembolso negado', desc: 'Entre em contato pra entender melhor.', cls: 'danger' }
        }[statusReembolso] || { label: 'Em análise', desc: '', cls: 'info' };

        avisoReembolso =
            '<div class="pedido-aviso pedido-aviso--' + infoReemb.cls + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                    '<circle cx="12" cy="12" r="10"/>' +
                    '<path d="M12 8v4M12 16h.01"/>' +
                '</svg>' +
                '<div>' +
                    '<strong>' + infoReemb.label + '</strong>' +
                    '<small>' + infoReemb.desc + '</small>' +
                '</div>' +
            '</div>';
    }

    var avisoCancelar = '';

    if (podeCancelar) {

        var descCancelar = 'Vamos cancelar o pedido e abrir a solicitação de reembolso automaticamente. Nossa equipe vai analisar em até 3 dias úteis.';

        avisoCancelar =
            '<div class="pedido-aviso pedido-aviso--info">' +
                '<div>' +
                    '<strong>Quer cancelar este pedido?</strong>' +
                    '<small>' + descCancelar + '</small>' +
                '</div>' +
                '<button class="btn-cancelar" onclick="cancelarPedidoCliente(\'' + p.id + '\')">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>' +
                    '</svg>' +
                    'Cancelar e reembolsar' +
                '</button>' +
            '</div>';
    }

    var avisoReembolsar = '';

    if (podeReembolsar) {

        var textoDesc = (statusReembolso === 'negado')
            ? 'Seu reembolso foi negado. Você pode solicitar novamente com outro motivo.'
            : 'Algo deu errado com o produto? Escolha o motivo e solicite o reembolso.';

        avisoReembolsar =
            '<div class="pedido-aviso pedido-aviso--danger">' +
                '<div>' +
                    '<strong>Solicitar reembolso</strong>' +
                    '<small>' + textoDesc + '</small>' +
                '</div>' +
                '<button class="btn-reembolso" onclick="abrirModalReembolso(\'' + p.id + '\', null, \'reembolso\')">' +
                    'Solicitar' +
                '</button>' +
            '</div>';
    }

    var botaoRemover = '';

    if (podeRemover) {
        botaoRemover =
            '<button class="pedido-remover" onclick="removerPedidoDaLista(\'' + p.id + '\')" title="Remover da minha lista">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
                    '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>' +
                '</svg>' +
            '</button>';
    }

    return '<article class="' + cardClass + '">' +

        botaoRemover +

        '<header class="pedido-head">' +
            '<div>' +
                '<span class="pedido-num">#' + (p.numero || '—') + '</span>' +
                '<span class="pedido-data">' + data + '</span>' +
            '</div>' +
            '<span class="pedido-status pedido-status--' + info.cls + '">' + info.label + '</span>' +
        '</header>' +

        timelineHTML +

        '<div class="pedido-itens">' +
            itens.slice(0, 4).map(function (item) {
                return '<div class="pedido-item">' +
                    '<img src="' + (item.imagem || '') + '" alt="' + (item.nome || '') + '">' +
                    '<div>' +
                        '<strong>' + (item.nome || 'Produto') + '</strong>' +
                        '<small>' + (item.quantidade || 1) + 'x · R$ ' + Number(item.preco || 0).toFixed(2).replace('.', ',') + '</small>' +
                    '</div>' +
                '</div>';
            }).join('') +
            (itens.length > 4 ? '<p class="pedido-mais">+ ' + (itens.length - 4) + ' peças</p>' : '') +
        '</div>' +

        avisoCancelar +
        avisoReembolsar +
        avisoReembolso +

        '<footer class="pedido-foot">' +
            '<span>Total</span>' +
            '<strong>R$ ' + Number(p.total || 0).toFixed(2).replace('.', ',') + '</strong>' +
        '</footer>' +

    '</article>';
}


/* =========================================================
   REMOVER PEDIDO DA LISTA
   ========================================================= */
async function removerPedidoDaLista(pedidoId) {

    if (!clienteAtual) {
        toast('Você precisa estar logado', 'warn');
        return;
    }

    if (!confirm('Remover este pedido da sua lista?\n\nEle continuará salvo no nosso sistema, apenas não vai mais aparecer aqui pra você.')) {
        return;
    }

    if (pedidosOcultos.indexOf(pedidoId) === -1) {
        pedidosOcultos.push(pedidoId);
    }

    try {
        await db.collection('clientes').doc(clienteAtual.uid).update({
            pedidosOcultos: pedidosOcultos
        });

        toast('Pedido removido da lista', 'success');

        var badge = document.getElementById('contaBadgePedidos');
        if (badge) badge.textContent = contarPedidosVisiveis();

        renderizarPedidosCliente();

    } catch (err) {
        console.error('[cliente] Erro ao remover pedido:', err);
        toast('Erro ao remover', 'error');
        pedidosOcultos = pedidosOcultos.filter(function (id) { return id !== pedidoId; });
    }
}


function pedidoOculto(p) {
    return pedidosOcultos.indexOf(p.id) !== -1;
}


function contarPedidosVisiveis() {
    return pedidosCliente.filter(function (p) {
        return !pedidoOculto(p);
    }).length;
}


/* =========================================================
   CANCELAR PEDIDO
   ========================================================= */
function cancelarPedidoCliente(pedidoId) {
    abrirModalReembolso(pedidoId, null, 'cancelar');
}


/* =========================================================
   MODAL UNIFICADO
   ========================================================= */
function abrirModalReembolso(pedidoId, motivoPreSelecionado, modo) {

    if (!clienteAtual) {
        toast('Você precisa estar logado', 'warn');
        return;
    }

    var pedido = pedidosCliente.find(function (p) { return p.id === pedidoId; });

    if (!pedido) {
        toast('Pedido não encontrado', 'error');
        return;
    }

    pedidoReembolsoAtual = pedido;
    modoReembolsoAtual = modo || 'reembolso';

    var elNum = document.getElementById('reembolsoNumeroPedido');
    var elVal = document.getElementById('reembolsoValorPedido');

    if (elNum) elNum.textContent = '#' + (pedido.numero || '0000');
    if (elVal) elVal.textContent = 'R$ ' + Number(pedido.total || 0).toFixed(2).replace('.', ',');

    var modal = document.getElementById('reembolsoModal');
    var kicker = modal ? modal.querySelector('.reembolso-kicker') : null;
    var titulo = modal ? modal.querySelector('.reembolso-head h2') : null;
    var btn = document.getElementById('reembolsoConfirmarBtn');

    if (modoReembolsoAtual === 'cancelar') {

        if (kicker) {
            kicker.innerHTML = '<span>—</span> CANCELAR PEDIDO';
        }
        if (titulo) {
            titulo.innerHTML = 'Por que está <em>cancelando?</em>';
        }
        if (btn) {
            btn.textContent = 'Cancelar e solicitar reembolso';
            btn.disabled = true;
        }

    } else {

        if (kicker) {
            kicker.innerHTML = '<span>—</span> SOLICITAR REEMBOLSO';
        }
        if (titulo) {
            titulo.innerHTML = 'Qual o motivo <em>do reembolso?</em>';
        }
        if (btn) {
            btn.textContent = 'Enviar solicitação';
            btn.disabled = true;
        }
    }

    var radios = document.querySelectorAll('input[name="motivoReembolso"]');
    radios.forEach(function (r) { r.checked = false; });

    if (motivoPreSelecionado) {
        radios.forEach(function (r) {
            if (r.value === motivoPreSelecionado) {
                r.checked = true;
            }
        });
    }

    var detalhes = document.getElementById('reembolsoDetalhes');
    if (detalhes) detalhes.value = '';

    var hint = document.getElementById('reembolsoHint');
    if (hint) {
        hint.textContent = 'Escolha um motivo acima pra continuar.';
        hint.className = 'reembolso-hint';
    }

    if (motivoPreSelecionado) {
        verificarMotivoSelecionado();
    }

    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}


function fecharModalReembolso() {

    var modal = document.getElementById('reembolsoModal');
    if (modal) modal.classList.remove('open');

    document.body.style.overflow = '';
    pedidoReembolsoAtual = null;
    modoReembolsoAtual = 'reembolso';
}


function verificarMotivoSelecionado() {

    var selecionado = document.querySelector('input[name="motivoReembolso"]:checked');

    var btn = document.getElementById('reembolsoConfirmarBtn');
    var hint = document.getElementById('reembolsoHint');

    if (selecionado) {
        if (btn) btn.disabled = false;
        if (hint) {
            hint.textContent = 'Motivo selecionado: ' + selecionado.value;
            hint.className = 'reembolso-hint ok';
        }
    } else {
        if (btn) btn.disabled = true;
        if (hint) {
            hint.textContent = 'Escolha um motivo acima pra continuar.';
            hint.className = 'reembolso-hint';
        }
    }
}


/* =========================================================
   CONFIRMAR — cancela + cria reembolso + notifica admin
   ========================================================= */
async function confirmarReembolso() {

    if (!clienteAtual || !pedidoReembolsoAtual) return;

    var selecionado = document.querySelector('input[name="motivoReembolso"]:checked');

    if (!selecionado) {
        toast('Escolha um motivo', 'warn');
        return;
    }

    var pedido = pedidoReembolsoAtual;
    var motivo = selecionado.value;
    var detalhes = (document.getElementById('reembolsoDetalhes')?.value || '').trim();

    var jaFoiPago = STATUS_PAGOS.indexOf(pedido.status || '') !== -1;

    var btn = document.getElementById('reembolsoConfirmarBtn');
    var textoOriginal = btn ? btn.textContent : '';

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processando...';
    }

    try {

        var refundData = {
            orderId: pedido.id,
            orderNumero: pedido.numero,
            cliente: {
                nome: (pedido.cliente && pedido.cliente.nome) || '',
                email: (pedido.cliente && pedido.cliente.email) || clienteAtual.email,
                telefone: (pedido.cliente && pedido.cliente.telefone) || ''
            },
            valor: pedido.total || 0,
            itens: pedido.itens || [],
            pagamento: pedido.pagamento || '',
            motivo: motivo,
            detalhes: detalhes,
            status: 'pendente',
            pedidoPago: jaFoiPago,
            data: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (modoReembolsoAtual === 'cancelar') {

            /* 1) Cancela o pedido */
            await db.collection('orders').doc(pedido.id).update({
                status: 'cancelado',
                canceladoPor: 'cliente',
                motivoCancelamento: motivo,
                canceladoEm: firebase.firestore.FieldValue.serverTimestamp()
            });

            refundData.origem = 'cancelamento';
            refundData.detalhes = detalhes || (jaFoiPago
                ? 'Cliente cancelou o pedido já pago.'
                : 'Cliente cancelou o pedido antes da confirmação de pagamento.');

            /* 2) Cria o reembolso */
            var refundRef = await db.collection('refunds').add(refundData);

            /* 3) Marca o reembolso dentro do pedido */
            await db.collection('orders').doc(pedido.id).update({
                'reembolso.status': 'pendente',
                'reembolso.motivo': motivo,
                'reembolso.detalhes': refundData.detalhes,
                'reembolso.data': firebase.firestore.FieldValue.serverTimestamp(),
                'reembolso.origem': 'cancelamento',
                'reembolso.pedidoPago': jaFoiPago
            });

            /* 4) Notifica o cliente */
            if (typeof enviarEmailReembolso === 'function') {
                enviarEmailReembolso({
                    ...refundData,
                    id: refundRef.id
                }, 'pendente').catch(function (e) {
                    console.warn('[cliente] Erro e-mail cliente:', e);
                });
            }

            /* 5) Notifica o ADMIN */
            if (typeof enviarEmailAdminReembolso === 'function') {
                enviarEmailAdminReembolso({
                    ...refundData,
                    id: refundRef.id
                }).catch(function (e) {
                    console.warn('[cliente] Erro e-mail admin:', e);
                });
            }

            toast('Pedido cancelado. Reembolso solicitado!', 'success');

        } else {

            /* Modo reembolso normal (não cancela) */
            refundData.origem = 'reembolso';

            var refundRef2 = await db.collection('refunds').add(refundData);

            await db.collection('orders').doc(pedido.id).update({
                'reembolso.status': 'pendente',
                'reembolso.motivo': motivo,
                'reembolso.detalhes': detalhes,
                'reembolso.data': firebase.firestore.FieldValue.serverTimestamp(),
                'reembolso.origem': 'reembolso',
                'reembolso.pedidoPago': jaFoiPago
            });

            /* Notifica o cliente */
            if (typeof enviarEmailReembolso === 'function') {
                enviarEmailReembolso({
                    ...refundData,
                    id: refundRef2.id
                }, 'pendente').catch(function (e) {
                    console.warn('[cliente] Erro e-mail cliente:', e);
                });
            }

            /* Notifica o ADMIN */
            if (typeof enviarEmailAdminReembolso === 'function') {
                enviarEmailAdminReembolso({
                    ...refundData,
                    id: refundRef2.id
                }).catch(function (e) {
                    console.warn('[cliente] Erro e-mail admin:', e);
                });
            }

            toast('Reembolso solicitado! Aguarde nosso contato.', 'success');
        }

        fecharModalReembolso();

    } catch (err) {

        console.error('[cliente] Erro ao processar:', err);
        toast('Erro ao processar. Tente novamente.', 'error');

        if (btn) {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    }
}


/* =========================================================
   TROCAR SEÇÃO
   ========================================================= */
function trocarSecaoConta(nome, botao) {

    document.querySelectorAll('.conta-tab, .conta-nav-item').forEach(function (b) {
        b.classList.remove('active');
    });
    if (botao) botao.classList.add('active');

    document.querySelectorAll('.conta-section').forEach(function (s) {
        s.classList.toggle('active', s.dataset.section === nome);
    });

    if (nome === 'favoritos') carregarFavoritos();
    if (nome === 'carrinho' && typeof renderizarCarrinhoConta === 'function') {
        renderizarCarrinhoConta();
    }
}


/* =========================================================
   SALVAR DADOS
   ========================================================= */
async function salvarDados(e) {

    e.preventDefault();

    if (!clienteAtual) return;

    var nome = document.getElementById('dadosNome').value.trim();
    var telefone = document.getElementById('dadosTelefone').value.trim();

    try {
        await db.collection('clientes').doc(clienteAtual.uid).update({
            nome: nome,
            telefone: telefone
        });

        await clienteAtual.updateProfile({ displayName: nome });

        toast('Dados atualizados!', 'success');

    } catch (err) {
        console.error(err);
        toast('Erro ao salvar', 'error');
    }
}


/* =========================================================
   ALTERAR E-MAIL
   ========================================================= */
function abrirAlterarEmail() {

    document.getElementById('emailNovoWrap').style.display = 'flex';
    document.getElementById('emailSenhaWrap').style.display = 'flex';
    document.getElementById('emailAcoesWrap').style.display = 'flex';

    var btnAbrir = document.getElementById('emailAlterarWrap');
    if (btnAbrir) btnAbrir.style.display = 'none';

    var hint = document.getElementById('dadosEmailHint');
    if (hint) hint.textContent = 'Preencha abaixo o novo e-mail e sua senha atual.';

    setTimeout(function () {
        var input = document.getElementById('novoEmail');
        if (input) input.focus();
    }, 50);
}


function fecharAlterarEmail() {

    document.getElementById('emailNovoWrap').style.display = 'none';
    document.getElementById('emailSenhaWrap').style.display = 'none';
    document.getElementById('emailAcoesWrap').style.display = 'none';

    var btnAbrir = document.getElementById('emailAlterarWrap');
    if (btnAbrir) btnAbrir.style.display = 'flex';

    var nv = document.getElementById('novoEmail');
    var sn = document.getElementById('senhaAtualEmail');
    if (nv) nv.value = '';
    if (sn) sn.value = '';

    var hint = document.getElementById('dadosEmailHint');
    if (hint) hint.textContent = 'O e-mail não pode ser alterado aqui.';
}


async function alterarEmailCliente() {

    if (!clienteAtual) {
        toast('Você precisa estar logado', 'warn');
        return;
    }

    var novoEmail = document.getElementById('novoEmail').value.trim();
    var senhaAtual = document.getElementById('senhaAtualEmail').value;
    var emailAtual = clienteAtual.email;

    if (!novoEmail) { toast('Digite o novo e-mail', 'warn'); return; }
    if (!senhaAtual) { toast('Digite sua senha atual', 'warn'); return; }

    if (novoEmail.toLowerCase() === 'mjstores.contato@gmail.com') {
        toast('Esse e-mail é reservado.', 'warn');
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoEmail)) {
        toast('E-mail inválido', 'warn');
        return;
    }

    if (novoEmail.toLowerCase() === emailAtual.toLowerCase()) {
        toast('O novo e-mail é igual ao atual', 'warn');
        return;
    }

    var btn = document.querySelector('#emailAcoesWrap .btn-primary');
    if (btn) {
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Alterando...';
    }

    try {
        var credencial = firebase.auth.EmailAuthProvider.credential(emailAtual, senhaAtual);
        await clienteAtual.reauthenticateWithCredential(credencial);
        await clienteAtual.updateEmail(novoEmail);

        try {
            await db.collection('clientes').doc(clienteAtual.uid).update({
                email: novoEmail.toLowerCase()
            });
        } catch (e) {
            console.warn('[cliente] Não deu pra atualizar Firestore:', e);
        }

        toast('E-mail alterado com sucesso!', 'success');

        var inputEmail = document.getElementById('dadosEmail');
        if (inputEmail) inputEmail.value = novoEmail;

        var elEmail = document.getElementById('contaEmail');
        if (elEmail) elEmail.textContent = novoEmail;

        fecharAlterarEmail();

    } catch (err) {
        console.error('[cliente] Erro ao alterar e-mail:', err);

        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            toast('Senha atual incorreta', 'error');
        } else if (err.code === 'auth/email-already-in-use') {
            toast('Esse e-mail já está em uso por outra conta', 'error');
        } else if (err.code === 'auth/invalid-email') {
            toast('E-mail inválido', 'error');
        } else if (err.code === 'auth/requires-recent-login') {
            toast('Faça login novamente e tente de novo', 'error');
        } else if (err.code === 'auth/network-request-failed') {
            toast('Sem conexão. Confira sua internet.', 'error');
        } else {
            toast('Erro ao alterar e-mail. Tente novamente.', 'error');
        }

    } finally {
        if (btn) {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Salvar novo e-mail';
        }
    }
}


/* =========================================================
   FAVORITOS
   ========================================================= */
function carregarFavoritos() {

    var lista = document.getElementById('favoritosList');
    if (!lista) return;

    var favoritos = [];
    try {
        favoritos = JSON.parse(
            localStorage.getItem('artefatos_favoritos')
            || localStorage.getItem('miqjo_favoritos')
            || '[]'
        );
    } catch (e) {}

    var badge = document.getElementById('contaBadgeFavoritos');
    if (badge) badge.textContent = favoritos.length;

    if (favoritos.length === 0) {
        lista.innerHTML =
            '<div class="favoritos-empty">' +
                '<div class="favoritos-empty-mark">♡</div>' +
                '<h3>Nenhum favorito ainda</h3>' +
                '<p>Quando você marcar peças com o coração, elas aparecem aqui.</p>' +
                '<a href="index.html" class="btn-primary">Explorar coleção</a>' +
            '</div>';
        return;
    }

    var produtos = (typeof obterProdutos === 'function') ? obterProdutos() : [];
    var encontrados = favoritos.map(function (id) {
        return produtos.find(function (p) { return p.id === id; });
    }).filter(Boolean);

    if (encontrados.length === 0) {
        lista.innerHTML =
            '<div class="favoritos-empty">' +
                '<div class="favoritos-empty-mark">♡</div>' +
                '<h3>Favoritos indisponíveis</h3>' +
                '<p>Não conseguimos carregar seus produtos salvos.</p>' +
            '</div>';
        return;
    }

    if (typeof gerarCardHTML === 'function') {
        lista.innerHTML = encontrados.map(function (p) {
            return gerarCardHTML(p);
        }).join('');
    }
}


/* =========================================================
   ENDEREÇOS
   ========================================================= */
function renderizarEnderecos() {

    var lista = document.getElementById('enderecosList');
    if (!lista) return;

    var enderecos = window.__enderecosCliente || [];

    if (enderecos.length === 0) {
        lista.innerHTML = '<div class="enderecos-empty">' +
            '<p>Você ainda não tem endereços salvos.</p>' +
            '</div>';
        return;
    }

    lista.innerHTML = enderecos.map(function (e, i) {
        return '<div class="endereco-card">' +
            '<div class="endereco-info">' +
                '<strong>' + (e.rua || '') + ', ' + (e.numero || '') + '</strong>' +
                '<p>' + (e.bairro || '') + ' — ' + (e.cidade || '') + '/' + (e.estado || '') + '</p>' +
                '<small>CEP: ' + (e.cep || '') + (e.complemento ? ' · ' + e.complemento : '') + '</small>' +
            '</div>' +
            '<div class="endereco-actions">' +
                '<button class="btn-ghost-sm" onclick="editarEndereco(' + i + ')">Editar</button>' +
                '<button class="btn-ghost-sm danger" onclick="excluirEndereco(' + i + ')">Excluir</button>' +
            '</div>' +
        '</div>';
    }).join('');
}


function abrirFormEndereco(endereco) {

    var form = document.getElementById('formEndereco');
    if (!form) return;

    form.reset();

    document.getElementById('enderecoId').value = '';

    if (endereco) {
        document.getElementById('endCep').value = endereco.cep || '';
        document.getElementById('endRua').value = endereco.rua || '';
        document.getElementById('endNumero').value = endereco.numero || '';
        document.getElementById('endComplemento').value = endereco.complemento || '';
        document.getElementById('endBairro').value = endereco.bairro || '';
        document.getElementById('endCidade').value = endereco.cidade || '';
        document.getElementById('endEstado').value = endereco.estado || '';
    }

    form.style.display = 'flex';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


function fecharFormEndereco() {
    var form = document.getElementById('formEndereco');
    if (form) form.style.display = 'none';
}


async function salvarEndereco(e) {

    e.preventDefault();

    if (!clienteAtual) return;

    var enderecos = window.__enderecosCliente || [];

    var novo = {
        cep: document.getElementById('endCep').value.trim(),
        rua: document.getElementById('endRua').value.trim(),
        numero: document.getElementById('endNumero').value.trim(),
        complemento: document.getElementById('endComplemento').value.trim(),
        bairro: document.getElementById('endBairro').value.trim(),
        cidade: document.getElementById('endCidade').value.trim(),
        estado: document.getElementById('endEstado').value.trim().toUpperCase()
    };

    var idEdicao = document.getElementById('enderecoId').value;

    if (idEdicao !== '') {
        enderecos[parseInt(idEdicao)] = novo;
    } else {
        enderecos.push(novo);
    }

    try {
        await db.collection('clientes').doc(clienteAtual.uid).update({
            enderecos: enderecos
        });

        window.__enderecosCliente = enderecos;

        fecharFormEndereco();
        renderizarEnderecos();

        toast('Endereço salvo!', 'success');

    } catch (err) {
        console.error(err);
        toast('Erro ao salvar endereço', 'error');
    }
}


function editarEndereco(idx) {
    var enderecos = window.__enderecosCliente || [];
    if (enderecos[idx]) {
        abrirFormEndereco(enderecos[idx]);
        document.getElementById('enderecoId').value = idx;
    }
}


async function excluirEndereco(idx) {

    if (!confirm('Excluir este endereço?')) return;

    var enderecos = window.__enderecosCliente || [];
    enderecos.splice(idx, 1);

    try {
        await db.collection('clientes').doc(clienteAtual.uid).update({
            enderecos: enderecos
        });

        window.__enderecosCliente = enderecos;
        renderizarEnderecos();

        toast('Endereço removido', 'success');

    } catch (err) {
        console.error(err);
        toast('Erro ao remover', 'error');
    }
}


/* =========================================================
   🔍 BUSCA AUTOMÁTICA DE CEP
   ========================================================= */
async function buscarCepViaCEP(cep, campos) {

    var cepLimpo = String(cep || '').replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    mostrarStatusCep('Buscando CEP...');

    var dados = null;

    try {
        var resp1 = await fetch('https://viacep.com.br/ws/' + cepLimpo + '/json/');
        if (resp1.ok) {
            var d1 = await resp1.json();
            if (!d1.erro) {
                dados = {
                    rua: d1.logradouro,
                    bairro: d1.bairro,
                    cidade: d1.localidade,
                    estado: d1.uf
                };
                console.log('[cep] ViaCEP OK:', dados);
            }
        }
    } catch (e) {
        console.warn('[cep] ViaCEP falhou, tentando BrasilAPI:', e);
    }

    if (!dados) {
        try {
            var resp2 = await fetch('https://brasilapi.com.br/api/cep/v1/' + cepLimpo);
            if (resp2.ok) {
                var d2 = await resp2.json();
                dados = {
                    rua: d2.street,
                    bairro: d2.neighborhood,
                    cidade: d2.city,
                    estado: d2.state
                };
                console.log('[cep] BrasilAPI OK:', dados);
            }
        } catch (e) {
            console.warn('[cep] BrasilAPI também falhou:', e);
        }
    }

    if (!dados) {
        mostrarStatusCep('CEP não encontrado', 'erro');
        toast('CEP não encontrado ou sem conexão. Confira e tente de novo.', 'warn');
        return;
    }

    if (campos.rua && dados.rua) {
        var elRua = document.getElementById(campos.rua);
        if (elRua) elRua.value = dados.rua;
    }

    if (campos.bairro && dados.bairro) {
        var elBairro = document.getElementById(campos.bairro);
        if (elBairro) elBairro.value = dados.bairro;
    }

    if (campos.cidade && dados.cidade) {
        var elCidade = document.getElementById(campos.cidade);
        if (elCidade) elCidade.value = dados.cidade;
    }

    if (campos.estado && dados.estado) {
        var elEstado = document.getElementById(campos.estado);
        if (elEstado) elEstado.value = dados.estado;
    }

    mostrarStatusCep('✓ Endereço preenchido', 'ok');

    if (campos.numero) {
        var elNumero = document.getElementById(campos.numero);
        if (elNumero && !elNumero.value) {
            setTimeout(function () { elNumero.focus(); }, 200);
        }
    }

    setTimeout(function () { mostrarStatusCep(''); }, 3000);
}


function mostrarStatusCep(msg, tipo) {

    var el = document.getElementById('cepStatus');

    if (!el) {
        var inputCep = document.getElementById('cCep') || document.getElementById('endCep');
        if (!inputCep) return;

        el = document.createElement('small');
        el.id = 'cepStatus';
        el.style.cssText = 'display:block;margin-top:6px;font-size:.78rem;transition:opacity .3s;';
        inputCep.parentElement.appendChild(el);
    }

    if (!msg) {
        el.style.opacity = '0';
        setTimeout(function () { el.textContent = ''; }, 300);
        return;
    }

    el.textContent = msg;
    el.style.opacity = '1';

    if (tipo === 'erro') {
        el.style.color = '#ef4444';
    } else if (tipo === 'ok') {
        el.style.color = '#10b981';
    } else {
        el.style.color = '#7fb0ff';
    }
}


function autoBuscarCep(inputCep) {

    var cepLimpo = inputCep.value.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    if (document.getElementById('cEndereco')) {
        buscarCepViaCEP(cepLimpo, {
            rua: 'cEndereco',
            bairro: 'cBairro',
            cidade: 'cCidade',
            estado: 'cEstado',
            numero: 'cNumero',
            complemento: 'cComplemento'
        });
        return;
    }

    if (document.getElementById('endRua')) {
        buscarCepViaCEP(cepLimpo, {
            rua: 'endRua',
            bairro: 'endBairro',
            cidade: 'endCidade',
            estado: 'endEstado',
            numero: 'endNumero',
            complemento: 'endComplemento'
        });
        return;
    }
}


/* =========================================================
   MÁSCARAS
   ========================================================= */
function mascaraTelefone(input) {

    var v = input.value.replace(/\D/g, '').slice(0, 11);

    if (v.length <= 10) {
        v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else {
        v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
    }

    input.value = v;
}


function mascaraCep(input) {

    var v = input.value.replace(/\D/g, '').slice(0, 8);
    v = v.replace(/(\d{5})(\d{0,3})/, '$1-$2');

    input.value = v;

    var cepLimpo = input.value.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
        autoBuscarCep(input);
    }
}


/* =========================================================
   HELPERS
   ========================================================= */
function escapeHtmlCliente(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/* =========================================================
   TOAST
   ========================================================= */
function toast(msg, tipo) {

    if (typeof window.toast === 'function' && window.toast !== toast) {
        return window.toast(msg, tipo);
    }

    var stack = document.getElementById('toastStack');
    if (!stack) return;

    var el = document.createElement('div');
    el.className = 'toast ' + (tipo || 'info');
    el.textContent = msg;

    stack.appendChild(el);

    setTimeout(function () {
        el.style.opacity = '0';
        setTimeout(function () { el.remove(); }, 300);
    }, 3000);
}


/* =========================================================
   EXPÕE
   ========================================================= */
window.trocarAba = trocarAba;
window.recuperarSenha = recuperarSenha;
window.fazerLogoutCliente = fazerLogoutCliente;
window.trocarSecaoConta = trocarSecaoConta;
window.abrirFormEndereco = abrirFormEndereco;
window.fecharFormEndereco = fecharFormEndereco;
window.editarEndereco = editarEndereco;
window.excluirEndereco = excluirEndereco;
window.mascaraTelefone = mascaraTelefone;
window.mascaraCep = mascaraCep;

window.abrirAlterarEmail = abrirAlterarEmail;
window.fecharAlterarEmail = fecharAlterarEmail;
window.alterarEmailCliente = alterarEmailCliente;

window.buscarCepViaCEP = buscarCepViaCEP;
window.autoBuscarCep = autoBuscarCep;

window.abrirModalReembolso = abrirModalReembolso;
window.fecharModalReembolso = fecharModalReembolso;
window.confirmarReembolso = confirmarReembolso;
window.cancelarPedidoCliente = cancelarPedidoCliente;

window.ativarNotificacoes = ativarNotificacoes;
window.atualizarBotaoNotificacoes = atualizarBotaoNotificacoes;
window.mostrarNotificacao = mostrarNotificacao;

window.removerPedidoDaLista = removerPedidoDaLista;
window.filtrarPedidos = filtrarPedidos;
window.carregarFavoritos = carregarFavoritos;
window.renderizarPedidosCliente = renderizarPedidosCliente;