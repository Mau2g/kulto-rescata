# División del proyecto — APF Kulto Rescata (3 integrantes)

El proyecto se dividió **por capas**, no por páginas sueltas, para que cada integrante domine un bloque coherente y pueda defenderlo. Cada quien tiene su documento con la explicación **línea por línea** de sus funciones.

## Resumen de quién hace qué

| Integrante | Área | Archivos / funciones | Documento | Avance sugerido |
|---|---|---|---|---|
| **Persona 1 — Mauricio Gómez** | **Autenticación y Base de Datos** | `db.sql` (5 tablas, trigger, RLS, seed) · `js/auth.js` (login, registro, sesión) · `js/main.js`: `cargarPlatos`, `enviarPedido`, `cargarPedidos`, `solicitarDevolucion` · páginas `login.html`, `registrar.html` | [persona1-auth-db.md](persona1-auth-db.md) | ~40% |
| **Persona 2 — [Nombre]** | **Menú, Catálogo y Carrito** | `js/main.js`: `tarjetaPlato`, `filtrarPlatos`, `leerCarrito`, `guardarCarrito`, `cantidadTotal`, `actualizarContador`, `agregarAlPedido`, `quitarDelCarrito`, `pintarCarrito` · páginas `menu.html`, `ofertas.html`, `index.html`, `form_pedido.html` (carrito) | [persona2-menu-carrito.md](persona2-menu-carrito.md) | ~30% |
| **Persona 3 — [Nombre]** | **Interfaz, Diseño y Mis Pedidos** | `js/main.js`: `alternarMenu`, `abrirModal`, `cerrarModal`, `pintarMisPedidos`, `filtrarMisPedidos`, arranque `DOMContentLoaded` · página `pedidos.html` · estructura común (header/nav/footer/modales) · `css/estilos.css` | [persona3-interfaz-pedidos.md](persona3-interfaz-pedidos.md) | ~30% |

> El "% de avance" que pide la rúbrica lo fija el grupo. Si los tres completaron su parte, cada uno puede reportar su avance individual al 100%. La columna de arriba es solo la **repartición de carga** sugerida.

## Cómo se conectan las tres partes (handoffs)

El código está integrado; estas son las costuras entre personas (útil si el docente pregunta "¿cómo se llaman entre sí?"):

- **Arranque** (`DOMContentLoaded`, Persona 3) dispara todo al cargar la página: `actualizarContador` y `pintarCarrito` (Persona 2), `cargarPlatos` y `cargarPedidos` (Persona 1).
- **Catálogo:** `cargarPlatos` (Persona 1 — *lee* de la BD) llama a `tarjetaPlato` (Persona 2 — *arma* el HTML de cada tarjeta).
- **Compra:** `enviarPedido` (Persona 1 — *guarda* en la BD) usa el carrito de Persona 2 (`leerCarrito`, y al terminar `guardarCarrito`/`pintarCarrito`/`actualizarContador`).
- **Mis pedidos:** `cargarPedidos` (Persona 1 — *lee* con JOIN) llama a `pintarMisPedidos` (Persona 3 — *dibuja* la tabla).
- **Devolución:** el botón que dibuja `pintarMisPedidos` (Persona 3) llama a `solicitarDevolucion` (Persona 1 — *escribe* en la BD).

## Reglas del proyecto (para todos)

- Sitio **100% HTML + CSS + JavaScript**. La BD es **Supabase (PostgreSQL)**, se accede desde JavaScript con la librería oficial por CDN.
- Cada página tiene JavaScript propio de su función (requisito de la rúbrica).
- Eventos usados: `onclick`, `onchange`, `oninput`, `onsubmit`. Manipulación del DOM en todas las vistas. Validación en los formularios.
