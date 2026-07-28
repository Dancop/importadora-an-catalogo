import { db } from './supabase-client.js';
import { ADMIN_PANEL_HTML } from './admin-template.js';

const loginView = document.querySelector('#login-view');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const adminMount = document.querySelector('#admin-mount');
let panelModule = null;
let activeUserId = null;

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = 'Ingresando…';
  const { error } = await db.auth.signInWithPassword({
    email: document.querySelector('#email').value,
    password: document.querySelector('#password').value
  });
  if (error) loginError.textContent = 'Correo o contraseña incorrectos.';
});

db.auth.onAuthStateChange(async (_event, session) => {
  if (!session) {
    activeUserId = null;
    adminMount.replaceChildren();
    loginView.hidden = false;
    loginError.textContent = '';
    return;
  }
  if (activeUserId === session.user.id && adminMount.childElementCount) return;
  await authorizeAndLoad(session);
});

async function authorizeAndLoad(session) {
  loginView.hidden = false;
  loginError.textContent = 'Verificando autorización…';

  const { data: profile, error } = await db
    .from('administradores')
    .select('nombre, rol')
    .eq('usuario_id', session.user.id)
    .maybeSingle();

  const validRoles = ['administrador', 'editor', 'solo_lectura'];
  if (error || !profile || !validRoles.includes(profile.rol)) {
    loginError.textContent = 'Esta cuenta no tiene autorización para ingresar al panel.';
    await db.auth.signOut();
    return;
  }

  adminMount.innerHTML = ADMIN_PANEL_HTML;
  panelModule = await import('./admin-panel.js?v=20260728-3');
  activeUserId = session.user.id;
  loginView.hidden = true;
  loginError.textContent = '';
  await panelModule.initializeAdminPanel(profile.rol, profile);
}
