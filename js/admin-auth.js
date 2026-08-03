/*
===========================================
Importadora A&N
Módulo: Autenticación del panel
Autor: Codex + Daniel
Versión: 0.7.3
Última modificación: 2026-07-28
Descripción: Inicio estable con panel HTML estático,
validación de sesión y recuperación ante errores.
===========================================
*/
import { db } from './supabase-client.js';
import { initializeAdminPanel } from './admin-panel.js?v=20260803-1';

const loginView = document.querySelector('#login-view');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const adminView = document.querySelector('#admin-view');
const startupError = document.querySelector('#startup-error');
const startupErrorMessage = document.querySelector('#startup-error-message');
let activeUserId = null;
let starting = false;

function withTimeout(promise, milliseconds, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} tardó demasiado.`)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function showLogin(message = '') {
  adminView.hidden = true;
  startupError.hidden = true;
  loginView.hidden = false;
  loginError.textContent = message;
}

function showStartupError(message) {
  adminView.hidden = true;
  loginView.hidden = true;
  startupError.hidden = false;
  startupErrorMessage.textContent = message || 'Comprueba tu conexión e inténtalo nuevamente.';
}

async function startSession(session) {
  if (!session || starting) return;
  if (activeUserId === session.user.id && !adminView.hidden) return;
  starting = true;
  loginView.hidden = false;
  startupError.hidden = true;
  loginError.textContent = 'Verificando autorización…';
  try {
    const result = await withTimeout(
      db.from('administradores').select('nombre, rol').eq('usuario_id', session.user.id).maybeSingle(),
      10000,
      'La verificación de acceso'
    );
    const { data: profile, error } = result;
    const validRoles = ['administrador', 'editor', 'solo_lectura'];
    if (error || !profile || !validRoles.includes(profile.rol)) {
      await db.auth.signOut();
      showLogin('Esta cuenta no tiene autorización para ingresar al panel.');
      return;
    }
    await initializeAdminPanel(profile.rol, profile);
    activeUserId = session.user.id;
    loginView.hidden = true;
    startupError.hidden = true;
    adminView.hidden = false;
    loginError.textContent = '';
  } catch (error) {
    console.error('Error al iniciar el panel:', error);
    showStartupError(error?.message || 'No se pudo iniciar el panel.');
  } finally {
    starting = false;
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = 'Ingresando…';
  try {
    const { data, error } = await withTimeout(db.auth.signInWithPassword({
      email: document.querySelector('#email').value,
      password: document.querySelector('#password').value
    }), 12000, 'El inicio de sesión');
    if (error) {
      loginError.textContent = 'Correo o contraseña incorrectos.';
      return;
    }
    await startSession(data.session);
  } catch (error) {
    showStartupError(error?.message || 'No se pudo conectar con el servicio.');
  }
});

document.querySelector('#retry-startup').addEventListener('click', async () => {
  startupErrorMessage.textContent = 'Reintentando…';
  try {
    const { data } = await withTimeout(db.auth.getSession(), 8000, 'La recuperación de sesión');
    if (data.session) await startSession(data.session);
    else showLogin('Tu sesión terminó. Ingresa nuevamente.');
  } catch (error) {
    showStartupError(error?.message || 'No fue posible recuperar la sesión.');
  }
});

document.querySelector('#reset-session').addEventListener('click', async () => {
  await db.auth.signOut();
  location.reload();
});

window.addEventListener('error', event => {
  console.error('Error global del panel:', event.error || event.message);
  if (adminView.hidden) showStartupError('Ocurrió un error al cargar el panel. Puedes reintentar sin cerrar el navegador.');
});
window.addEventListener('unhandledrejection', event => {
  console.error('Promesa no controlada:', event.reason);
  if (adminView.hidden) showStartupError('Una operación no respondió correctamente. Puedes reintentar.');
});

db.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    activeUserId = null;
    showLogin();
    return;
  }
  queueMicrotask(() => startSession(session));
});

(async function boot() {
  try {
    const { data } = await withTimeout(db.auth.getSession(), 8000, 'La sesión');
    if (data.session) await startSession(data.session);
    else showLogin();
  } catch (error) {
    showStartupError(error?.message || 'No se pudo comprobar la sesión.');
  }
})();
