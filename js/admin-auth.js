/* =========================================================
   ADMIN-AUTH.JS — Login via Firebase Auth
   v4 — recria listeners DEPOIS do login (fix reembolsos)
   ========================================================= */

'use strict';

const ADMIN_EMAIL = 'mjstores.contato@gmail.com';


document.addEventListener('DOMContentLoaded', function () {

    var overlay = document.getElementById('adminLogin');
    var form    = document.getElementById('adminLoginForm');
    var input   = document.getElementById('adminSenha');

    if (!overlay) {
        console.error('[admin] ❌ #adminLogin não encontrado');
        return;
    }

    console.log('[admin] Iniciando auth — admin esperado:', ADMIN_EMAIL);

    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
        .then(function () {

            console.log('[admin] ✅ Persistência SESSION configurada');

            auth.onAuthStateChanged(function (user) {

                console.log('[admin] onAuthStateChanged →', user ? user.email : 'null');

                if (!user) {
                    console.log('[admin] Nenhum usuário — mostrando login');
                    mostrarLogin(overlay, input);
                    return;
                }

                if (user.email !== ADMIN_EMAIL) {
                    console.warn('[admin] ❌ Email não autorizado:', user.email);

                    auth.signOut().then(function () {
                        mostrarLogin(overlay, input);
                    });

                    return;
                }

                console.log('[admin] ✅ Admin autenticado:', user.email);
                console.log('[admin] UID:', user.uid);

                esconderLogin(overlay);

                /* Espera firebase-ready pra carregar tudo */
                aguardarFirebaseEIniciar();

                /* 🔥 E DEPOIS recria os listeners autenticado */
                setTimeout(function () {
                    reiniciarListenersAutenticado();
                }, 1500);
            });

        })
        .catch(function (e) {
            console.error('[admin] ❌ Erro persistência:', e);
        });

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            tentarLogin();
        });
    }
});


/* ---------------------------------------------------------
   AGUARDA FIREBASE-READY E CARREGA DADOS INICIAIS
   --------------------------------------------------------- */
function aguardarFirebaseEIniciar() {

    var iniciarDados = function () {

        console.log('[admin] firebase pronto — carregando dados iniciais');

        if (typeof carregarPedidosRemotos === 'function') {
            carregarPedidosRemotos()
                .then(function () {
                    console.log('[admin] ✅ Pedidos carregados:', (window.__pedidos || []).length);
                    if (typeof renderizarDashboard === 'function') renderizarDashboard();
                    if (typeof renderizarPedidos === 'function') renderizarPedidos();
                    if (typeof renderizarClientes === 'function') renderizarClientes();
                    if (typeof renderizarRelatorios === 'function') renderizarRelatorios();
                })
                .catch(function (e) {
                    console.error('[admin] ❌ Erro carregar pedidos:', e);
                });
        }

        /* 🔥 Carrega reembolsos uma vez também */
        if (typeof carregarReembolsosUmaVez === 'function') {
            carregarReembolsosUmaVez();
        }
    };

    if (window.__firebasePronto) {
        iniciarDados();
    } else {
        window.addEventListener('firebase-ready', iniciarDados, { once: true });
    }
}


/* ---------------------------------------------------------
   🔥 RECRIA LISTENERS JÁ AUTENTICADO
   Essa é a chave do problema — os listeners criados antes
   do login falhavam por permission-denied e nunca mais
   eram recriados. Aqui a gente recria depois do login OK.
   --------------------------------------------------------- */
function reiniciarListenersAutenticado() {

    console.log('[admin] 🔥 Recriando listeners autenticado...');

    /* Só roda se o admin estiver logado */
    if (!auth.currentUser || auth.currentUser.email !== ADMIN_EMAIL) {
        console.log('[admin] Não está logado ainda — abortando recriação');
        return;
    }

    /* Recria listener de pedidos */
    if (typeof escutarPedidosRealtime === 'function') {
        try {
            escutarPedidosRealtime();
            console.log('[admin] ✅ Listener de pedidos recriado');
        } catch (e) {
            console.warn('[admin] Erro listener pedidos:', e);
        }
    }

    /* Recria listener de reembolsos */
    if (typeof escutarReembolsosRealtime === 'function') {
        try {
            escutarReembolsosRealtime();
            console.log('[admin] ✅ Listener de reembolsos recriado');
        } catch (e) {
            console.warn('[admin] Erro listener reembolsos:', e);
        }
    }

    /* Recarrega reembolsos uma vez também */
    if (typeof carregarReembolsosUmaVez === 'function') {
        carregarReembolsosUmaVez()
            .then(function () {
                console.log('[admin] ✅ Reembolsos recarregados após login');
            })
            .catch(function (e) {
                console.warn('[admin] Erro recarregar reembolsos:', e);
            });
    }
}


/* ---------------------------------------------------------
   MOSTRAR / ESCONDER LOGIN
   --------------------------------------------------------- */
function mostrarLogin(overlay, input) {
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
    document.body.classList.add('admin-locked');
    if (input) setTimeout(function () { input.focus(); }, 200);
}


function esconderLogin(overlay) {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(function () { overlay.style.display = 'none'; }, 300);
    document.body.classList.remove('admin-locked');
}


/* ---------------------------------------------------------
   LOGIN
   --------------------------------------------------------- */
function tentarLogin() {

    var input = document.getElementById('adminSenha');
    var erro  = document.getElementById('adminLoginErro');
    var box   = document.querySelector('.admin-login-box');

    if (!input) return;

    var senha = input.value.trim();
    if (!senha) { if (erro) erro.textContent = 'Digite a senha.'; return; }

    if (erro) erro.textContent = 'Verificando...';

    console.log('[admin] Tentando login com:', ADMIN_EMAIL);

    auth.signInWithEmailAndPassword(ADMIN_EMAIL, senha)
        .then(function (cred) {
            console.log('[admin] ✅ Login OK:', cred.user.email);
            if (erro) erro.textContent = '';

            /* 🔥 Recria listeners após login */
            setTimeout(function () {
                reiniciarListenersAutenticado();
            }, 800);
        })
        .catch(function (e) {
            console.error('[admin] ❌ Erro login:', e.code, e.message);

            if (erro) {
                if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                    erro.textContent = 'Senha incorreta.';
                } else if (e.code === 'auth/user-not-found') {
                    erro.textContent = 'Usuário não encontrado.';
                } else if (e.code === 'auth/too-many-requests') {
                    erro.textContent = 'Muitas tentativas. Aguarde.';
                } else {
                    erro.textContent = 'Erro: ' + e.code;
                }
            }

            if (box) {
                box.classList.add('shake');
                setTimeout(function () { box.classList.remove('shake'); }, 500);
            }

            if (input) { input.value = ''; input.focus(); }
        });
}


/* ---------------------------------------------------------
   LOGOUT
   --------------------------------------------------------- */
function fazerLogout() {
    if (!confirm('Deseja sair da área administrativa?')) return;
    auth.signOut().then(function () { window.location.href = 'index.html'; });
}


/* ---------------------------------------------------------
   MOSTRAR / ESCONDER SENHA
   --------------------------------------------------------- */
function alternarSenha() {
    var input = document.getElementById('adminSenha');
    var btn   = document.getElementById('adminToggleSenha');
    if (!input || !btn) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.classList.add('active');
    } else {
        input.type = 'password';
        btn.classList.remove('active');
    }
}


/* ---------------------------------------------------------
   EXPÕE
   --------------------------------------------------------- */
window.tentarLogin                = tentarLogin;
window.fazerLogout                = fazerLogout;
window.alternarSenha              = alternarSenha;
window.reiniciarListenersAutenticado = reiniciarListenersAutenticado;