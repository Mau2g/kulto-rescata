/* ============================================================
   KULTO RESCATA — Autenticación con Supabase
   Taller de Programación Web · UTP

   Login y registro reales contra el proyecto Supabase
   "Taller de Programacion". Usa el SDK oficial supabase-js
   (cargado por CDN en el <head> antes de este archivo).

   La anon key es pública por diseño (segura para el navegador).
   ============================================================ */

var SUPABASE_URL = 'https://tntqfevzuzczxvallbsj.supabase.co';
var SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRudHFmZXZ6dXpjenh2YWxsYnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NzMwODEsImV4cCI6MjA5ODU0OTA4MX0.y_VFVwN7l-RN_nI7MFezFmCPoh6WG-Tiunbq1Dx6ZPw';

// cliente Supabase (window.supabase lo expone el CDN)
var sb = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// traduce los mensajes de error de Supabase a español claro
function traducirError(mensaje) {
  var m = (mensaje || '').toLowerCase();
  if (m.indexOf('invalid login credentials') !== -1)
    return 'Correo o contraseña incorrectos.';
  if (m.indexOf('email not confirmed') !== -1)
    return 'Tu correo aún no está confirmado. Revisa tu bandeja de entrada.';
  if (m.indexOf('already registered') !== -1 || m.indexOf('already been registered') !== -1)
    return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (m.indexOf('password') !== -1 && m.indexOf('6') !== -1)
    return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.indexOf('invalid') !== -1 && m.indexOf('email') !== -1)
    return 'El correo no es válido.';
  return mensaje || 'Ocurrió un error. Intenta de nuevo.';
}

/* ---------- INICIAR SESIÓN (login.html) ---------- */
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

/* ---------- REGISTRO (registrar.html) ---------- */
function verificarClaves() {
  var clave = document.getElementById('clave').value;
  var repetir = document.getElementById('repetir').value;
  var aviso = document.getElementById('error-repetir');
  aviso.textContent = repetir !== '' && clave !== repetir ? 'Las contraseñas no coinciden.' : '';
}

async function registrarUsuario(evento) {
  evento.preventDefault();
  var nombre = document.getElementById('nombre').value.trim();
  var correo = document.getElementById('correo').value.trim();
  var clave = document.getElementById('clave').value;
  var repetir = document.getElementById('repetir').value;
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
    options: { data: { nombre: nombre } },
  });
  if (res.error) {
    error.textContent = traducirError(res.error.message);
    return false;
  }
  error.textContent = '';
  var texto = document.getElementById('modal-texto');
  if (res.data.session) {
    // el proyecto no exige confirmar correo: queda logueado
    texto.textContent = '¡Bienvenido, ' + nombre + '! Tu cuenta quedó creada.';
    abrirModal('modal-ok');
    setTimeout(function () { window.location.href = 'index.html'; }, 1400);
  } else {
    // el proyecto exige confirmar el correo antes de iniciar sesión
    texto.innerHTML = '¡Cuenta creada, ' + nombre + '! Te enviamos un correo a <b>' +
      correo + '</b> para confirmarla. Ábrelo, confirma y luego inicia sesión.';
    abrirModal('modal-ok');
  }
  return false;
}

/* ---------- SESIÓN EN EL ENCABEZADO (todas las páginas) ---------- */
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
