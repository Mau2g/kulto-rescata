/* Kulto Rescata — interfaz + catálogo y pedidos (BD normalizada). El cliente `sb` vive en auth.js. */

function alternarMenu() {
  var nav = document.getElementById('nav');
  nav.classList.toggle('abierto');
  document.getElementById('burger').setAttribute('aria-expanded', nav.classList.contains('abierto'));
}

function abrirModal(id) { var m = document.getElementById(id); if (m) m.classList.add('abierto'); }
function cerrarModal(id) { var m = document.getElementById(id); if (m) m.classList.remove('abierto'); }

/* ---- Carrito (temporal, en el navegador hasta confirmar el pedido) ---- */
const CLAVE_CARRITO = 'kr_carrito';

function leerCarrito() {
  try { return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || []; } catch (e) { return []; }
}
function guardarCarrito(carrito) { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito)); }

function cantidadTotal(carrito) {
  var n = 0;
  for (var i = 0; i < carrito.length; i++) n = n + carrito[i].cant;
  return n;
}

function actualizarContador() {
  var contador = document.getElementById('contador-pedido');
  if (contador === null) return;
  var total = cantidadTotal(leerCarrito());
  contador.textContent = total;
  contador.style.display = total > 0 ? 'inline-flex' : 'none';
}

function agregarAlPedido(id, nombre, precio) {
  var carrito = leerCarrito();
  var encontrado = false;
  for (var i = 0; i < carrito.length; i++) {
    if (carrito[i].id === id) { carrito[i].cant = carrito[i].cant + 1; encontrado = true; }
  }
  if (encontrado === false) carrito.push({ id: id, nombre: nombre, precio: precio, cant: 1 });
  guardarCarrito(carrito);
  actualizarContador();

  var texto = document.getElementById('modal-texto');
  if (texto !== null) {
    texto.textContent = 'Agregaste "' + nombre + '" a tu pedido. Llevas ' + cantidadTotal(carrito) + ' plato(s).';
  }
  abrirModal('modal-ok');
}

function quitarDelCarrito(id) {
  var carrito = leerCarrito();
  var nuevo = [];
  for (var i = 0; i < carrito.length; i++) if (carrito[i].id !== id) nuevo.push(carrito[i]);
  guardarCarrito(nuevo);
  actualizarContador();
  pintarCarrito();
}

function pintarCarrito() {
  var cont = document.getElementById('carrito-items');
  if (cont === null) return;
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
        'onclick="quitarDelCarrito(' + it.id + ')">&times;</button></span>';
      cont.appendChild(fila);
    }
  }
  document.getElementById('res-total').textContent = 'S/ ' + total.toFixed(2);
}

/* ---- Catálogo: pinta el menú desde la tabla `platos` ---- */
function tarjetaPlato(p, esOferta) {
  var precio = esOferta ? Number(p.precio_oferta) : Number(p.precio);
  var antes = Number(p.precio_antes);
  var pct = Math.round((1 - precio / antes) * 100);
  var nombreJs = p.nombre.replace(/'/g, "\\'");
  var foto = p.imagen
    ? '<img class="plato__img" src="' + p.imagen + '" alt="' + p.nombre + '" loading="lazy" />'
    : '<span class="plato__inicial">' + p.nombre.charAt(0) + '</span>';
  return '' +
    '<article class="plato' + (esOferta ? ' oferta' : '') + '" data-categoria="' + p.categoria + '">' +
      '<div class="plato__foto">' +
        foto +
        '<div class="plato__insignias">' +
          '<span class="insignia insignia--eco">Rescatado</span>' +
          '<span class="insignia insignia--vence">Vence ' + p.vence + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="plato__cuerpo">' +
        '<span class="plato__nombre">' + p.nombre + '</span>' +
        '<p class="plato__desc">' + p.descripcion + '</p>' +
        '<div class="plato__precios">' +
          '<span class="plato__antes">S/ ' + antes.toFixed(2) + '</span>' +
          '<span class="plato__ahora">S/ ' + precio.toFixed(2) + '</span>' +
        '</div>' +
        '<div class="plato__pie">' +
          '<span class="insignia insignia--vino">-' + pct + '%</span>' +
          '<button class="btn btn--eco" type="button" onclick="agregarAlPedido(' + p.id + ', \'' + nombreJs + '\', ' + precio + ')">' +
          (esOferta ? 'Reservar' : 'Añadir') + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
}

async function cargarPlatos() {
  var grid = document.getElementById('grid-platos') ||
             document.getElementById('grid-ofertas') ||
             document.getElementById('grid-destacados');
  if (grid === null) return;

  var esOferta = grid.id === 'grid-ofertas';
  var q = sb.from('platos').select('*').eq('activo', true).order('id');
  if (esOferta) q = q.not('precio_oferta', 'is', null);
  else if (grid.id === 'grid-destacados') q = q.eq('destacado', true);

  var res = await q;
  var platos = res.data || [];
  var html = '';
  for (var i = 0; i < platos.length; i++) html += tarjetaPlato(platos[i], esOferta);
  grid.innerHTML = html;
}

/* ---- Filtro del menú (sobre las tarjetas ya pintadas) ---- */
function filtrarPlatos(categoria, boton) {
  var platos = document.getElementsByClassName('plato');
  for (var i = 0; i < platos.length; i++) {
    var cat = platos[i].getAttribute('data-categoria');
    platos[i].style.display = (categoria === 'todos' || cat === categoria) ? 'flex' : 'none';
  }
  var filtros = document.getElementsByClassName('filtro');
  for (var j = 0; j < filtros.length; j++) filtros[j].classList.remove('activo');
  boton.classList.add('activo');
}

/* ---- Pedidos: compra (pedidos + pedido_items), órdenes y devoluciones ---- */

/* COMPRA: guarda la cabecera y su detalle en dos pasos (revierte si falla el detalle). */
async function enviarPedido(evento) {
  evento.preventDefault();
  var error = document.getElementById('error-pedido');
  var carrito = leerCarrito();

  if (carrito.length === 0) { error.textContent = 'Tu carrito está vacío. Agrega platos desde el menú.'; return false; }

  var usuario = await usuarioActual();
  if (usuario === null) {
    error.textContent = 'Inicia sesión para confirmar tu pedido.';
    setTimeout(function () { window.location.href = 'login.html'; }, 1300);
    return false;
  }

  var cliente = document.getElementById('cliente').value.trim();
  var telefono = document.getElementById('telefono').value.trim();
  if (cliente === '') { error.textContent = 'Escribe tu nombre.'; return false; }
  if (telefono.length < 9) { error.textContent = 'Escribe un teléfono válido (9 dígitos).'; return false; }
  error.textContent = '';

  if (confirm('¿Confirmas tu pedido de rescate, ' + cliente + '?') === false) return false;

  var total = 0;
  for (var i = 0; i < carrito.length; i++) total = total + carrito[i].precio * carrito[i].cant;

  // 1) cabecera del pedido
  var resP = await sb.from('pedidos').insert({
    cliente: cliente,
    telefono: telefono,
    hora: document.getElementById('hora').value,
    metodo: document.getElementById('metodo').value,
    notas: document.getElementById('notas').value.trim(),
    total: total
  }).select('id').single();
  if (resP.error) { error.textContent = 'No se pudo guardar tu pedido. Intenta de nuevo.'; return false; }

  // 2) detalle (un renglón por plato)
  var filas = [];
  for (var k = 0; k < carrito.length; k++) {
    filas.push({ pedido_id: resP.data.id, plato_id: carrito[k].id, cantidad: carrito[k].cant, precio_unitario: carrito[k].precio });
  }
  var resI = await sb.from('pedido_items').insert(filas);
  if (resI.error) {
    await sb.from('pedidos').delete().eq('id', resP.data.id); // revierte la cabecera huérfana
    error.textContent = 'No se pudo guardar tu pedido. Intenta de nuevo.';
    return false;
  }

  guardarCarrito([]);
  actualizarContador();
  pintarCarrito();
  document.getElementById('modal-texto').textContent =
    '¡Gracias, ' + cliente + '! Tu pedido de rescate quedó registrado. Lo puedes ver en Mis pedidos.';
  abrirModal('modal-ok');
  return false;
}

/* ÓRDENES: trae los pedidos del usuario con su detalle y devolución (JOIN). */
var pedidosCache = [];

async function cargarPedidos() {
  var cuerpo = document.getElementById('tbody-pedidos');
  if (cuerpo === null) return;
  var aviso = document.getElementById('pedidos-aviso');

  var usuario = await usuarioActual();
  if (usuario === null) {
    pedidosCache = [];
    if (aviso) { aviso.innerHTML = 'Inicia sesión para ver tus pedidos. <a href="login.html">Ingresar</a>.'; aviso.style.display = 'block'; }
    pintarMisPedidos('todos');
    return;
  }

  var res = await sb.from('pedidos')
    .select('id, cliente, total, estado, created_at, pedido_items(cantidad, platos(nombre)), devoluciones(motivo)')
    .order('created_at', { ascending: false });
  pedidosCache = res.data || [];
  if (aviso) {
    aviso.textContent = 'Todavía no tienes pedidos. Arma uno desde el menú.';
    aviso.style.display = pedidosCache.length === 0 ? 'block' : 'none';
  }
  pintarMisPedidos('todos');
}

function pintarMisPedidos(filtro) {
  var cuerpo = document.getElementById('tbody-pedidos');
  if (cuerpo === null) return;

  var datos = pedidosCache;
  if (filtro && filtro !== 'todos') {
    datos = [];
    for (var k = 0; k < pedidosCache.length; k++) if (pedidosCache[k].estado === filtro) datos.push(pedidosCache[k]);
  }

  cuerpo.innerHTML = '';
  for (var i = 0; i < datos.length; i++) {
    var p = datos[i];
    var items = p.pedido_items || [];
    var nombres = [];
    for (var j = 0; j < items.length; j++) nombres.push((items[j].platos ? items[j].platos.nombre : '—') + ' x' + items[j].cantidad);
    var accion = p.estado === 'devuelto'
      ? '<span class="estado estado--devuelto">devuelto</span>'
      : '<button type="button" class="btn btn--linea btn--mini" onclick="solicitarDevolucion(' + p.id + ')">Devolver</button>';
    var fila = document.createElement('tr');
    fila.innerHTML =
      '<td>KR-' + String(p.id).padStart(4, '0') + '</td>' +
      '<td>' + p.cliente + '</td>' +
      '<td>' + nombres.join(', ') + '</td>' +
      '<td>S/ ' + Number(p.total).toFixed(2) + '</td>' +
      '<td>' + new Date(p.created_at).toLocaleDateString('es-PE') + '</td>' +
      '<td><span class="estado estado--' + p.estado + '">' + p.estado + '</span></td>' +
      '<td>' + accion + '</td>';
    cuerpo.appendChild(fila);
  }

  var monto = 0, platos = 0;
  for (var m = 0; m < pedidosCache.length; m++) {
    monto = monto + Number(pedidosCache[m].total);
    var its = pedidosCache[m].pedido_items || [];
    for (var n = 0; n < its.length; n++) platos = platos + its[n].cantidad;
  }
  document.getElementById('kpi-total').textContent = pedidosCache.length;
  document.getElementById('kpi-monto').textContent = 'S/ ' + monto.toFixed(2);
  document.getElementById('kpi-platos').textContent = platos;
}

function filtrarMisPedidos(valor) { pintarMisPedidos(valor); }

/* DEVOLUCIÓN: registra la devolución y marca el pedido como devuelto. */
async function solicitarDevolucion(id) {
  var motivo = prompt('¿Por qué quieres devolver este pedido?');
  if (motivo === null || motivo.trim() === '') return;
  var resD = await sb.from('devoluciones').insert({ pedido_id: id, motivo: motivo.trim() });
  if (resD.error) { alert('No se pudo registrar la devolución. Intenta de nuevo.'); return; }
  await sb.from('pedidos').update({ estado: 'devuelto' }).eq('id', id);
  cargarPedidos();
}

document.addEventListener('DOMContentLoaded', function () {
  actualizarContador();
  pintarCarrito();
  cargarPlatos();
  cargarPedidos();
});
