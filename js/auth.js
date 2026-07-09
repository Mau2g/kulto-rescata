const SUPABASE_URL = 'https://tntqfevzuzczxvallbsj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRudHFmZXZ6dXpjenh2YWxsYnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NzMwODEsImV4cCI6MjA5ODU0OTA4MX0.y_VFVwN7l-RN_nI7MFezFmCPoh6WG-Tiunbq1Dx6ZPw';

var sb = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

async function usuarioActual() {
  if (sb === null) return null;
  var res = await sb.auth.getSession();
  return res.data.session ? res.data.session.user : null;
}

function traducirError(mensaje) {
  var m = (mensaje || '').toLowerCase();
  if (m.indexOf('invalid login credentials') !== -1) return 'Correo o contraseña incorrectos.';
  if (m.indexOf('already registered') !== -1 || m.indexOf('already been registered') !== -1)
    return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (m.indexOf('password') !== -1 && m.indexOf('6') !== -1)
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.indexOf('invalid') !== -1 && m.indexOf('email') !== -1) return 'El correo no es válido.';
  return mensaje || 'Ocurrió un error. Intenta de nuevo.';
}

async function iniciarLogin(evento) {
  evento.preventDefault();
  var correo = document.getElementById('correo').value.trim();
  var clave = document.getElementById('clave').value;
  var error = document.getElementById('error-login');

  if (correo.indexOf('@') === -1 || correo.indexOf('.') === -1) {
    error.textContent = 'Escribe un correo válido.';
    return false;
  }
  if (clave.length < 6) {
    error.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return false;
  }
  if (sb === null) {
    error.textContent = 'No se pudo cargar el sistema de autenticación. Revisa tu conexión.';
    return false;
  }

  error.textContent = 'Ingresando...';
  var res = await sb.auth.signInWithPassword({ email: correo, password: clave });
  if (res.error) {
    error.textContent = traducirError(res.error.message);
    return false;
  }
  error.textContent = '';
  document.getElementById('modal-texto').textContent =
    'Sesión iniciada. Bienvenido de vuelta a rescatar buena comida.';
  abrirModal('modal-ok');
  setTimeout(function () { window.location.href = 'index.html'; }, 1300);
  return false;
}

function verificarClaves() {
  var clave = document.getElementById('clave').value;
  var repetir = document.getElementById('repetir').value;
  var aviso = document.getElementById('error-repetir');
  aviso.textContent = repetir !== '' && clave !== repetir ? 'Las contraseñas no coinciden.' : '';
}

async function registrarUsuario(evento) {
  evento.preventDefault();
  var nombre = document.getElementById('nombre').value.trim();
  var apellido = document.getElementById('apellido').value.trim();
  var correo = document.getElementById('correo').value.trim();
  var clave = document.getElementById('clave').value;
  var repetir = document.getElementById('repetir').value;
  var tipo = document.getElementById('tipo').value;
  var terminos = document.getElementById('terminos').checked;
  var error = document.getElementById('error-registro');

  if (nombre === '') { error.textContent = 'Escribe tu nombre.'; return false; }
  if (correo.indexOf('@') === -1 || correo.indexOf('.') === -1) {
    error.textContent = 'Escribe un correo válido.'; return false;
  }
  if (clave.length < 6) { error.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return false; }
  if (clave !== repetir) { error.textContent = 'Las contraseñas no coinciden.'; return false; }
  if (terminos === false) { error.textContent = 'Debes aceptar los términos para crear tu cuenta.'; return false; }
  if (sb === null) { error.textContent = 'No se pudo cargar el sistema de autenticación.'; return false; }

  error.textContent = 'Creando tu cuenta...';
  var res = await sb.auth.signUp({
    email: correo,
    password: clave,
    options: { data: { nombre: nombre, apellido: apellido, tipo: tipo } }
  });
  if (res.error) {
    error.textContent = traducirError(res.error.message);
    return false;
  }
  error.textContent = '';
  var texto = document.getElementById('modal-texto');
  if (res.data.session) {
    texto.textContent = '¡Bienvenido, ' + nombre + '! Tu cuenta quedó creada.';
    abrirModal('modal-ok');
    setTimeout(function () { window.location.href = 'index.html'; }, 1400);
  } else {
    texto.textContent = '¡Cuenta creada, ' + nombre + '! Ya puedes iniciar sesión.';
    abrirModal('modal-ok');
    setTimeout(function () { window.location.href = 'login.html'; }, 1600);
  }
  return false;
}

async function iniciarSesionHeader() {
  var cta = document.getElementById('auth-cta');
  if (cta === null || sb === null) return;
  var res = await sb.auth.getSession();
  var session = res.data.session;
  if (session && session.user) {
    var meta = session.user.user_metadata || {};
    var nombre = meta.nombre || session.user.email || 'Mi cuenta';
    if (nombre.length > 14) nombre = nombre.slice(0, 12) + '…';
    cta.textContent = 'Salir · ' + nombre;
    cta.setAttribute('href', '#');
    cta.setAttribute('title', 'Cerrar sesión');
    cta.onclick = function (e) { e.preventDefault(); cerrarSesion(); };
  }
}

async function cerrarSesion() {
  if (sb !== null) await sb.auth.signOut();
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', iniciarSesionHeader);
