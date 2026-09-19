/* =========================================================
   ADMIN-AUTH.JS — Login via Firebase Auth
   v5 — é o ÚNICO que dispara iniciarPainel() após login
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
                esconderLogin(overlay);
                iniciarPainelQuandoPronto();
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
   Aguarda firebase-ready E chama iniciarPainel() (só uma vez)
   --------------------------------------------------------- */
function iniciarPainelQuandoPronto() {

    var iniciar = function () {
        if (typeof iniciarPainel === 'function') {
            console.log('[admin] Chamando iniciarPainel()');
            iniciarPainel();
        } else {
            console.warn('[admin] iniciarPainel não definido ainda');
        }
    };

    if (window.__firebasePronto) {
        iniciar();
    } else {
        window.addEventListener('firebase-ready', iniciar, { once: true });
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

    auth.signInWithEmailAndPassword(ADMIN_EMAIL, senha)
        .then(function (cred) {
            console.log('[admin] ✅ Login OK:', cred.user.email);
            if (erro) erro.textContent = '';
            /* O onAuthStateChanged vai cuidar de chamar iniciarPainel */
        })
        .catch(function (e) {
            console.error('[admin] ❌ Erro login:', e.code);

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
    window.__adminIniciado = false;
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
window.tentarLogin   = tentarLogin;
window.fazerLogout   = fazerLogout;
window.alternarSenha = alternarSenha;