/* ============================================================
   KULTO RESCATA — JavaScript del sitio
   Taller de Programación Web · APF3 · UTP

   Solo se usan conceptos del sílabo (Unidad 3):
   - Variables, constantes y operadores
   - Estructuras de control y arreglos
   - Métodos de entrada/salida: prompt, confirm, alert
   - Eventos desde HTML: onclick, onchange, oninput, onsubmit
   - Manipulación del DOM con document
   - Menú responsivo y ventanas flotantes
   ============================================================ */

/* ------------------------------------------------------------
   1. MENÚ RESPONSIVO — abre/cierra la navegación en móvil
   ------------------------------------------------------------ */
function alternarMenu() {
  var nav = document.getElementById('nav');
  var boton = document.getElementById('burger');
  // toggle: si está abierto lo cierra, si no lo abre
  nav.classList.toggle('abierto');
  var abierto = nav.classList.contains('abierto');
  boton.setAttribute('aria-expanded', abierto);
}

/* ------------------------------------------------------------
   2. VENTANAS FLOTANTES (modales)
   ------------------------------------------------------------ */
function abrirModal(id) {
  document.getElementById(id).classList.add('abierto');
}
function cerrarModal(id) {
  document.getElementById(id).classList.remove('abierto');
}

/* ------------------------------------------------------------
   3. VALIDACIÓN DEL FORMULARIO DE LOGIN (login.html)
   ------------------------------------------------------------ */
function validarLogin(evento) {
  evento.preventDefault(); // evita que el formulario recargue la página
  var correo = document.getElementById('correo').value;
  var clave = document.getElementById('clave').value;
  var error = document.getElementById('error-login');
  var mensaje = '';

  if (correo === '') {
    mensaje = 'Escribe tu correo.';
  } else if (correo.indexOf('@') === -1 || correo.indexOf('.') === -1) {
    mensaje = 'El correo no tiene un formato válido.';
  } else if (clave === '') {
    mensaje = 'Escribe tu contraseña.';
  } else if (clave.length < 6) {
    mensaje = 'La contraseña debe tener al menos 6 caracteres.';
  }

  if (mensaje !== '') {
    error.textContent = mensaje;
    return false;
  }
  error.textContent = '';
  abrirModal('modal-ok');
  return true;
}

/* ------------------------------------------------------------
   4. VALIDACIÓN DEL REGISTRO (registrar.html)
   ------------------------------------------------------------ */
// se llama en cada tecla para avisar si las contraseñas no coinciden
function verificarClaves() {
  var clave = document.getElementById('clave').value;
  var repetir = document.getElementById('repetir').value;
  var aviso = document.getElementById('error-repetir');
  if (repetir !== '' && clave !== repetir) {
    aviso.textContent = 'Las contraseñas no coinciden.';
  } else {
    aviso.textContent = '';
  }
}

function validarRegistro(evento) {
  evento.preventDefault();
  var nombre = document.getElementById('nombre').value;
  var correo = document.getElementById('correo').value;
  var clave = document.getElementById('clave').value;
  var repetir = document.getElementById('repetir').value;
  var terminos = document.getElementById('terminos').checked;
  var error = document.getElementById('error-registro');
  var mensaje = '';

  if (nombre === '') {
    mensaje = 'Escribe tu nombre.';
  } else if (correo.indexOf('@') === -1 || correo.indexOf('.') === -1) {
    mensaje = 'El correo no tiene un formato válido.';
  } else if (clave.length < 6) {
    mensaje = 'La contraseña debe tener al menos 6 caracteres.';
  } else if (clave !== repetir) {
    mensaje = 'Las contraseñas no coinciden.';
  } else if (terminos === false) {
    mensaje = 'Debes aceptar los términos para crear tu cuenta.';
  }

  if (mensaje !== '') {
    error.textContent = mensaje;
    return false;
  }
  error.textContent = '';
  // saludo personalizado en el modal
  document.getElementById('modal-nombre').textContent = nombre;
  abrirModal('modal-ok');
  return true;
}

/* ------------------------------------------------------------
   5. MENÚ / OFERTAS — filtros y "añadir al pedido"
   ------------------------------------------------------------ */
// arreglo que guarda lo que el usuario va agregando
var pedidoActual = [];

function filtrarPlatos(categoria, boton) {
  var platos = document.getElementsByClassName('plato');
  // recorre todas las tarjetas y muestra/oculta según la categoría
  for (var i = 0; i < platos.length; i++) {
    var cat = platos[i].getAttribute('data-categoria');
    if (categoria === 'todos' || cat === categoria) {
      platos[i].style.display = 'flex';
    } else {
      platos[i].style.display = 'none';
    }
  }
  // marca el botón activo
  var filtros = document.getElementsByClassName('filtro');
  for (var j = 0; j < filtros.length; j++) {
    filtros[j].classList.remove('activo');
  }
  boton.classList.add('activo');
}

function agregarAlPedido(nombre, precio) {
  pedidoActual.push({ nombre: nombre, precio: precio });
  // actualiza el contador visible en el encabezado
  var contador = document.getElementById('contador-pedido');
  if (contador !== null) {
    contador.textContent = pedidoActual.length;
    contador.style.display = 'inline-flex';
  }
  // muestra confirmación en la ventana flotante
  var texto = document.getElementById('modal-texto');
  if (texto !== null) {
    texto.textContent = 'Agregaste "' + nombre + '" a tu rescate. Llevas ' +
      pedidoActual.length + ' plato(s).';
  }
  abrirModal('modal-ok');
}

/* ------------------------------------------------------------
   6. FORMULARIO DE PEDIDO (form_pedido.html)
   ------------------------------------------------------------ */
function calcularTotal() {
  var select = document.getElementById('plato');
  var cantidad = document.getElementById('cantidad').value;
  // el precio viaja en el atributo data-precio de la opción elegida
  var opcion = select.options[select.selectedIndex];
  var precio = Number(opcion.getAttribute('data-precio'));
  var cant = Number(cantidad);
  if (cant < 1 || isNaN(cant)) {
    cant = 1;
  }
  var total = precio * cant;

  document.getElementById('res-plato').textContent = opcion.text;
  document.getElementById('res-cantidad').textContent = cant;
  document.getElementById('res-unitario').textContent = 'S/ ' + precio.toFixed(2);
  document.getElementById('res-total').textContent = 'S/ ' + total.toFixed(2);
}

function enviarPedido(evento) {
  evento.preventDefault();
  var nombre = document.getElementById('cliente').value;
  var telefono = document.getElementById('telefono').value;
  var error = document.getElementById('error-pedido');

  if (nombre === '') {
    error.textContent = 'Escribe tu nombre.';
    return false;
  }
  if (telefono.length < 9) {
    error.textContent = 'Escribe un teléfono válido (9 dígitos).';
    return false;
  }
  error.textContent = '';

  // confirmación antes de registrar el pedido
  var seguro = confirm('¿Confirmas tu pedido de rescate, ' + nombre + '?');
  if (seguro === true) {
    document.getElementById('modal-texto').textContent =
      '¡Gracias, ' + nombre + '! Tu pedido de rescate quedó registrado. ' +
      'Te esperamos para recogerlo.';
    abrirModal('modal-ok');
  }
  return seguro;
}

/* ------------------------------------------------------------
   7. TABLA DE PEDIDOS REALIZADOS (pedidos.html)
   ------------------------------------------------------------ */
// datos de ejemplo (arreglo de objetos) que se pintan en la tabla con el DOM
var pedidos = [
  { id: 'KR-1042', cliente: 'María Salas',   plato: 'French Toast',            cant: 2, total: 24.0, estado: 'listo' },
  { id: 'KR-1043', cliente: 'Diego Rojas',   plato: 'Butifarra',               cant: 1, total: 12.0, estado: 'pendiente' },
  { id: 'KR-1044', cliente: 'Lucía Fernández', plato: 'Bowl de Yogurt',        cant: 3, total: 33.0, estado: 'entregado' },
  { id: 'KR-1045', cliente: 'Carlos Medina', plato: 'Panqueques de Pistacho',  cant: 1, total: 15.6, estado: 'pendiente' },
  { id: 'KR-1046', cliente: 'Ana Torres',    plato: 'Media Luna Jamón y Queso', cant: 4, total: 28.8, estado: 'listo' }
];

// dibuja las filas de la tabla a partir del arreglo
function pintarPedidos(lista) {
  var cuerpo = document.getElementById('tbody-pedidos');
  cuerpo.innerHTML = '';
  for (var i = 0; i < lista.length; i++) {
    var p = lista[i];
    var fila = document.createElement('tr');
    fila.innerHTML =
      '<td>' + p.id + '</td>' +
      '<td>' + p.cliente + '</td>' +
      '<td>' + p.plato + '</td>' +
      '<td>' + p.cant + '</td>' +
      '<td>S/ ' + p.total.toFixed(2) + '</td>' +
      '<td><span class="estado estado--' + p.estado + '">' + p.estado + '</span></td>';
    cuerpo.appendChild(fila);
  }
  // actualiza los indicadores de arriba
  document.getElementById('kpi-total').textContent = lista.length;
  var monto = 0;
  var platos = 0;
  for (var j = 0; j < lista.length; j++) {
    monto = monto + lista[j].total;
    platos = platos + lista[j].cant;
  }
  document.getElementById('kpi-monto').textContent = 'S/ ' + monto.toFixed(2);
  document.getElementById('kpi-platos').textContent = platos;
}

// filtra la tabla por estado (se llama con onchange del select)
function filtrarEstado(valor) {
  if (valor === 'todos') {
    pintarPedidos(pedidos);
    return;
  }
  var filtrados = [];
  for (var i = 0; i < pedidos.length; i++) {
    if (pedidos[i].estado === valor) {
      filtrados.push(pedidos[i]);
    }
  }
  pintarPedidos(filtrados);
}

// agrega un pedido nuevo pidiendo los datos con prompt (entrada de datos)
function agregarPedido() {
  var cliente = prompt('Nombre del cliente:');
  if (cliente === null || cliente === '') {
    return;
  }
  var plato = prompt('Plato rescatado:');
  if (plato === null || plato === '') {
    return;
  }
  var cant = Number(prompt('Cantidad:'));
  if (isNaN(cant) || cant < 1) {
    cant = 1;
  }
  var precioUnit = Number(prompt('Precio unitario (S/):'));
  if (isNaN(precioUnit) || precioUnit < 0) {
    precioUnit = 0;
  }
  var nuevo = {
    id: 'KR-' + (1047 + pedidos.length - 5),
    cliente: cliente,
    plato: plato,
    cant: cant,
    total: precioUnit * cant,
    estado: 'pendiente'
  };
  pedidos.push(nuevo);
  pintarPedidos(pedidos);
  alert('Pedido ' + nuevo.id + ' agregado correctamente.');
}

// se ejecuta cuando la página de pedidos termina de cargar
function iniciarPedidos() {
  pintarPedidos(pedidos);
}

/* ------------------------------------------------------------
   8. ARRANQUE — se ejecuta al terminar de cargar cada página.
   Detecta qué página es (según los elementos presentes) e
   inicia lo que corresponda. Así el mismo archivo sirve a todas.
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', function () {
  // página de pedidos: si existe la tabla, la pinta con los datos
  if (document.getElementById('tbody-pedidos') !== null) {
    iniciarPedidos();
  }
  // formulario de pedido: si existe el resumen, calcula el total inicial
  if (document.getElementById('res-total') !== null) {
    calcularTotal();
  }
});
