function alternarMenu() {
  var nav = document.getElementById('nav');
  var boton = document.getElementById('burger');
  nav.classList.toggle('abierto');
  boton.setAttribute('aria-expanded', nav.classList.contains('abierto'));
}

function abrirModal(id) {
  var m = document.getElementById(id);
  if (m) m.classList.add('abierto');
}
function cerrarModal(id) {
  var m = document.getElementById(id);
  if (m) m.classList.remove('abierto');
}

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

function cantidadTotal(carrito) {
  var n = 0;
  for (var i = 0; i < carrito.length; i++) {
    n = n + carrito[i].cant;
  }
  return n;
}

function actualizarContador() {
  var contador = document.getElementById('contador-pedido');
  if (contador === null) return;
  var total = cantidadTotal(leerCarrito());
  contador.textContent = total;
  contador.style.display = total > 0 ? 'inline-flex' : 'none';
}

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
    guardarPedido(nombre, telefono, carrito);
    document.getElementById('modal-texto').textContent =
      '¡Gracias, ' + nombre + '! Tu pedido de rescate quedó registrado. ' +
      'Lo puedes ver en Mis pedidos. Te esperamos para recogerlo.';
    guardarCarrito([]);
    actualizarContador();
    pintarCarrito();
    abrirModal('modal-ok');
  }
  return seguro;
}

var CLAVE_PEDIDOS = 'kr_pedidos';

var PEDIDOS_DEMO = [
  { id: 'KR-1042', cliente: 'María Salas', items: [{ nombre: 'French Toast', cant: 2 }], total: 24.0, fecha: '01/07/2026', estado: 'listo' },
  { id: 'KR-1043', cliente: 'Diego Rojas', items: [{ nombre: 'Butifarra', cant: 1 }], total: 12.0, fecha: '01/07/2026', estado: 'pendiente' },
  { id: 'KR-1044', cliente: 'Lucía Fernández', items: [{ nombre: 'Bowl de Yogurt', cant: 3 }], total: 33.0, fecha: '02/07/2026', estado: 'entregado' }
];

function leerPedidos() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PEDIDOS)) || [];
  } catch (e) {
    return [];
  }
}
function guardarPedidos(lista) {
  localStorage.setItem(CLAVE_PEDIDOS, JSON.stringify(lista));
}

function guardarPedido(cliente, telefono, items) {
  var pedidos = leerPedidos();
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    total = total + items[i].precio * items[i].cant;
  }
  var d = new Date();
  pedidos.unshift({
    id: 'KR-' + String(d.getTime()).slice(-5),
    cliente: cliente,
    telefono: telefono,
    items: items.slice(),
    total: total,
    fecha: d.toLocaleDateString('es-PE'),
    estado: 'pendiente'
  });
  guardarPedidos(pedidos);
}

function pintarMisPedidos(filtro) {
  var cuerpo = document.getElementById('tbody-pedidos');
  if (cuerpo === null) return;

  var reales = leerPedidos();
  var base = reales.length > 0 ? reales : PEDIDOS_DEMO;
  var datos = base;
  if (filtro && filtro !== 'todos') {
    datos = [];
    for (var k = 0; k < base.length; k++) {
      if (base[k].estado === filtro) datos.push(base[k]);
    }
  }

  cuerpo.innerHTML = '';
  for (var i = 0; i < datos.length; i++) {
    var p = datos[i];
    var nombres = [];
    for (var j = 0; j < p.items.length; j++) {
      nombres.push(p.items[j].nombre + ' x' + p.items[j].cant);
    }
    var fila = document.createElement('tr');
    fila.innerHTML =
      '<td>' + p.id + '</td>' +
      '<td>' + p.cliente + '</td>' +
      '<td>' + nombres.join(', ') + '</td>' +
      '<td>S/ ' + p.total.toFixed(2) + '</td>' +
      '<td>' + p.fecha + '</td>' +
      '<td><span class="estado estado--' + p.estado + '">' + p.estado + '</span></td>';
    cuerpo.appendChild(fila);
  }

  var aviso = document.getElementById('pedidos-demo-aviso');
  if (aviso !== null) aviso.style.display = reales.length > 0 ? 'none' : 'block';

  var monto = 0, platos = 0;
  for (var m = 0; m < base.length; m++) {
    monto = monto + base[m].total;
    for (var n = 0; n < base[m].items.length; n++) platos = platos + base[m].items[n].cant;
  }
  document.getElementById('kpi-total').textContent = base.length;
  document.getElementById('kpi-monto').textContent = 'S/ ' + monto.toFixed(2);
  document.getElementById('kpi-platos').textContent = platos;
}

function filtrarMisPedidos(valor) {
  pintarMisPedidos(valor);
}

function vaciarPedidos() {
  var seguro = confirm('¿Borrar tu historial de pedidos en este dispositivo?');
  if (seguro === true) {
    guardarPedidos([]);
    pintarMisPedidos('todos');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  actualizarContador();
  pintarCarrito();
  pintarMisPedidos();
});
