/* ============================================================
   KULTO RESCATA — JavaScript de la interfaz
   Taller de Programación Web · UTP

   Responsabilidades:
   - Menú responsivo (hamburguesa)
   - Ventanas flotantes (modales)
   - Filtros del menú
   - Carrito de pedido persistente (se guarda en el navegador con
     localStorage, así lo que agregas NO se pierde al cambiar de página)
   - Checkout: pintar el carrito y confirmar el pedido

   La autenticación (login / registro) vive en js/auth.js (Supabase).
   ============================================================ */

/* ------------------------------------------------------------
   1. MENÚ RESPONSIVO
   ------------------------------------------------------------ */
function alternarMenu() {
  var nav = document.getElementById('nav');
  var boton = document.getElementById('burger');
  nav.classList.toggle('abierto');
  boton.setAttribute('aria-expanded', nav.classList.contains('abierto'));
}

/* ------------------------------------------------------------
   2. VENTANAS FLOTANTES (modales)
   ------------------------------------------------------------ */
function abrirModal(id) {
  var m = document.getElementById(id);
  if (m) m.classList.add('abierto');
}
function cerrarModal(id) {
  var m = document.getElementById(id);
  if (m) m.classList.remove('abierto');
}

/* ------------------------------------------------------------
   3. CARRITO — persiste en localStorage
   ------------------------------------------------------------ */
var CLAVE_CARRITO = 'kr_carrito';

function leerCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || [];
  } catch (e) {
    return [];
  }
}
function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
}

// suma total de unidades en el carrito
function cantidadTotal(carrito) {
  var n = 0;
  for (var i = 0; i < carrito.length; i++) {
    n = n + carrito[i].cant;
  }
  return n;
}

// muestra el número de items en el contador del encabezado (todas las páginas)
function actualizarContador() {
  var contador = document.getElementById('contador-pedido');
  if (contador === null) return;
  var total = cantidadTotal(leerCarrito());
  contador.textContent = total;
  contador.style.display = total > 0 ? 'inline-flex' : 'none';
}

// agrega un plato al carrito (agrupa por nombre y suma cantidad)
function agregarAlPedido(nombre, precio) {
  var carrito = leerCarrito();
  var encontrado = false;
  for (var i = 0; i < carrito.length; i++) {
    if (carrito[i].nombre === nombre) {
      carrito[i].cant = carrito[i].cant + 1;
      encontrado = true;
    }
  }
  if (encontrado === false) {
    carrito.push({ nombre: nombre, precio: precio, cant: 1 });
  }
  guardarCarrito(carrito);
  actualizarContador();

  var texto = document.getElementById('modal-texto');
  if (texto !== null) {
    texto.textContent = 'Agregaste "' + nombre + '" a tu pedido. Llevas ' +
      cantidadTotal(carrito) + ' plato(s).';
  }
  abrirModal('modal-ok');
}

// quita un plato del carrito (desde el checkout)
function quitarDelCarrito(nombre) {
  var carrito = leerCarrito();
  var nuevo = [];
  for (var i = 0; i < carrito.length; i++) {
    if (carrito[i].nombre !== nombre) {
      nuevo.push(carrito[i]);
    }
  }
  guardarCarrito(nuevo);
  actualizarContador();
  pintarCarrito();
}

/* ------------------------------------------------------------
   4. MENÚ / OFERTAS — filtros por categoría
   ------------------------------------------------------------ */
function filtrarPlatos(categoria, boton) {
  var platos = document.getElementsByClassName('plato');
  for (var i = 0; i < platos.length; i++) {
    var cat = platos[i].getAttribute('data-categoria');
    if (categoria === 'todos' || cat === categoria) {
      platos[i].style.display = 'flex';
    } else {
      platos[i].style.display = 'none';
    }
  }
  var filtros = document.getElementsByClassName('filtro');
  for (var j = 0; j < filtros.length; j++) {
    filtros[j].classList.remove('activo');
  }
  boton.classList.add('activo');
}

/* ------------------------------------------------------------
   5. CHECKOUT (form_pedido.html) — pinta el carrito y confirma
   ------------------------------------------------------------ */
function pintarCarrito() {
  var cont = document.getElementById('carrito-items');
  if (cont === null) return; // no estamos en el checkout
  var carrito = leerCarrito();
  var vacio = document.getElementById('carrito-vacio');
  var total = 0;

  cont.innerHTML = '';
  if (carrito.length === 0) {
    if (vacio) vacio.style.display = 'block';
  } else {
    if (vacio) vacio.style.display = 'none';
    for (var i = 0; i < carrito.length; i++) {
      var it = carrito[i];
      var sub = it.precio * it.cant;
      total = total + sub;
      var fila = document.createElement('div');
      fila.className = 'resumen__linea';
      fila.innerHTML =
        '<span>' + it.nombre + ' <b>x' + it.cant + '</b></span>' +
        '<span>S/ ' + sub.toFixed(2) +
        ' <button type="button" class="resumen__quitar" title="Quitar" ' +
        'onclick="quitarDelCarrito(\'' + it.nombre.replace(/'/g, "\\'") + '\')">&times;</button></span>';
      cont.appendChild(fila);
    }
  }
  document.getElementById('res-total').textContent = 'S/ ' + total.toFixed(2);
}

function enviarPedido(evento) {
  evento.preventDefault();
  var nombre = document.getElementById('cliente').value;
  var telefono = document.getElementById('telefono').value;
  var error = document.getElementById('error-pedido');
  var carrito = leerCarrito();

  if (carrito.length === 0) {
    error.textContent = 'Tu carrito está vacío. Agrega platos desde el menú.';
    return false;
  }
  if (nombre === '') {
    error.textContent = 'Escribe tu nombre.';
    return false;
  }
  if (telefono.length < 9) {
    error.textContent = 'Escribe un teléfono válido (9 dígitos).';
    return false;
  }
  error.textContent = '';

  var seguro = confirm('¿Confirmas tu pedido de rescate, ' + nombre + '?');
  if (seguro === true) {
    document.getElementById('modal-texto').textContent =
      '¡Gracias, ' + nombre + '! Tu pedido de rescate quedó registrado. ' +
      'Te esperamos para recogerlo.';
    // vaciar el carrito tras confirmar
    guardarCarrito([]);
    actualizarContador();
    pintarCarrito();
    abrirModal('modal-ok');
  }
  return seguro;
}

/* ------------------------------------------------------------
   6. ARRANQUE
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', function () {
  actualizarContador();
  pintarCarrito(); // solo hace algo en el checkout
});
