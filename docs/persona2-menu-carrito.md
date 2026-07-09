# Persona 2 — Menú, Catálogo y Carrito

Me toca la parte que convierte los datos de la tabla `platos` en tarjetas visibles y el carrito de compra que vive en el navegador. En pocas palabras: pinto cada plato como una tarjeta, filtro esas tarjetas por categoría, guardo lo que el usuario va agregando en `localStorage` y dibujo el resumen del pedido. Todo esto alimenta el formulario de pedido, donde Persona 1 recién manda la compra a la base de datos.

## Archivos y funciones a mi cargo

- **`js/main.js`** — mis funciones:
  - `tarjetaPlato(p, esOferta)` — arma el HTML de una tarjeta de plato.
  - `filtrarPlatos(categoria, boton)` — filtro por categoría sobre las tarjetas ya pintadas.
  - `CLAVE_CARRITO` (constante), `leerCarrito()`, `guardarCarrito(carrito)` — persistencia del carrito en `localStorage`.
  - `cantidadTotal(carrito)`, `actualizarContador()` — la insignia contadora del menú.
  - `agregarAlPedido(id, nombre, precio)` — añade un plato al carrito.
  - `quitarDelCarrito(id)` — quita un plato del carrito.
  - `pintarCarrito()` — dibuja el resumen del carrito y el total.
- **`menu.html`** — contenedor `#grid-platos` y los botones de filtro.
- **`ofertas.html`** — contenedor `#grid-ofertas`.
- **`index.html`** — contenedor `#grid-destacados`.
- **`form_pedido.html`** — el `aside.resumen` del carrito (`#carrito-items`, `#carrito-vacio`, `#res-total`).

> **Nota de handoff:** `tarjetaPlato` la llama `cargarPlatos` (Persona 1), que trae los platos de Supabase y recorre el arreglo llamando a mi función por cada uno. El carrito que yo lleno lo consume `enviarPedido` (Persona 1) para registrar la compra y luego lo vacía con `guardarCarrito([])`. Menciono esas dos funciones ajenas pero no las explico acá.

## Explicación línea por línea

### tarjetaPlato()

**Qué hace:** Recibe un plato `p` (una fila de la tabla `platos`) y un booleano `esOferta`, y devuelve un string con el HTML completo de una tarjeta lista para insertar en un grid.

**Cómo funciona (línea por línea):**

```js
function tarjetaPlato(p, esOferta) {
  var precio = esOferta ? Number(p.precio_oferta) : Number(p.precio);
  var antes = Number(p.precio_antes);
  var pct = Math.round((1 - precio / antes) * 100);
  var nombreJs = p.nombre.replace(/'/g, "\\'");
  return '' +
    '<article class="plato' + (esOferta ? ' oferta' : '') + '" data-categoria="' + p.categoria + '">' +
      '<div class="plato__foto">' +
        '<span class="plato__inicial">' + p.nombre.charAt(0) + '</span>' +
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
```

- `var precio = esOferta ? Number(p.precio_oferta) : Number(p.precio);` — operador ternario: si la tarjeta es de la página de ofertas, el precio a mostrar y a cobrar es `precio_oferta`; si no, el `precio` normal. `Number(...)` fuerza a que el valor de la BD sea un número (para poder hacer cuentas y usar `.toFixed`).
- `var antes = Number(p.precio_antes);` — el precio original, antes del descuento. También convertido a número.
- `var pct = Math.round((1 - precio / antes) * 100);` — calcula el porcentaje de descuento. `precio / antes` es la fracción del precio que aún se paga (ej. 6/10 = 0.6); `1 - 0.6 = 0.4` es lo que se ahorra; `* 100` lo pasa a porcentaje (40); `Math.round` lo redondea a entero para no mostrar decimales feos.
- `var nombreJs = p.nombre.replace(/'/g, "\\'");` — **escape de comillas**. El nombre va a ir metido dentro de un `onclick="agregarAlPedido(... , '...' , ...)"`. Si el nombre trae una comilla simple (ej. `Té d'Alicia`), rompería ese string de JavaScript. Este `replace` con la expresión regular `/'/g` (la `g` = todas las apariciones) cambia cada `'` por `\'` (comilla escapada), para que el `onclick` siga siendo válido.
- `return '' + ...` — arma la tarjeta concatenando fragmentos de texto con el operador `+`. (Es un HTML por plantilla hecho con concatenación de strings, no con backticks; el resultado es el mismo: un solo string.)
- `'<article class="plato' + (esOferta ? ' oferta' : '') + '" data-categoria="' + p.categoria + '">'` — abre la tarjeta. Si es oferta le añade la clase `oferta`. El atributo `data-categoria` guarda la categoría del plato (`cafe`, `dulce`, etc.); es la marca que después lee `filtrarPlatos`.
- `<span class="plato__inicial">' + p.nombre.charAt(0) + '</span>` — como no hay foto real, muestra la **primera letra** del nombre (`charAt(0)`) como marcador visual.
- Las dos insignias fijas: `Rescatado` y `Vence ` + `p.vence` (la fecha de vencimiento que viene de la BD).
- `plato__nombre` y `plato__desc` — imprimen `p.nombre` y `p.descripcion` tal cual.
- `antes.toFixed(2)` y `precio.toFixed(2)` — muestran ambos precios con **exactamente 2 decimales** (ej. `S/ 6.00`).
- `'-' + pct + '%'` — la insignia con el descuento calculado arriba.
- `onclick="agregarAlPedido(' + p.id + ', \'' + nombreJs + '\', ' + precio + ')"` — el botón lleva incrustada la llamada a **mi** función `agregarAlPedido` con el id (número), el nombre escapado entre comillas simples (`\'` en el string genera un `'` literal en el HTML) y el precio (número). Al hacer clic, ese código se ejecuta.
- `(esOferta ? 'Reservar' : 'Añadir')` — el texto del botón cambia según el contexto: en ofertas dice **Reservar**, en el menú normal dice **Añadir**.

**Se conecta con:** La llama `cargarPlatos` (**Persona 1**), que trae los platos de Supabase y hace `html += tarjetaPlato(platos[i], esOferta)` en un bucle. El botón que genero apunta a `agregarAlPedido` (mía).

### filtrarPlatos()

**Qué hace:** Muestra u oculta las tarjetas ya pintadas según la categoría elegida, sin volver a consultar la base de datos.

**Cómo funciona (línea por línea):**

```js
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
```

- `var platos = document.getElementsByClassName('plato');` — agarra todas las tarjetas (cada `<article class="plato">` que pintó `tarjetaPlato`). Devuelve una colección viva que recorro con un `for`.
- `var cat = platos[i].getAttribute('data-categoria');` — lee la categoría que guardé en `data-categoria` de cada tarjeta.
- `platos[i].style.display = (categoria === 'todos' || cat === categoria) ? 'flex' : 'none';` — decide la visibilidad: si el filtro es `'todos'` **o** la categoría de la tarjeta coincide con la pedida, la muestra (`display: flex`, porque la tarjeta usa flexbox); si no, la oculta (`display: none`). Ojo: no borra nada del DOM, solo lo esconde con CSS.
- `var filtros = document.getElementsByClassName('filtro');` + `for (... ) filtros[j].classList.remove('activo');` — recorre todos los botones de filtro y les quita la clase `activo` (apaga el resaltado del que estaba marcado antes).
- `boton.classList.add('activo');` — al botón que se clickeó (`boton`, que llega como `this` desde el HTML) le pone la clase `activo` para resaltarlo.

**Se conecta con:** La disparan los botones de filtro en `menu.html` (`onclick="filtrarPlatos('cafe', this)"`). No llama a otras funciones; solo lee el `data-categoria` que dejó `tarjetaPlato`.

### CLAVE_CARRITO, leerCarrito() y guardarCarrito()

**Qué hace:** `CLAVE_CARRITO` es el nombre de la casilla en `localStorage` donde vive el carrito. `leerCarrito` lo recupera como arreglo y `guardarCarrito` lo escribe. Son la base de todo el carrito.

**Cómo funciona (línea por línea):**

```js
const CLAVE_CARRITO = 'kr_carrito';

function leerCarrito() {
  try { return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || []; } catch (e) { return []; }
}
function guardarCarrito(carrito) { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito)); }
```

- `const CLAVE_CARRITO = 'kr_carrito';` — constante con la clave. Usar una constante evita escribir mal el nombre `'kr_carrito'` en cada lugar; si un día cambia, se cambia en un solo sitio.
- `leerCarrito`:
  - `localStorage.getItem(CLAVE_CARRITO)` — devuelve lo guardado como **texto**, o `null` si nunca se guardó nada.
  - `JSON.parse(...)` — convierte ese texto de vuelta a un arreglo de objetos JavaScript. Si el valor era `null`, `JSON.parse(null)` da `null`.
  - `... || []` — si el resultado es `null` o vacío, devuelve un arreglo vacío `[]`. Así quien llame siempre recibe un arreglo utilizable, nunca `null`.
  - `try { ... } catch (e) { return []; }` — si el texto guardado estuviera corrupto y `JSON.parse` lanzara error, el `catch` lo atrapa y devuelve `[]` en vez de romper la página.
- `guardarCarrito(carrito)`:
  - `JSON.stringify(carrito)` — convierte el arreglo a texto (localStorage solo guarda strings).
  - `localStorage.setItem(CLAVE_CARRITO, ...)` — lo escribe en la casilla `kr_carrito`. Persiste aunque se cierre la pestaña.

**Se conecta con:** `leerCarrito` la usan `actualizarContador`, `agregarAlPedido`, `quitarDelCarrito`, `pintarCarrito` (mías) y `enviarPedido` (**Persona 1**). `guardarCarrito` la usan `agregarAlPedido`, `quitarDelCarrito` (mías) y `enviarPedido`, que además la llama con `[]` para vaciar el carrito tras confirmar la compra.

### cantidadTotal()

**Qué hace:** Suma cuántos platos hay en total en el carrito (sumando las cantidades, no contando renglones).

**Cómo funciona (línea por línea):**

```js
function cantidadTotal(carrito) {
  var n = 0;
  for (var i = 0; i < carrito.length; i++) n = n + carrito[i].cant;
  return n;
}
```

- `var n = 0;` — acumulador en cero.
- `for (var i = 0; i < carrito.length; i++) n = n + carrito[i].cant;` — recorre el arreglo y va sumando el campo `cant` (cantidad) de cada ítem. Si tengo 2 cafés y 1 pan, devuelve 3 (no 2 renglones).
- `return n;` — entrega el total.

**Se conecta con:** La llaman `actualizarContador` y `agregarAlPedido` (ambas mías).

### actualizarContador()

**Qué hace:** Actualiza la insignia numérica (`#contador-pedido`) que aparece junto al enlace "Pedir" en el menú, y la oculta si el carrito está vacío.

**Cómo funciona (línea por línea):**

```js
function actualizarContador() {
  var contador = document.getElementById('contador-pedido');
  if (contador === null) return;
  var total = cantidadTotal(leerCarrito());
  contador.textContent = total;
  contador.style.display = total > 0 ? 'inline-flex' : 'none';
}
```

- `var contador = document.getElementById('contador-pedido');` — busca el `<span>` de la insignia.
- `if (contador === null) return;` — si esa página no tiene la insignia, corta sin error. (Guardia defensiva porque el mismo `main.js` corre en todas las páginas.)
- `var total = cantidadTotal(leerCarrito());` — lee el carrito y calcula el total de platos.
- `contador.textContent = total;` — escribe ese número dentro del span. Uso `textContent` (no `innerHTML`) porque es solo un número: es más seguro y rápido.
- `contador.style.display = total > 0 ? 'inline-flex' : 'none';` — si hay al menos un plato, muestra la insignia (`inline-flex`); si está en cero, la esconde.

**Se conecta con:** La llaman `agregarAlPedido`, `quitarDelCarrito` (mías), `enviarPedido` (**Persona 1**) y el `DOMContentLoaded` al cargar cualquier página.

### agregarAlPedido()

**Qué hace:** Agrega un plato al carrito. Si el plato ya estaba, le suma 1 a la cantidad; si es nuevo, lo mete con cantidad 1. Luego confirma con un modal.

**Cómo funciona (línea por línea):**

```js
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
```

- `var carrito = leerCarrito();` — trae el carrito actual desde `localStorage`.
- `var encontrado = false;` — bandera para saber si el plato ya estaba.
- El `for` recorre el carrito; `if (carrito[i].id === id)` compara por **id** (comparación estricta `===`). Si el plato ya existe, le suma 1 a `cant` y marca `encontrado = true`. Así no se duplican renglones del mismo plato.
- `if (encontrado === false) carrito.push({ id: id, nombre: nombre, precio: precio, cant: 1 });` — si no estaba, agrega un objeto nuevo con `push`, guardando id, nombre, precio y cantidad inicial 1.
- `guardarCarrito(carrito);` — persiste el carrito actualizado.
- `actualizarContador();` — refresca la insignia del menú.
- `var texto = document.getElementById('modal-texto');` + el `if` — si existe el texto del modal, escribe un mensaje de confirmación con el nombre del plato y el total de platos (`cantidadTotal`). Usa `textContent`.
- `abrirModal('modal-ok');` — abre el modal de "¡Listo!" (función de la parte de interfaz).

**Se conecta con:** La invoca el botón `onclick` que genera `tarjetaPlato` (mía). Usa `leerCarrito`, `guardarCarrito`, `actualizarContador`, `cantidadTotal` (mías) y `abrirModal` (de interfaz).

### quitarDelCarrito()

**Qué hace:** Elimina del carrito el plato cuyo id se le pasa y vuelve a dibujar el resumen.

**Cómo funciona (línea por línea):**

```js
function quitarDelCarrito(id) {
  var carrito = leerCarrito();
  var nuevo = [];
  for (var i = 0; i < carrito.length; i++) if (carrito[i].id !== id) nuevo.push(carrito[i]);
  guardarCarrito(nuevo);
  actualizarContador();
  pintarCarrito();
}
```

- `var carrito = leerCarrito();` — lee el carrito actual.
- `var nuevo = [];` — arreglo vacío donde voy a copiar lo que se queda.
- `for (...) if (carrito[i].id !== id) nuevo.push(carrito[i]);` — recorre el carrito y con `push` copia a `nuevo` todos los platos **menos** el que tiene el id a quitar (`!==`). Es un filtro hecho a mano: en vez de borrar del arreglo, construyo uno sin el elemento.
- `guardarCarrito(nuevo);` — guarda el carrito ya sin ese plato.
- `actualizarContador();` — refresca la insignia.
- `pintarCarrito();` — vuelve a dibujar el resumen para que la fila desaparezca en pantalla.

**Se conecta con:** La dispara el botón `×` (Quitar) que genera `pintarCarrito`. Usa `leerCarrito`, `guardarCarrito`, `actualizarContador` y `pintarCarrito` (todas mías).

### pintarCarrito()

**Qué hace:** Dibuja el resumen del pedido en el `aside` de `form_pedido.html`: una fila por plato con su subtotal y botón de quitar, más el total general.

**Cómo funciona (línea por línea):**

```js
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
```

- `var cont = document.getElementById('carrito-items');` — el contenedor donde van las filas.
- `if (cont === null) return;` — si la página no tiene resumen (ej. el menú), corta. Por eso `pintarCarrito` puede correr en cualquier página sin romper.
- `var carrito = leerCarrito();` — trae el carrito.
- `var vacio = document.getElementById('carrito-vacio');` — el mensaje de "carrito vacío".
- `var total = 0;` — acumulador del total.
- `cont.innerHTML = '';` — **limpia** el contenedor antes de redibujar, para no duplicar filas.
- `if (carrito.length === 0) { if (vacio) vacio.style.display = 'block'; }` — si no hay platos, muestra el mensaje de vacío.
- Si hay platos (`else`):
  - `if (vacio) vacio.style.display = 'none';` — oculta el mensaje de vacío.
  - El `for` recorre cada plato (`it`):
    - `var sub = it.precio * it.cant;` — subtotal de esa línea (precio × cantidad).
    - `total = total + sub;` — lo acumula al total.
    - `var fila = document.createElement('div'); fila.className = 'resumen__linea';` — crea un `<div>` para la fila y le pone su clase.
    - `fila.innerHTML = ...` — arma el contenido: nombre, `x` cantidad en negrita, el subtotal con `sub.toFixed(2)` (2 decimales) y un botón `×` cuyo `onclick` llama a `quitarDelCarrito(it.id)`. (`&times;` es la entidad HTML del símbolo ×.)
    - `cont.appendChild(fila);` — inserta la fila en el DOM.
- `document.getElementById('res-total').textContent = 'S/ ' + total.toFixed(2);` — escribe el total general en `#res-total`, con 2 decimales.

**Se conecta con:** La llaman `quitarDelCarrito` (mía), `enviarPedido` (**Persona 1**, tras vaciar el carrito) y el `DOMContentLoaded` al abrir `form_pedido.html`. El botón `×` que genera apunta a `quitarDelCarrito` (mía).

## Rol de las páginas HTML

- **`#grid-platos` (`menu.html`, línea 79):** contenedor vacío en el HTML. `cargarPlatos` (Persona 1) lo llena llamando a mi `tarjetaPlato` por cada plato activo. Es el grid del menú completo.
- **`#grid-ofertas` (`ofertas.html`, línea 70):** mismo mecanismo, pero `cargarPlatos` detecta este id y pinta con `esOferta = true`, así que mis tarjetas salen con clase `oferta`, precio de oferta y botón "Reservar".
- **`#grid-destacados` (`index.html`, línea 131):** en la portada; se llena solo con los platos marcados como destacados. Debajo hay un botón "Ver el menú completo".
- **Botones de filtro (`menu.html`, líneas 71-77):** cada uno llama `filtrarPlatos('categoria', this)`. El primero (`Todos`) trae la clase `activo` por defecto. `this` es el propio botón, que mi función resalta.
- **`aside.resumen` (`form_pedido.html`, líneas 110-124):** el resumen del carrito. Tiene `#carrito-items` (donde `pintarCarrito` mete las filas), `#carrito-vacio` (mensaje que muestro/oculto según el carrito) y `#res-total` (donde escribo el total). También, en el `<nav>` de todas las páginas, está el `<span id="contador-pedido">` que actualiza `actualizarContador`.

## Conceptos que debo dominar

- **`localStorage`:** almacén de texto en el navegador que sobrevive al cierre de la pestaña. Uso `getItem`/`setItem`; guarda solo strings, por eso combino con JSON.
- **`JSON.stringify` / `JSON.parse`:** convierten entre arreglo/objeto JS y texto. `stringify` para guardar, `parse` para leer.
- **Template por concatenación de strings:** armo HTML uniendo fragmentos de texto con `+`, insertando datos del plato en medio. El resultado es un string que se inyecta con `innerHTML`.
- **Manipulación del DOM:** `getElementById` y `getElementsByClassName` para ubicar elementos; `innerHTML` para inyectar HTML; `textContent` para texto plano; `createElement`/`appendChild` para crear nodos; `style.display` para mostrar/ocultar; `classList.add`/`remove` para prender/apagar clases.
- **Eventos `onclick`:** los botones que genero traen la llamada a la función incrustada en el atributo `onclick`; al hacer clic, el navegador ejecuta ese código.
- **Arreglos:** el carrito es un arreglo de objetos. Uso `push` para agregar, recorro con `for`, y filtro construyendo un arreglo nuevo.
- **`Number` y `toFixed(2)`:** `Number` convierte el dato de la BD a número para poder calcular; `toFixed(2)` lo formatea con 2 decimales para mostrar precios (`S/ 6.00`).
- **Operador ternario:** `condicion ? A : B` — lo uso para elegir precio de oferta vs. normal, texto del botón y visibilidad.

## Posibles preguntas del docente (y cómo responder)

1. **¿Dónde se guarda el carrito y por qué ahí?**
   En `localStorage`, bajo la clave `kr_carrito` (la constante `CLAVE_CARRITO`). Ahí porque el carrito es temporal y del navegador: no hace falta tocar la base de datos hasta que el usuario confirma el pedido. Además sobrevive si recarga la página.

2. **`localStorage` solo guarda texto. ¿Cómo guardas un arreglo de platos?**
   Con JSON. Al guardar uso `JSON.stringify(carrito)` para volverlo texto, y al leer uso `JSON.parse(...)` para reconstruir el arreglo. Es lo que hacen `guardarCarrito` y `leerCarrito`.

3. **¿Para qué es el `try/catch` en `leerCarrito`?**
   Por seguridad. Si el texto guardado estuviera corrupto, `JSON.parse` lanzaría un error y rompería la página. El `catch` lo atrapa y devuelvo `[]` (carrito vacío) para que todo siga funcionando. El `|| []` cubre el caso de que no haya nada guardado (`getItem` devuelve `null`).

4. **¿Cómo se calcula el porcentaje de descuento en la tarjeta?**
   Con `Math.round((1 - precio / antes) * 100)`. `precio/antes` es la fracción que aún se paga; `1 - eso` es lo que se ahorra; por 100 lo paso a porcentaje y `Math.round` lo redondea a entero.

5. **¿Por qué escapas las comillas del nombre con `replace(/'/g, "\\'")`?**
   Porque el nombre se mete dentro de un `onclick="agregarAlPedido(..., '...', ...)"`. Si el nombre trae una comilla simple, cortaría el string de JavaScript y rompería el botón. El `replace` cambia cada `'` por `\'` para que el `onclick` siga siendo válido. La `g` de la regex hace que reemplace todas las comillas, no solo la primera.

6. **Si agrego dos veces el mismo plato, ¿se duplica en el carrito?**
   No. `agregarAlPedido` recorre el carrito y compara por `id` con `===`. Si el plato ya está, le suma 1 a `cant`; solo si no existe hace `push` de un objeto nuevo con `cant: 1`. Así no hay renglones repetidos.

7. **¿Cómo funciona el filtro por categoría? ¿Vuelve a consultar la base de datos?**
   No consulta nada. `filtrarPlatos` recorre las tarjetas ya pintadas, lee su atributo `data-categoria` y cambia `style.display` a `flex` (mostrar) o `none` (ocultar). Es puro CSS sobre lo que ya está en pantalla; por eso es instantáneo.

8. **¿Por qué usas `textContent` en unos lados e `innerHTML` en otros?**
   `textContent` cuando solo pongo texto plano (el número del contador, el total): es más seguro y directo. `innerHTML` cuando necesito inyectar etiquetas HTML (las filas del carrito con `<span>` y `<button>`, o el grid completo de tarjetas).

9. **En `pintarCarrito`, ¿por qué haces `cont.innerHTML = ''` al inicio?**
   Para limpiar el contenedor antes de redibujar. Si no lo vaciara, cada vez que llamo a la función se apilarían filas duplicadas. Lo dejo en blanco y vuelvo a construir todo desde el carrito actual.

10. **¿Cómo se quita un plato del carrito?**
    `quitarDelCarrito(id)` construye un arreglo `nuevo` y copia con `push` todos los platos **menos** el del id a quitar (`carrito[i].id !== id`). Luego guarda ese arreglo, actualiza el contador y llama a `pintarCarrito` para redibujar. Es un filtro hecho con un `for`.

11. **La misma función `pintarCarrito` corre en el menú y en el formulario. ¿No falla en el menú, que no tiene resumen?**
    No, porque al inicio hace `if (cont === null) return;`. Si no encuentra `#carrito-items` (como en el menú), corta sin error. La misma guardia tiene `actualizarContador`. Por eso `main.js` puede cargarse en todas las páginas.

12. **¿Quién llama a tus funciones al abrir la página?**
    El listener `DOMContentLoaded` al final de `main.js` llama a `actualizarContador()` y `pintarCarrito()` (mías) apenas carga el HTML. El pintado de las tarjetas lo dispara `cargarPlatos` (Persona 1), que dentro usa mi `tarjetaPlato`. Y `enviarPedido` (Persona 1) consume mi carrito para registrar la compra y luego lo vacía con `guardarCarrito([])`.
