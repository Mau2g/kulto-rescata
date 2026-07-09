# Persona 3 — Interfaz, Diseño y Mis Pedidos

Me toca la capa que el usuario ve y toca: el **menú hamburguesa** responsive, las **ventanas modales**, y toda la pantalla de **"Mis pedidos"** (la tabla, los KPIs y el filtro por estado). También soy responsable del **diseño visual** (el archivo `css/estilos.css`) y de la **estructura común** que se repite en cada página (header, footer, modal, botón de WhatsApp). En resumen: hago que la data que traen mis compañeros de la base de datos se vea bien y se pueda navegar.

> **Nota de handoff:** yo *dibujo* la tabla de pedidos, pero **no** consulto la base de datos. La consulta a Supabase la hace `cargarPedidos()` (Persona 1), que llena la variable `pedidosCache` y luego me llama. El botón "Devolver" que yo pinto llama a `solicitarDevolucion()` (Persona 1). Eso lo menciono como conexión, no lo explico a fondo.

---

## Archivos y funciones a mi cargo

- **`js/main.js`** — mis funciones:
  - `alternarMenu()` — abre/cierra el menú hamburguesa en móvil.
  - `abrirModal(id)` / `cerrarModal(id)` — muestran/ocultan ventanas modales.
  - `pintarMisPedidos(filtro)` — dibuja la tabla de "Mis pedidos" y calcula los KPIs.
  - `filtrarMisPedidos(valor)` — filtra la tabla por estado (disparado por el `<select>`).
  - El listener `DOMContentLoaded` final — el arranque de toda la página.
- **`pedidos.html`** — la pantalla de "Mis pedidos" (tabla + KPIs + toolbar de filtro).
- **`index.html`** — sirve de referencia para explicar la estructura común (header, footer, modal, WhatsApp).
- **`css/estilos.css`** — el diseño de todo el sitio (~1255 líneas). Lo explico por bloques/estrategia.

---

## Explicación línea por línea

### alternarMenu()

**Qué hace:** abre o cierra el menú de navegación en pantallas chicas (el clásico menú hamburguesa) y avisa a los lectores de pantalla si quedó abierto o cerrado.

**Cómo funciona (línea por línea):**

```js
function alternarMenu() {
  var nav = document.getElementById('nav');
  nav.classList.toggle('abierto');
  document.getElementById('burger').setAttribute('aria-expanded', nav.classList.contains('abierto'));
}
```

- `var nav = document.getElementById('nav');` — busca el elemento `<nav id="nav">` (la lista de enlaces del header) y lo guarda en la variable `nav`.
- `nav.classList.toggle('abierto');` — `toggle` es un interruptor: si el `nav` **no** tiene la clase `abierto`, se la agrega; si **ya** la tiene, se la quita. En el CSS, `.nav.abierto` es lo que hace visible el menú en móvil (`display: flex`). Un solo botón sirve para abrir y cerrar.
- `document.getElementById('burger').setAttribute('aria-expanded', nav.classList.contains('abierto'));` — busca el botón hamburguesa (`id="burger"`) y actualiza su atributo `aria-expanded`. `nav.classList.contains('abierto')` devuelve `true` o `false` según si el menú quedó abierto; ese valor se escribe en `aria-expanded`. Así un lector de pantalla anuncia correctamente "expandido" o "contraído". Es accesibilidad real, no adorno.

**Se conecta con:** la dispara el `onclick="alternarMenu()"` del botón `<button class="burger" id="burger">` que está en el header de **todas** las páginas. No llama a otras funciones. El CSS que la hace funcionar (`.nav`, `.nav.abierto`, `.burger`) es mío también.

---

### abrirModal(id) y cerrarModal(id)

**Qué hacen:** muestran y ocultan una ventana modal (el recuadro centrado con fondo oscuro), identificándola por su `id`.

**Cómo funcionan (línea por línea):**

```js
function abrirModal(id) { var m = document.getElementById(id); if (m) m.classList.add('abierto'); }
function cerrarModal(id) { var m = document.getElementById(id); if (m) m.classList.remove('abierto'); }
```

- `var m = document.getElementById(id);` — busca en la página el elemento cuyo `id` recibimos como parámetro (por ejemplo `'modal-ok'`). Recibir el `id` por parámetro hace que la función sirva para cualquier modal, no solo uno.
- `if (m) ...` — solo actúa si el elemento existe. Si esa página no tiene ese modal, `m` sería `null` y sin este `if` reventaría con un error. Es una guarda defensiva.
- `m.classList.add('abierto');` (en `abrirModal`) — le agrega la clase `abierto`. En el CSS, `.modal` está en `display: none` por defecto y `.modal.abierto` pasa a `display: flex`, así que agregar la clase lo hace aparecer (con una animación de aparición).
- `m.classList.remove('abierto');` (en `cerrarModal`) — le quita la clase `abierto`, y el modal vuelve a `display: none`, o sea desaparece.

**Se conecta con:** `abrirModal('modal-ok')` lo llaman `agregarAlPedido()` y `enviarPedido()` (Persona 2) cuando confirman una acción. `cerrarModal('modal-ok')` lo dispara el botón "Seguir explorando" dentro del modal (`onclick="cerrarModal('modal-ok')"` en el HTML). El HTML del `#modal-ok` y su CSS (`.modal`, `.modal.abierto`, `.modal__caja`) son míos.

---

### pintarMisPedidos(filtro)

**Qué hace:** con los pedidos ya traídos de la base de datos (guardados en `pedidosCache`), dibuja fila por fila la tabla de "Mis pedidos", pinta el botón "Devolver" o el badge "devuelto" según el estado, y calcula los tres KPIs de arriba. **No consulta la base de datos** — eso ya lo hizo `cargarPedidos()` (Persona 1).

**Cómo funciona (línea por línea):**

```js
function pintarMisPedidos(filtro) {
  var cuerpo = document.getElementById('tbody-pedidos');
  if (cuerpo === null) return;

  var datos = pedidosCache;
  if (filtro && filtro !== 'todos') {
    datos = [];
    for (var k = 0; k < pedidosCache.length; k++) if (pedidosCache[k].estado === filtro) datos.push(pedidosCache[k]);
  }
```

- `var cuerpo = document.getElementById('tbody-pedidos');` — busca el `<tbody id="tbody-pedidos">` de `pedidos.html`, que es el cuerpo de la tabla donde van las filas.
- `if (cuerpo === null) return;` — si no existe (porque esta función también corre al cargar cualquier página, no solo `pedidos.html`), corta y no hace nada. Guarda defensiva.
- `var datos = pedidosCache;` — parte del listado completo de pedidos. `pedidosCache` es una variable global que llenó Persona 1 con lo que trajo de Supabase.
- `if (filtro && filtro !== 'todos') { ... }` — solo filtra si me pasaron un estado concreto (no vacío y distinto de `'todos'`).
  - `datos = [];` — empiezo con una lista vacía.
  - `for (...) if (pedidosCache[k].estado === filtro) datos.push(pedidosCache[k]);` — recorro TODOS los pedidos y me quedo solo con los que tienen el estado pedido (por ejemplo solo los `'pendiente'`). Ojo: filtro sobre una **copia**, no borro nada del `pedidosCache` original.

```js
  cuerpo.innerHTML = '';
  for (var i = 0; i < datos.length; i++) {
    var p = datos[i];
    var items = p.pedido_items || [];
    var nombres = [];
    for (var j = 0; j < items.length; j++) nombres.push((items[j].platos ? items[j].platos.nombre : '—') + ' x' + items[j].cantidad);
```

- `cuerpo.innerHTML = '';` — vacía la tabla antes de volver a dibujar. Si no lo hiciera, cada vez que filtro se acumularían filas viejas encima.
- `for (var i = 0; i < datos.length; i++) {` — recorro cada pedido que voy a mostrar.
- `var p = datos[i];` — `p` es el pedido actual (tiene `id`, `cliente`, `total`, `estado`, `created_at`, etc.).
- `var items = p.pedido_items || [];` — saco el detalle del pedido (los platos que lleva). El `|| []` es un seguro: si viniera `null`/`undefined`, uso una lista vacía y no reviento en el `for` de abajo.
- `var nombres = [];` — armo una lista con el texto de cada plato.
- El `for` interno recorre cada `item` y arma un texto como `"Lasaña x2"`:
  - `items[j].platos ? items[j].platos.nombre : '—'` — si el item trae su plato (viene del JOIN que hizo Persona 1), uso el nombre; si no, muestro un guión `—` como respaldo.
  - `+ ' x' + items[j].cantidad` — le pego la cantidad. Todo eso entra a `nombres` con `.push(...)`.

```js
    var accion = p.estado === 'devuelto'
      ? '<span class="estado estado--devuelto">devuelto</span>'
      : '<button type="button" class="btn btn--linea btn--mini" onclick="solicitarDevolucion(' + p.id + ')">Devolver</button>';
```

- Aquí decido qué va en la columna "Acción" según el estado, con un operador ternario (`condición ? valorSiSí : valorSiNo`):
  - Si el pedido **ya está devuelto**, muestro solo un badge de texto `devuelto` (no tiene sentido devolver dos veces).
  - Si **no**, pinto un botón "Devolver" con `onclick="solicitarDevolucion(<id>)"`. Le incrusto el `id` real del pedido para que Persona 1 sepa cuál devolver. `solicitarDevolucion` es de Persona 1; yo solo dibujo el botón que la llama.

```js
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
```

- `var fila = document.createElement('tr');` — creo un `<tr>` (fila de tabla) nuevo en memoria.
- `fila.innerHTML = ...` — le meto las 7 celdas `<td>`, en el mismo orden que las columnas del `<thead>`:
  - **Código:** `'KR-' + String(p.id).padStart(4, '0')` — convierto el id a texto y lo relleno con ceros a la izquierda hasta 4 dígitos: el pedido `7` se ve como `KR-0007`. Queda más presentable.
  - **Cliente:** `p.cliente` tal cual.
  - **Platos:** `nombres.join(', ')` — junto la lista que armé arriba en un solo texto separado por comas: `"Lasaña x2, Focaccia x1"`.
  - **Total:** `'S/ ' + Number(p.total).toFixed(2)` — fuerzo a número y a 2 decimales (`45` → `45.00`) para que se vea como precio.
  - **Fecha:** `new Date(p.created_at).toLocaleDateString('es-PE')` — convierto la fecha ISO que guarda la BD al formato de fecha peruano (día/mes/año).
  - **Estado:** un `<span>` con clase `estado--<estado>` (por ejemplo `estado--pendiente`), que le da su color en el CSS, y el texto del estado.
  - **Acción:** el `accion` que decidí arriba (botón o badge).
- `cuerpo.appendChild(fila);` — pego la fila terminada dentro del `<tbody>`. Se repite por cada pedido.

```js
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
```

- `var monto = 0, platos = 0;` — dos acumuladores para los KPIs de arriba.
- Fíjate en un detalle importante: este `for` recorre `pedidosCache` (el total real), **no** `datos` (lo filtrado). O sea, **los KPIs siempre reflejan todos tus pedidos, aunque la tabla de abajo esté filtrada.** Es intencional: el filtro es solo visual para la tabla.
  - `monto = monto + Number(pedidosCache[m].total);` — voy sumando el total de cada pedido (el dinero rescatado).
  - `var its = pedidosCache[m].pedido_items || [];` — el detalle de ese pedido (con el `|| []` de seguro).
  - `for (...) platos = platos + its[n].cantidad;` — sumo la cantidad de cada plato para saber cuántos platos salvé en total.
- Las 3 últimas líneas escriben los resultados en la pantalla con `textContent`:
  - `kpi-total` ← `pedidosCache.length` (cuántos pedidos).
  - `kpi-monto` ← `'S/ ' + monto.toFixed(2)` (dinero rescatado, con 2 decimales).
  - `kpi-platos` ← `platos` (platos salvados).

**Se conecta con:** me llama `cargarPedidos()` (Persona 1) después de traer los datos de Supabase y llenar `pedidosCache`; me llama con `'todos'`. También me llama `filtrarMisPedidos()` (mía) cuando el usuario cambia el filtro. El botón que yo pinto llama a `solicitarDevolucion()` (Persona 1). Todo lo que dibujo cae en `pedidos.html` (el `<tbody>` y los `<div id="kpi-...">`).

---

### filtrarMisPedidos(valor)

**Qué hace:** es el puente entre el `<select>` de filtro y el redibujado de la tabla. Cuando el usuario elige un estado, esta función manda a repintar solo esos pedidos.

**Cómo funciona (línea por línea):**

```js
function filtrarMisPedidos(valor) { pintarMisPedidos(valor); }
```

- Recibe `valor` (el estado que eligió el usuario en el `<select>`: `'todos'`, `'pendiente'`, `'listo'`, `'entregado'` o `'devuelto'`) y simplemente llama a `pintarMisPedidos(valor)` pasándole ese estado como filtro. Es una función-puente de una línea: existe para que el HTML tenga un nombre claro que llamar en su `onchange`, y para no acoplar el `onchange` directo con `pintarMisPedidos`.

**Se conecta con:** la dispara `onchange="filtrarMisPedidos(this.value)"` del `<select id="filtro-estado">` en `pedidos.html` — `this.value` es la opción elegida. Ella llama a `pintarMisPedidos()` (mía).

---

### El listener DOMContentLoaded (arranque)

**Qué hace:** es el "botón de encendido" de la página. Espera a que todo el HTML esté cargado y recién ahí dispara las funciones que llenan la pantalla. Corre en **todas** las páginas (el `main.js` es el mismo para todas).

**Cómo funciona (línea por línea):**

```js
document.addEventListener('DOMContentLoaded', function () {
  actualizarContador();
  pintarCarrito();
  cargarPlatos();
  cargarPedidos();
});
```

- `document.addEventListener('DOMContentLoaded', function () { ... });` — le digo al navegador: "cuando termines de construir el HTML de la página (el DOM), ejecuta esta función". Es clave que sea `DOMContentLoaded`: si el JS corriera antes, los `getElementById` no encontrarían nada porque los elementos aún no existirían. No espera a las imágenes, solo al HTML, así que arranca rápido.
- Dentro se disparan 4 funciones, en orden. Cada una trae su guarda `if (... === null) return;`, así que en cada página solo actúa la que corresponde:
  - `actualizarContador();` — (Persona 2) actualiza el numerito del carrito en el header.
  - `pintarCarrito();` — (Persona 2) dibuja el resumen del carrito (solo en la página de pedido).
  - `cargarPlatos();` — (Persona 1/2) trae y pinta el menú desde la tabla `platos` (en inicio, menú y ofertas).
  - `cargarPedidos();` — (Persona 1) trae mis pedidos de Supabase, llena `pedidosCache` y **me llama a `pintarMisPedidos`** para dibujar la tabla (solo en `pedidos.html`).

**Se conecta con:** es el punto de entrada de todo `main.js`. De mis funciones, la cadena que me interesa es `DOMContentLoaded → cargarPedidos() (P1) → pintarMisPedidos() (yo)`. Las otras tres funciones que dispara son de mis compañeros; yo solo debo saber que este listener las orquesta al cargar.

---

## La página pedidos.html

`pedidos.html` es "Mis pedidos". Sus partes propias (fuera del header/footer comunes):

- **Portada (`.portada`):** título "Mis pedidos" con la mascota. Solo presentación.
- **Los tres KPIs (`.stats` → `.stat`):** tres tarjetas con un número grande y una etiqueta. Los números empiezan vacíos en el HTML y los llena mi `pintarMisPedidos()`:
  - `<div class="stat__num" id="kpi-total"></div>` → cantidad de pedidos.
  - `<div class="stat__num" id="kpi-monto"></div>` → monto rescatado (`S/ ...`).
  - `<div class="stat__num" id="kpi-platos"></div>` → platos salvados.
- **El toolbar de filtro (`.tabla-toolbar`):** un `<label>` y el `<select id="filtro-estado" onchange="filtrarMisPedidos(this.value)">`, con las opciones `Todos / Pendiente / Listo / Entregado / Devuelto`. El `onchange` es lo que dispara mi filtro cada vez que cambia la selección.
- **El aviso `#pedidos-aviso`:** `<p class="carta__note" id="pedidos-aviso" style="...display:none;">`. Empieza oculto. Lo maneja `cargarPedidos()` (Persona 1): si no hay sesión muestra "Inicia sesión para ver tus pedidos" con un enlace, y si hay sesión pero sin pedidos muestra "Todavía no tienes pedidos". Yo no lo toco; solo debo saber que existe y por qué.
- **La tabla (`.tabla-envoltura` → `.tabla`):** tiene un `<thead>` fijo con 7 columnas (`Código, Cliente, Platos, Total, Fecha, Estado, Acción`) y un `<tbody id="tbody-pedidos">` **vacío** en el HTML. Ese `<tbody>` es exactamente donde mi `pintarMisPedidos()` inyecta las filas. El `<thead>` define el orden de columnas que mis `<td>` deben respetar.
- **La envoltura `.tabla-envoltura`** tiene `overflow-x: auto` en el CSS: en móvil, si la tabla no cabe, se puede deslizar en horizontal sin romper el diseño.

---

## Estructura común (se repite en TODAS las páginas)

Estos bloques son idénticos en `index.html`, `pedidos.html`, `menu.html`, `ofertas.html`, etc. Es importante entenderlos una vez porque **se copian tal cual** en cada archivo (el sitio es HTML estático, sin plantillas ni framework):

- **El `<head>`:** carga las fuentes de Google Fonts (Archivo, Gochi Hand, Hanken Grotesk), la hoja `css/estilos.css`, y tres `<script>`: primero el CDN de `@supabase/supabase-js` (**sin** `defer`, para que `window.supabase` exista antes) y luego **dos scripts con `defer`**: `js/main.js` y `js/auth.js`. El `defer` hace que el JS se ejecute recién cuando el HTML terminó de parsearse, en orden — por eso mis funciones encuentran los elementos.
- **El header (`<header class="encabezado">`):** el logo, el `<nav id="nav">` con los enlaces (la página actual lleva `class="activo"` y `aria-current="page"`), y el `<button class="burger" id="burger" ... onclick="alternarMenu()">`. Ese botón trae `aria-expanded="false"` de inicio, que mi `alternarMenu()` va actualizando. Es el header que controla mi menú hamburguesa.
- **El footer (`<footer class="pie">`):** una columna de marca (logo + descripción) y dos columnas de enlaces ("El sitio" y "Tu cuenta" — esta última incluye el enlace de WhatsApp), más una barra inferior con el copyright y "Taller de Programación Web · APF3 · UTP". Solo presentación.
- **La ventana modal `#modal-ok`:** el `<div class="modal" id="modal-ok" role="dialog" aria-modal="true">` con su icono de check, un `<h3>`, el `<p id="modal-texto">` (cuyo texto cambian mis compañeros según la acción) y el botón "Seguir explorando" con `onclick="cerrarModal('modal-ok')"`. Este es el modal que mis funciones `abrirModal`/`cerrarModal` muestran y ocultan. Va en las páginas que confirman una acción (inicio, menú, ofertas, pedido, login, registro); **`pedidos.html` no lo incluye** porque ahí no se dispara ninguna confirmación (la devolución usa `prompt`/`alert`).
- **El botón flotante de WhatsApp (`<a class="wa-flotante" ...>`):** un enlace fijo abajo a la derecha a `wa.me/51902793505`, con `aria-label` para accesibilidad. Puro CSS (`position: fixed`), sin JS.

---

## css/estilos.css — explicación por bloques (estrategia, no línea por línea)

Son ~1255 líneas, así que lo cuento por **estrategia**. El CSS está escrito con **CSS puro, sin frameworks** (nada de Bootstrap ni Tailwind): todo son clases propias con nombres en español estilo BEM (`.plato__cuerpo`, `.encabezado__inner`).

### 1. Variables CSS en `:root` (líneas 1–24)

Todo el sistema de diseño arranca de variables (custom properties). En `:root` defino los colores, fuentes y medidas una sola vez y las reutilizo con `var(...)` en todo el archivo. Ejemplos reales:

```css
:root {
  --crema: #f4ece0;
  --vino: #7e1a26;
  --eco: #2f6b4f;
  --fuente-titulo: 'Archivo', system-ui, sans-serif;
  --ancho-max: 1180px;
  --radio: 14px;
}
```

- **Ventaja:** si quiero cambiar el vino de toda la web, edito `--vino` en un solo lugar y cambia en botones, header, tabla, etc. Coherencia garantizada.
- Los colores tienen intención: `--vino` (la marca), `--crema` (fondo), `--eco` (verde de "rescatado/ahorro"), `--ambar` ("por vencer").

### 2. Layout con Flexbox y Grid

Uso las dos herramientas modernas de layout según el caso:

- **Grid** para rejillas de columnas iguales o proporcionales. Ejemplo real, la rejilla de platos:
  ```css
  .grid-platos {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: clamp(18px, 3vw, 28px);
  }
  ```
  Tres columnas iguales (`1fr` cada una) con un espacio flexible entre ellas. Igual `.stats` (4 columnas) y `.pie__inner` (3 columnas).
- **Grid** también para layouts asimétricos: `.encabezado__inner` en realidad usa **Flexbox** (`display: flex; justify-content: space-between`) para poner logo a la izquierda y nav a la derecha; y el `.hero__inner` usa Grid con `grid-template-columns: 1.15fr 0.85fr` (texto más ancho que la imagen).
- **Flexbox** para alinear cosas en fila o columna: botones (`.btn` con `display: inline-flex; align-items: center`), las filas del carrito (`.resumen__linea` con `justify-content: space-between`), o las tarjetas (`.plato` con `flex-direction: column`).
- **Regla de bolsillo:** Grid cuando pienso en filas *y* columnas (una rejilla); Flexbox cuando alineo elementos en *un* eje (una fila o una columna).

### 3. Animaciones y transiciones (`@keyframes`, `:hover`)

El sitio se siente vivo con dos técnicas:

- **`transition`** para cambios suaves al interactuar. Ejemplo, los botones se levantan al pasar el mouse:
  ```css
  .btn { transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease; }
  .btn:hover { transform: translateY(-2px) rotate(-1deg); }
  ```
  También las tarjetas `.plato:hover` y `.stat:hover` se elevan con `translateY(-6px)` y ganan sombra.
- **`@keyframes`** para animaciones con nombre. Definidos: `entrar-arte` (la mascota entra girando), `aparecer` (las tarjetas y filas suben con fade), `subir`, `fundido` (el modal), `latir` (el badge "Vence" que late infinito) y `brillo` (el destello que cruza las ofertas). Ejemplo real:
  ```css
  @keyframes aparecer {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  ```
  Se aplica con `animation: aparecer 0.5s ease both;` en `.plato` y con `aparecer 0.4s ease both` en las filas de la tabla (`.tabla tbody tr`).
- **Accesibilidad:** hay un `@media (prefers-reduced-motion: reduce)` que apaga todas las animaciones para quien configuró su sistema para reducir movimiento. Detalle profesional.

### 4. Diseño responsivo con Media Queries

El sitio se adapta a móvil con tres cortes (`@media (max-width: ...)`), de mayor a menor:

- **`980px`** (tablet): las rejillas de 3–4 columnas bajan a 2 (`.stats`, `.grid-platos`), y los layouts a dos columnas (`.hero__inner`, `.pedido-layout`) pasan a una sola columna.
- **`720px`:** los pasos (`.pasos`) pasan a 1 columna y se oculta la columna decorativa del login.
- **`640px`** (celular): el más importante para mí. Aquí **aparece el menú hamburguesa**:
  ```css
  @media (max-width: 640px) {
    .nav { display: none; position: absolute; top: 100%; ... }
    .nav.abierto { display: flex; }
    .burger { display: inline-flex; }
  }
  ```
  En pantalla ancha el `.nav` se ve y el `.burger` está oculto (`.burger { display: none }` por defecto). Bajo 640px se invierte: el nav se esconde, aparece el botón hamburguesa, y **mi `alternarMenu()`** es quien agrega/quita la clase `.abierto` para mostrarlo. Aquí se ve por qué mi JS y este CSS son un equipo: el JS pone la clase, el CSS decide qué hace esa clase.

---

## Conceptos que debo dominar

- **`classList` (`add` / `remove` / `toggle`):** manipular las clases CSS de un elemento desde JS. `add` agrega, `remove` quita, `toggle` alterna (interruptor). Es como muevo la UI sin tocar estilos a mano.
- **`getElementById`:** buscar un elemento por su `id` para leerlo o modificarlo.
- **`textContent` vs `innerHTML`:** `textContent` escribe texto plano (KPIs); `innerHTML` interpreta HTML (las filas de la tabla).
- **`createElement` + `appendChild`:** crear un elemento nuevo (`<tr>`) en memoria y pegarlo al DOM. Así construyo la tabla fila por fila.
- **Evento `onchange`:** se dispara cuando el usuario cambia el valor de un `<select>`/input. Es lo que conecta el filtro con mi función.
- **`DOMContentLoaded`:** evento que avisa que el HTML ya está listo; recién ahí corre el JS que busca elementos.
- **Operador ternario (`cond ? a : b`):** un `if/else` en una línea. Lo uso para elegir botón "Devolver" vs badge "devuelto".
- **Flexbox vs Grid:** Flexbox alinea en un eje (fila o columna); Grid organiza en rejilla (filas y columnas).
- **Media Queries (`@media`):** reglas CSS que solo aplican en cierto ancho de pantalla. Base del diseño responsivo.
- **Animaciones CSS (`@keyframes` + `transition`):** movimiento con nombre y transiciones suaves al interactuar.
- **Accesibilidad (`aria-*`):** atributos como `aria-expanded`, `aria-current`, `aria-modal` que dan contexto a lectores de pantalla.
- **Variables CSS (`:root` / `var()`):** definir colores y medidas una vez y reutilizarlas en todo el sitio.

---

## Posibles preguntas del docente (y cómo responder)

**1. ¿Por qué usas `classList.toggle` en el menú en vez de `add` y `remove`?**
Porque el mismo botón abre y cierra. `toggle('abierto')` agrega la clase si no está y la quita si ya está, con una sola línea. Con `add`/`remove` tendría que revisar primero el estado y decidir, más código para lo mismo.

**2. ¿Qué es `aria-expanded` y por qué lo actualizas en `alternarMenu`?**
Es un atributo de accesibilidad que le dice a los lectores de pantalla si el menú está abierto (`true`) o cerrado (`false`). Lo actualizo con `nav.classList.contains('abierto')`, que devuelve exactamente ese booleano, para que la ayuda técnica anuncie el estado real y no uno desincronizado.

**3. En `pintarMisPedidos`, ¿por qué haces `cuerpo.innerHTML = ''` antes del bucle?**
Para limpiar la tabla antes de redibujar. Como la función se llama de nuevo cada vez que se filtra, si no la vaciara se irían acumulando las filas viejas debajo de las nuevas. La vacío y la reconstruyo desde cero.

**4. Los KPIs, ¿se calculan sobre los pedidos filtrados o sobre todos?**
Sobre **todos**. Fíjate que el bucle de los KPIs recorre `pedidosCache` (el listado completo), no `datos` (lo filtrado). Es a propósito: el filtro es solo visual para la tabla; los KPIs deben mostrar siempre el total real de tus pedidos.

**5. ¿Cómo consigues el código bonito `KR-0007`?**
Con `'KR-' + String(p.id).padStart(4, '0')`. Convierto el id a texto y `padStart(4, '0')` lo rellena con ceros a la izquierda hasta que mide 4 caracteres. El id `7` queda `0007` y le antepongo `KR-`.

**6. ¿Por qué usas un ternario para la columna "Acción"?**
Para decidir entre dos cosas según el estado. Si el pedido ya está `devuelto`, muestro solo un badge (no tiene sentido devolverlo otra vez); si no, pinto el botón "Devolver". El ternario `condición ? badge : botón` resuelve esa elección en una expresión.

**7. `filtrarMisPedidos` solo llama a otra función. ¿Para qué existe?**
Es una función-puente. El `<select>` tiene `onchange="filtrarMisPedidos(this.value)"`, y ella pasa ese valor a `pintarMisPedidos`. Da un nombre claro y semántico al `onchange` y desacopla el HTML del nombre interno del que dibuja. Si mañana el filtro necesita más lógica, la agrego ahí sin tocar el HTML.

**8. ¿Qué diferencia hay entre `textContent` e `innerHTML`, y dónde usas cada uno?**
`textContent` pone texto plano; `innerHTML` interpreta etiquetas HTML. Uso `textContent` para los KPIs (son solo números) e `innerHTML` para las filas y celdas, porque ahí sí necesito generar etiquetas como `<td>` y `<span>`.

**9. ¿Por qué `pintarMisPedidos` tiene `if (cuerpo === null) return;` al inicio?**
Porque `main.js` es el mismo archivo en todas las páginas y el `DOMContentLoaded` dispara `cargarPedidos()` en todas. En una página que no es `pedidos.html` no existe `#tbody-pedidos`, así que `getElementById` devuelve `null` y con esa guarda corto sin reventar.

**10. ¿Por qué el `<tbody>` viene vacío en `pedidos.html`?**
Porque las filas se generan con JavaScript a partir de los datos reales de la base de datos. El HTML solo deja el contenedor (`<tbody id="tbody-pedidos">`) y mi `pintarMisPedidos()` lo llena con `createElement` y `appendChild`. Así la tabla siempre refleja lo que hay en Supabase.

**11. ¿De dónde salen los datos que dibujas? ¿Tú consultas la base de datos?**
No. La consulta la hace `cargarPedidos()` (mi compañero de la Persona 1), que trae los pedidos de Supabase con su detalle y los guarda en la variable global `pedidosCache`. Yo solo leo `pedidosCache` y lo dibujo. Es una separación limpia: uno trae datos, yo los presento.

**12. ¿Cómo se hace responsivo el menú? ¿Es solo CSS o también JS?**
Es un trabajo en equipo. El CSS con `@media (max-width: 640px)` esconde el `.nav` y muestra el `.burger` en móvil, y define que `.nav.abierto` sea visible. El JS (`alternarMenu`) es quien agrega o quita esa clase `.abierto` al tocar el botón. El CSS decide el "cómo se ve"; el JS decide el "cuándo".

**13. ¿Por qué `js/main.js` y `js/auth.js` en el `<head>` llevan `defer`?**
Para que el navegador descargue el JS en paralelo pero lo ejecute recién cuando el HTML terminó de parsearse, y en orden. Así, cuando corren mis funciones, los elementos ya existen y `getElementById` los encuentra. Sin `defer`, el JS podría correr antes de que exista el DOM.

**14. ¿Qué hace `new Date(p.created_at).toLocaleDateString('es-PE')`?**
La base de datos guarda la fecha en formato ISO (técnico). Lo convierto a un objeto `Date` y `toLocaleDateString('es-PE')` lo formatea a la convención peruana (día/mes/año), que es la que el usuario espera ver.
