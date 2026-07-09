# Persona 1 — Autenticación y Base de Datos (Mauricio)

Me toca la **capa de datos y de sesión** del proyecto: el esquema completo en Supabase (PostgreSQL) y todo el código que registra usuarios, inicia sesión y lee/escribe en la base de datos. Sin esta capa, el sitio sería solo HTML estático: yo soy quien conecta las pantallas con datos reales, protegidos por usuario.

## Archivos y funciones a mi cargo

- **`db.sql`** — esquema completo: 5 tablas (`perfiles`, `platos`, `pedidos`, `pedido_items`, `devoluciones`), el trigger `crear_perfil()`, las políticas RLS, los grants y el seed del catálogo.
- **`js/auth.js`** (completo) — constantes `SUPABASE_URL` / `SUPABASE_ANON_KEY`, cliente `sb`, y las funciones `usuarioActual`, `traducirError`, `iniciarLogin`, `verificarClaves`, `registrarUsuario`, `iniciarSesionHeader`, `cerrarSesion` y el listener `DOMContentLoaded`.
- **`js/main.js`** (solo la capa de BD) — `cargarPlatos`, `enviarPedido`, `cargarPedidos`, `solicitarDevolucion` y la variable `pedidosCache`.
- **`login.html`** y **`registrar.html`** — el `onsubmit` de cada formulario que dispara `iniciarLogin` / `registrarUsuario`.

---

## Explicación línea por línea

### db.sql — Tabla `perfiles`

**Qué hace:** Guarda los datos del registro (nombre, apellido, tipo). Es una tabla 1:1 con el usuario que Supabase Auth crea al registrarse.

**Cómo funciona (línea por línea):**

```sql
create table public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  apellido   text,
  tipo       text not null default 'cliente' check (tipo in ('cliente','negocio')),
  created_at timestamptz not null default now()
);
```

- `id uuid primary key` — la **llave primaria** (PK) es un UUID. No es autonumérico: es exactamente el mismo id que Supabase Auth le asigna al usuario.
- `references auth.users(id)` — es **llave foránea** (FK) hacia la tabla interna `auth.users` de Supabase. Así el perfil queda amarrado a una cuenta real.
- `on delete cascade` — si se borra el usuario en `auth.users`, su perfil se borra solo (en cascada). No quedan perfiles huérfanos.
- `nombre` y `apellido` — texto libre, pueden ir vacíos (`text` sin `not null`).
- `tipo text not null default 'cliente'` — obligatorio, por defecto `'cliente'`.
- `check (tipo in ('cliente','negocio'))` — restricción que solo permite esos dos valores; cualquier otro lo rechaza la BD.
- `created_at timestamptz not null default now()` — fecha/hora con zona horaria; se llena sola con el momento de creación.

### db.sql — Función y trigger `crear_perfil()`

**Qué hace:** Cada vez que Supabase Auth crea un usuario nuevo, crea automáticamente su fila en `perfiles`. Sin esto tendríamos que insertar el perfil a mano desde el JS y podría fallar.

**Cómo funciona (línea por línea):**

```sql
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, apellido, tipo)
  values (new.id,
          new.raw_user_meta_data->>'nombre',
          new.raw_user_meta_data->>'apellido',
          coalesce(new.raw_user_meta_data->>'tipo','cliente'));
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();
```

- `create or replace function ... returns trigger` — declara una **función de trigger** (se dispara sola por un evento de BD).
- `language plpgsql` — está escrita en PL/pgSQL, el lenguaje procedural de PostgreSQL.
- `security definer` — se ejecuta con los permisos del **dueño** de la función, no del usuario que la dispara. Necesario porque el usuario recién creado todavía no tiene permiso para insertar en `perfiles`.
- `set search_path = public` — fija el esquema `public` para evitar ataques por manipulación del search_path (buena práctica de seguridad).
- `new.id` — dentro del trigger, `new` es la fila recién insertada en `auth.users`; tomamos su id.
- `new.raw_user_meta_data->>'nombre'` — `raw_user_meta_data` es un JSON con los datos que mandamos en el `signUp` (options.data). El operador `->>` saca un campo del JSON **como texto**. Así traemos `nombre` y `apellido`.
- `coalesce(... 'tipo', 'cliente')` — `coalesce` devuelve el primer valor no nulo: si no vino `tipo`, usa `'cliente'`.
- `return new` — toda función de trigger `after insert` debe devolver la fila.
- `create trigger al_crear_usuario after insert on auth.users for each row` — engancha la función: **después de insertar** en `auth.users`, **por cada fila**, ejecuta `crear_perfil()`.

### db.sql — Tabla `platos`

**Qué hace:** Es el catálogo del menú. De aquí lee `cargarPlatos()` para pintar el menú y las ofertas.

**Cómo funciona (línea por línea):**

```sql
create table public.platos (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  descripcion   text,
  categoria     text not null check (categoria in ('cafe','dulce','salado','bakery')),
  precio_antes  numeric(6,2) not null,
  precio        numeric(6,2) not null,        -- precio rescate (menú)
  precio_oferta numeric(6,2),                 -- precio última hora (ofertas); null = no está en ofertas
  vence         text,                         -- 'hoy' | 'mañana'
  destacado     boolean not null default false,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);
```

- `id bigint generated always as identity primary key` — PK **autonumérica** (1, 2, 3…). `generated always as identity` es la forma moderna de autoincremento en PostgreSQL.
- `nombre text not null` — obligatorio.
- `descripcion text` — opcional.
- `categoria ... check (...)` — obligatoria y limitada a `cafe`, `dulce`, `salado` o `bakery` (esas son las pestañas del filtro del menú).
- `precio_antes numeric(6,2)` — precio original; `numeric(6,2)` = hasta 6 dígitos con 2 decimales (dinero exacto, sin errores de float).
- `precio numeric(6,2) not null` — el precio de rescate (con descuento) que se muestra en el menú.
- `precio_oferta numeric(6,2)` — precio de "última hora"; **si es null, el plato NO aparece en Ofertas**. Esta columna es la que filtra la página de ofertas.
- `vence text` — texto simple, `'hoy'` o `'mañana'`, para la insignia de vencimiento.
- `destacado boolean default false` — marca los platos que salen en la sección de destacados.
- `activo boolean default true` — permite ocultar un plato sin borrarlo; `cargarPlatos()` solo trae los `activo = true`.

### db.sql — Tabla `pedidos`

**Qué hace:** Es la **cabecera** de una orden: quién compró, cuánto, con qué método y en qué estado.

**Cómo funciona (línea por línea):**

```sql
create table public.pedidos (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente    text not null,
  telefono   text not null,
  hora       text,
  metodo     text,
  notas      text,
  total      numeric(8,2) not null,
  estado     text not null default 'pendiente'
             check (estado in ('pendiente','listo','entregado','devuelto')),
  created_at timestamptz not null default now()
);
```

- `id ... identity primary key` — PK autonumérica del pedido.
- `user_id uuid not null default auth.uid()` — a qué usuario pertenece. El **default `auth.uid()`** es clave: si el JS no manda `user_id`, PostgreSQL lo rellena con el id del usuario logueado. Por eso `enviarPedido()` no envía `user_id` y aun así el pedido queda amarrado al dueño.
- `references auth.users(id) on delete cascade` — FK al usuario; si se borra el usuario, sus pedidos también.
- `cliente text not null` / `telefono text not null` — datos de contacto de la entrega, obligatorios.
- `hora`, `metodo`, `notas` — opcionales (hora de recojo, método de pago, notas).
- `total numeric(8,2) not null` — monto total; `numeric(8,2)` da más rango que el de platos porque suma varios ítems.
- `estado ... default 'pendiente' check (...)` — máquina de estados del pedido: `pendiente`, `listo`, `entregado` o `devuelto`. Empieza en `pendiente`.

### db.sql — Tabla `pedido_items`

**Qué hace:** Es el **detalle** de la orden. Un pedido tiene N ítems (relación 1:N); cada fila es un plato con su cantidad.

**Cómo funciona (línea por línea):**

```sql
create table public.pedido_items (
  id              bigint generated always as identity primary key,
  pedido_id       bigint not null references public.pedidos(id) on delete cascade,
  plato_id        bigint not null references public.platos(id),
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(6,2) not null
);
create index on public.pedido_items (pedido_id);
```

- `id ... identity primary key` — PK propia de cada renglón del detalle.
- `pedido_id bigint not null references public.pedidos(id) on delete cascade` — FK a la cabecera. **Cascade**: si se borra el pedido, se borran sus ítems. Esto es lo que hace segura la reversión en `enviarPedido()`.
- `plato_id bigint not null references public.platos(id)` — FK al catálogo; qué plato se compró. (Sin cascade: no queremos que borrar un plato borre historial de ventas.)
- `cantidad integer not null check (cantidad > 0)` — cantidad, obligatoria y siempre mayor a 0.
- `precio_unitario numeric(6,2) not null` — se **congela** el precio del momento de la compra, para que el historial no cambie aunque luego suba el precio del plato.
- `create index on ... (pedido_id)` — índice sobre `pedido_id` para que buscar los ítems de un pedido sea rápido (es la búsqueda más común).

### db.sql — Tabla `devoluciones`

**Qué hace:** Modela la devolución como entidad propia, una sola por pedido.

**Cómo funciona (línea por línea):**

```sql
create table public.devoluciones (
  id         bigint generated always as identity primary key,
  pedido_id  bigint not null unique references public.pedidos(id) on delete cascade,
  motivo     text not null,
  estado     text not null default 'solicitada' check (estado in ('solicitada','aceptada','rechazada')),
  created_at timestamptz not null default now()
);
```

- `id ... identity primary key` — PK autonumérica.
- `pedido_id bigint not null unique references public.pedidos(id) on delete cascade` — FK al pedido. El **`unique`** garantiza **una sola devolución por pedido** (no puedes devolver dos veces el mismo). Cascade: si se borra el pedido, se borra su devolución.
- `motivo text not null` — el motivo, obligatorio (lo pide el `prompt` de `solicitarDevolucion`).
- `estado ... default 'solicitada' check (...)` — `solicitada`, `aceptada` o `rechazada`; nace como `solicitada`.

### db.sql — Row Level Security (RLS) y políticas

**Qué hace:** Es la seguridad **por fila**: aunque el navegador use una llave pública, la BD garantiza que cada usuario solo ve y edita sus propios datos. El catálogo (`platos`) es lo único público.

**Cómo funciona (por bloques):**

```sql
alter table public.perfiles     enable row level security;
alter table public.platos       enable row level security;
alter table public.pedidos      enable row level security;
alter table public.pedido_items enable row level security;
alter table public.devoluciones enable row level security;
```

- `enable row level security` en las 5 tablas — con RLS activo y **sin** política, no se puede tocar nada. Las políticas de abajo van "abriendo" solo lo permitido.

```sql
create policy perfiles_propio on public.perfiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
```

- Política sobre `perfiles`, `for all` (select, insert, update, delete). `using` filtra qué filas puedes **leer/afectar**; `with check` valida lo que **escribes**. Ambas exigen `auth.uid() = id`: solo tu propio perfil. `auth.uid()` es el id del usuario del token actual.

```sql
create policy platos_lectura on public.platos for select using (true);   -- catálogo público
```

- `platos` es de **solo lectura pública**: `using (true)` deja que cualquiera (incluso anónimo) lo lea. No hay política de insert/update/delete, así que nadie puede modificar el menú desde el cliente.

```sql
create policy pedidos_select on public.pedidos for select using (auth.uid() = user_id);
create policy pedidos_insert on public.pedidos for insert with check (auth.uid() = user_id);
create policy pedidos_update on public.pedidos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy pedidos_delete on public.pedidos for delete using (auth.uid() = user_id);
```

- Cuatro políticas de `pedidos`, una por operación. Todas comparan `auth.uid() = user_id`: solo operas sobre **tus** pedidos. En `insert`/`update` el `with check` impide que crees un pedido a nombre de otro usuario.

```sql
create policy items_select on public.pedido_items for select
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = auth.uid()));
create policy items_insert on public.pedido_items for insert
  with check (exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = auth.uid()));
```

- `pedido_items` no tiene `user_id` propio, así que la política **mira la cabecera**: con un `exists (...)` comprueba que el `pedido_id` del ítem pertenezca a un pedido cuyo `user_id` sea el usuario actual. Si el pedido no es tuyo, no puedes ver ni insertar sus ítems.

```sql
create policy dev_select on public.devoluciones for select
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = auth.uid()));
create policy dev_insert on public.devoluciones for insert
  with check (exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = auth.uid()));
```

- Mismo patrón para `devoluciones`: solo puedes ver/crear la devolución de un pedido que sea tuyo.

### db.sql — Grants

**Qué hace:** Los grants dan el permiso **base** de SQL a cada rol; RLS luego afina fila por fila. Son dos capas complementarias.

```sql
grant select on public.platos to anon, authenticated;
grant select, insert, update on public.perfiles to authenticated;
grant select, insert, update, delete on public.pedidos to authenticated;
grant select, insert on public.pedido_items to authenticated;
grant select, insert on public.devoluciones to authenticated;
```

- `platos` — `select` para `anon` (visitante sin login) **y** `authenticated` (logueado): el menú es público.
- `perfiles` — el logueado puede leer/crear/editar (no borrar).
- `pedidos` — el logueado tiene las 4 operaciones (incluye `delete`, que usa la reversión de `enviarPedido`).
- `pedido_items` y `devoluciones` — solo `select` e `insert`: se crean pero no se editan ni borran desde el cliente.
- Nota: `anon` solo tiene `select` sobre `platos`; no puede tocar nada de pedidos aunque quisiera.

### db.sql — Seed del catálogo (16 platos)

**Qué hace:** Inserta el menú inicial para que el sitio no arranque vacío.

```sql
insert into public.platos (nombre, descripcion, categoria, precio_antes, precio, precio_oferta, vence, destacado) values
('Capuccino', ... ),
('Latte', ... ),
...
('Divina Trucha', ... );
```

- Es **un solo `insert` con múltiples filas** (16), una por plato. No lo explico fila por fila porque todas siguen la misma forma; basta entender el patrón de las columnas:
  - **Categorías** repartidas: `cafe` (Capuccino, Latte, Cold Brew, Affogato), `dulce`, `bakery` y `salado`.
  - **`precio_oferta`**: algunos traen valor (ej. Affogato `5.20`, Butifarra `8.00`) → esos **sí** salen en Ofertas; los que van `null` (ej. Capuccino, Latte) no.
  - **`destacado`**: solo unos pocos en `true` (French Toast, Panqueques de Pistacho, Butifarra) → esos alimentan la grilla de destacados.
  - El `id` y `created_at` no se listan porque se autogeneran.

---

### auth.js — Constantes y cliente `sb`

**Qué hace:** Conecta el navegador con el proyecto Supabase. `sb` es el objeto con el que hacemos todo (auth y consultas).

**Cómo funciona (línea por línea):**

```js
const SUPABASE_URL = 'https://tntqfevzuzczxvallbsj.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

var sb = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
```

- `SUPABASE_URL` — la dirección única de nuestro proyecto Supabase (el backend).
- `SUPABASE_ANON_KEY` — la llave **pública anónima**. Es un JWT que puede ir en el HTML sin riesgo: por sí sola no da acceso a datos ajenos porque RLS la limita. Nunca es la `service_role` (esa sí es secreta y no va en el front).
- `window.supabase` — objeto global que expone la librería cargada por CDN (`<script src="...@supabase/supabase-js@2">`).
- `createClient(URL, KEY)` — crea el cliente. El operador ternario (`? :`) lo protege: si la librería no cargó, `sb` queda en `null` en vez de romper la página.

### auth.js — `usuarioActual()`

**Qué hace:** Devuelve el usuario logueado, o `null` si no hay sesión.

**Cómo funciona (línea por línea):**

```js
async function usuarioActual() {
  if (sb === null) return null;
  var res = await sb.auth.getSession();
  return res.data.session ? res.data.session.user : null;
}
```

- `async function` — es asíncrona porque consulta a Supabase (operación de red).
- `if (sb === null) return null` — si el cliente no cargó, no hay sesión posible.
- `await sb.auth.getSession()` — `await` espera la respuesta de Supabase; `getSession()` lee la sesión guardada (en `localStorage`).
- `res.data.session ? res.data.session.user : null` — si hay sesión devuelve el objeto `user`; si no, `null`.

**Se conecta con:** la usan `enviarPedido()` y `cargarPedidos()` (ambas de este mismo archivo/rol) para saber si hay que exigir login.

### auth.js — `traducirError(mensaje)`

**Qué hace:** Convierte los mensajes de error de Supabase (en inglés) a texto claro en español para el usuario.

**Cómo funciona (línea por línea):**

```js
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
```

- `var m = (mensaje || '').toLowerCase()` — evita error si `mensaje` viene `undefined` y pasa todo a minúsculas para comparar sin importar mayúsculas.
- Cada `if` con `indexOf(...) !== -1` busca una frase clave en el mensaje: si la encuentra, devuelve la traducción amigable.
  - `invalid login credentials` → credenciales malas.
  - `already registered` / `already been registered` → correo ya usado.
  - `password` + `6` → contraseña muy corta.
  - `invalid` + `email` → correo inválido.
- `return mensaje || 'Ocurrió un error...'` — si no reconoce el error, muestra el original o un mensaje genérico.

**Se conecta con:** la llaman `iniciarLogin()` y `registrarUsuario()` cuando Supabase devuelve un error.

### auth.js — `iniciarLogin(evento)`

**Qué hace:** Valida el formulario de login y, si está bien, inicia sesión contra Supabase Auth.

**Cómo funciona (línea por línea):**

```js
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
```

- `evento.preventDefault()` — corta el envío normal del formulario (que recargaría la página). Manejamos todo con JS.
- Lee `correo` (con `.trim()` para quitar espacios) y `clave` de los inputs, y guarda el `<p>` de error en `error`.
- **Validación de correo**: si no tiene `@` **o** no tiene `.`, muestra error y sale con `return false`.
- **Validación de clave**: si mide menos de 6 caracteres, error y sale.
- `if (sb === null)` — si el cliente Supabase no cargó, avisa y sale.
- `error.textContent = 'Ingresando...'` — feedback mientras se consulta.
- `await sb.auth.signInWithPassword({ email, password })` — el corazón: pide a Supabase iniciar sesión con correo y contraseña.
- `if (res.error)` — si falla, traduce el mensaje con `traducirError` y sale.
- Si todo va bien: limpia el error, pone el texto del modal, `abrirModal('modal-ok')` lo muestra, y `setTimeout(...)` redirige a `index.html` tras 1.3 s.
- `return false` — remata evitando el submit por defecto.

**Se conecta con:** la dispara el `onsubmit` de `login.html`. Usa `traducirError` (mío) y `abrirModal` (de main.js, de otra persona — solo lo invoco).

### auth.js — `verificarClaves()`

**Qué hace:** Comprueba en vivo, mientras el usuario escribe, si las dos contraseñas del registro coinciden.

**Cómo funciona (línea por línea):**

```js
function verificarClaves() {
  var clave = document.getElementById('clave').value;
  var repetir = document.getElementById('repetir').value;
  var aviso = document.getElementById('error-repetir');
  aviso.textContent = repetir !== '' && clave !== repetir ? 'Las contraseñas no coinciden.' : '';
}
```

- Lee `clave` y `repetir` y el `<p>` de aviso.
- La última línea, con un ternario: **si** `repetir` no está vacío **y** es distinto de `clave`, muestra "Las contraseñas no coinciden."; si no, limpia el aviso.

**Se conecta con:** la dispara `oninput="verificarClaves()"` en el input "repetir" de `registrar.html`.

### auth.js — `registrarUsuario(evento)`

**Qué hace:** Valida el formulario de registro y crea la cuenta en Supabase Auth, mandando nombre/apellido/tipo como metadata (que el trigger `crear_perfil` copiará a `perfiles`).

**Cómo funciona (línea por línea):**

```js
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
```

- `evento.preventDefault()` — evita el envío normal del form.
- Lee los 7 campos: nombre, apellido, correo, clave, repetir, tipo y el checkbox de términos (`.checked` da true/false).
- **Cadena de validaciones**, cada una sale con `return false` si falla: nombre vacío, correo sin `@` o `.`, clave < 6, claves distintas, términos no aceptados, y `sb === null`.
- `error.textContent = 'Creando tu cuenta...'` — feedback.
- `await sb.auth.signUp({ email, password, options: { data: {...} } })` — crea el usuario. **`options.data`** viaja como `raw_user_meta_data`; ahí van `nombre`, `apellido` y `tipo`, que el trigger de la BD leerá para armar el perfil.
- `if (res.error)` — si falla, traduce y sale.
- `if (res.data.session)` — si Supabase devuelve sesión (confirmación de correo desactivada), el usuario ya entró: mensaje de bienvenida y redirige a `index.html`.
- `else` — si no hay sesión (hace falta confirmar correo), avisa que ya puede iniciar sesión y redirige a `login.html`.

**Se conecta con:** la dispara el `onsubmit` de `registrar.html`. Usa `traducirError` (mío) y `abrirModal` (main.js). En el backend, el `signUp` es lo que dispara mi trigger `crear_perfil`.

### auth.js — `iniciarSesionHeader()`

**Qué hace:** Al cargar cualquier página, si hay sesión activa, cambia el botón "Ingresar" del header por "Salir · <nombre>".

**Cómo funciona (línea por línea):**

```js
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
```

- `cta` — el enlace del header con `id="auth-cta"`.
- `if (cta === null || sb === null) return` — si no existe el botón o no hay cliente, no hace nada.
- `await sb.auth.getSession()` — lee la sesión.
- `if (session && session.user)` — solo si hay usuario:
  - `meta = session.user.user_metadata || {}` — los metadatos (nombre, etc.).
  - `nombre = meta.nombre || session.user.email || 'Mi cuenta'` — usa nombre; si no, correo; si no, "Mi cuenta".
  - `if (nombre.length > 14)` — si es muy largo, lo recorta a 12 y le agrega "…".
  - Cambia el texto a `'Salir · ' + nombre`, apunta el `href` a `#`, pone el `title`, y **reasigna el `onclick`** para que ahora cierre sesión (`cerrarSesion()`).

**Se conecta con:** la registra el `DOMContentLoaded` de este archivo. Llama a `cerrarSesion` (mío).

### auth.js — `cerrarSesion()`

**Qué hace:** Cierra la sesión en Supabase y manda al inicio.

**Cómo funciona (línea por línea):**

```js
async function cerrarSesion() {
  if (sb !== null) await sb.auth.signOut();
  window.location.href = 'index.html';
}
```

- `if (sb !== null) await sb.auth.signOut()` — si hay cliente, cierra la sesión (borra el token de `localStorage`).
- `window.location.href = 'index.html'` — redirige al inicio.

**Se conecta con:** la llama el `onclick` que arma `iniciarSesionHeader()`.

### auth.js — Listener `DOMContentLoaded`

**Qué hace:** Al terminar de cargar el HTML, actualiza el botón del header según la sesión.

**Cómo funciona:**

```js
document.addEventListener('DOMContentLoaded', iniciarSesionHeader);
```

- `DOMContentLoaded` se dispara cuando el DOM ya está armado (antes de imágenes). Ejecuta `iniciarSesionHeader` para pintar el estado de sesión en el header de toda página.

---

### main.js — `cargarPlatos()` (capa de BD)

**Qué hace:** Lee la tabla `platos` de Supabase y pinta las tarjetas del menú, ofertas o destacados según la página.

**Cómo funciona (línea por línea):**

```js
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
```

- Busca el contenedor: prueba `grid-platos`, luego `grid-ofertas`, luego `grid-destacados` (el `||` toma el primero que exista en esa página).
- `if (grid === null) return` — si la página no tiene ninguna grilla, sale.
- `esOferta = grid.id === 'grid-ofertas'` — bandera para saber qué precio y botón mostrar.
- `sb.from('platos').select('*').eq('activo', true).order('id')` — construye la **consulta SELECT** con el query builder de Supabase: de la tabla `platos`, todas las columnas (`*`), solo `activo = true`, ordenadas por `id`.
- `if (esOferta) q = q.not('precio_oferta', 'is', null)` — en Ofertas, filtra los que **tienen** `precio_oferta` (no null).
- `else if (grid-destacados) q = q.eq('destacado', true)` — en destacados, solo los marcados.
- `var res = await q` — ejecuta la consulta (recién aquí sale a la red).
- `res.data || []` — los resultados, o arreglo vacío si vino null.
- El `for` arma el HTML llamando a `tarjetaPlato(...)` por cada plato y lo inyecta en `grid.innerHTML`.

**Se conecta con:** usa `tarjetaPlato` (helper de main.js, otra persona). La dispara el `DOMContentLoaded` de main.js. Lee la tabla `platos` que definí en `db.sql` (protegida por la política pública `platos_lectura`).

### main.js — `enviarPedido(evento)` (capa de BD)

**Qué hace:** Registra la compra: inserta la cabecera en `pedidos` y el detalle en `pedido_items`, en dos pasos, revirtiendo si el detalle falla.

**Cómo funciona (línea por línea):**

```js
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
```

- `evento.preventDefault()` — corta el submit normal.
- `carrito = leerCarrito()` — lee el carrito de `localStorage` (helper de main.js).
- `if (carrito.length === 0)` — carrito vacío: avisa y sale.
- `usuario = await usuarioActual()` — verifica sesión (función mía de auth.js). Si `null`, avisa y redirige a login.
- Lee `cliente` y `telefono`, valida que el nombre no esté vacío y que el teléfono tenga al menos 9 caracteres.
- `if (confirm(...) === false) return false` — pide confirmación con el diálogo nativo; si cancela, sale.
- El `for` calcula `total` sumando precio × cantidad de cada ítem.
- **Paso 1 — cabecera**: `sb.from('pedidos').insert({...}).select('id').single()`. Inserta la fila (sin `user_id`: lo pone el default `auth.uid()` en la BD), y con `.select('id').single()` recupera el **id** del pedido recién creado como un solo objeto.
- `if (resP.error)` — si falla la cabecera, avisa y sale.
- **Paso 2 — detalle**: arma `filas`, un objeto por ítem con `pedido_id` (el id recién obtenido), `plato_id`, `cantidad` y `precio_unitario`; luego `sb.from('pedido_items').insert(filas)` los inserta todos de golpe.
- `if (resI.error)` — si el detalle falla, hace **reversión manual**: `sb.from('pedidos').delete().eq('id', resP.data.id)` borra la cabecera para no dejar un pedido huérfano sin ítems. (No hay transacciones desde el cliente, así que se simula el rollback a mano.)
- Éxito: vacía el carrito (`guardarCarrito([])`), actualiza contador y resumen, muestra el modal de gracias.

**Se conecta con:** usa `usuarioActual` (mío). Usa `leerCarrito`, `guardarCarrito`, `actualizarContador`, `pintarCarrito`, `abrirModal` (helpers de main.js, de otra persona — solo los invoco). Escribe en las tablas `pedidos` y `pedido_items`, protegidas por mis políticas `pedidos_insert` e `items_insert`.

### main.js — `cargarPedidos()` y `pedidosCache` (capa de BD)

**Qué hace:** Trae los pedidos del usuario **con su detalle y devolución en una sola consulta** (JOIN anidado de PostgREST) y los guarda en `pedidosCache`.

**Cómo funciona (línea por línea):**

```js
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
```

- `var pedidosCache = []` — variable a nivel de módulo que **cachea** los pedidos traídos, para que el filtro (`pintarMisPedidos`) trabaje sin volver a consultar la BD.
- `cuerpo = ...('tbody-pedidos')` — el `<tbody>` de la tabla; si no existe, sale (no estamos en esa página).
- `usuario = await usuarioActual()` — verifica sesión (mía). Si `null`: vacía la caché, muestra aviso con enlace a login, pinta vacío y sale.
- La consulta clave:
  - `sb.from('pedidos').select('id, cliente, total, estado, created_at, pedido_items(cantidad, platos(nombre)), devoluciones(motivo)')` — es un **JOIN anidado de PostgREST**. Además de las columnas del pedido, trae:
    - `pedido_items(cantidad, platos(nombre))` — los ítems del pedido y, **anidado**, el nombre del plato de cada ítem (dos niveles de relación).
    - `devoluciones(motivo)` — la devolución asociada, si existe.
  - Todo esto en **una sola llamada**: PostgREST resuelve las relaciones por las FK que definí en `db.sql`.
  - `.order('created_at', { ascending: false })` — del más reciente al más antiguo.
- `pedidosCache = res.data || []` — guarda el resultado.
- El bloque `aviso` muestra "Todavía no tienes pedidos" solo si la lista vino vacía.
- `pintarMisPedidos('todos')` — dibuja la tabla (helper de main.js).

**Se conecta con:** usa `usuarioActual` (mío) y `pintarMisPedidos` (helper de main.js, otra persona). La dispara el `DOMContentLoaded`. Su consulta se apoya en las FK y en las políticas `pedidos_select`, `items_select` y `dev_select` de `db.sql` (por eso solo trae los pedidos del usuario).

### main.js — `solicitarDevolucion(id)` (capa de BD)

**Qué hace:** Registra una devolución para un pedido y marca ese pedido como `devuelto`.

**Cómo funciona (línea por línea):**

```js
async function solicitarDevolucion(id) {
  var motivo = prompt('¿Por qué quieres devolver este pedido?');
  if (motivo === null || motivo.trim() === '') return;
  var resD = await sb.from('devoluciones').insert({ pedido_id: id, motivo: motivo.trim() });
  if (resD.error) { alert('No se pudo registrar la devolución. Intenta de nuevo.'); return; }
  await sb.from('pedidos').update({ estado: 'devuelto' }).eq('id', id);
  cargarPedidos();
}
```

- `prompt(...)` — pide el motivo con el diálogo nativo del navegador.
- `if (motivo === null || motivo.trim() === '') return` — si cancela o lo deja vacío, no hace nada.
- `sb.from('devoluciones').insert({ pedido_id: id, motivo: ... })` — **INSERT** en `devoluciones`. Recuerda que `pedido_id` es `unique`, así que un segundo intento sobre el mismo pedido lo rechazaría la BD.
- `if (resD.error)` — si falla, muestra `alert` y sale.
- `sb.from('pedidos').update({ estado: 'devuelto' }).eq('id', id)` — **UPDATE**: cambia el estado del pedido a `devuelto` (con `.eq('id', id)` para afectar solo ese).
- `cargarPedidos()` — recarga la tabla para reflejar el cambio.

**Se conecta con:** la dispara el botón "Devolver" que arma `pintarMisPedidos` (main.js, otra persona). Llama a `cargarPedidos` (mío). Escribe en `devoluciones` y `pedidos`, bajo mis políticas `dev_insert` y `pedidos_update`.

---

### login.html — el `onsubmit` que dispara `iniciarLogin`

**Qué hace:** El formulario de login llama a mi función al enviarse.

**Cómo funciona:**

```html
<form class="formulario" onsubmit="return iniciarLogin(event)">
  ...
  <input id="correo" type="email" ... />
  <input id="clave" type="password" ... />
  <p class="campo__error" id="error-login"></p>
  <button class="btn btn--vino" type="submit">Ingresar</button>
</form>
```

- `onsubmit="return iniciarLogin(event)"` — al enviar, ejecuta `iniciarLogin` pasándole el objeto `event`. El `return` propaga el `false` que devuelve la función para **cancelar** el envío tradicional (refuerzo del `preventDefault`).
- Los `id` (`correo`, `clave`, `error-login`) son exactamente los que `iniciarLogin` lee con `getElementById`. Por eso deben coincidir.
- Los `<script>` del `<head>` cargan primero la librería Supabase por CDN, luego `main.js` y `auth.js` (con `defer`, se ejecutan tras armar el DOM).

### registrar.html — el `onsubmit` que dispara `registrarUsuario`

**Qué hace:** El formulario de registro llama a mi función al enviarse, y valida las claves en vivo.

**Cómo funciona:**

```html
<form class="formulario formulario--ancho" onsubmit="return registrarUsuario(event)">
  ...
  <input id="nombre" ... />  <input id="apellido" ... />
  <input id="correo" type="email" ... />
  <input id="clave" type="password" ... />
  <input id="repetir" type="password" ... oninput="verificarClaves()" />
  <select id="tipo"> ... </select>
  <input id="terminos" type="checkbox" />
  <p class="campo__error" id="error-registro"></p>
  <button type="submit">Crear cuenta</button>
</form>
```

- `onsubmit="return registrarUsuario(event)"` — al enviar, ejecuta mi `registrarUsuario(event)`; el `return false` cancela el envío nativo.
- `oninput="verificarClaves()"` en el input `repetir` — cada tecla dispara mi `verificarClaves` para avisar en vivo si no coinciden.
- Los `id` (`nombre`, `apellido`, `correo`, `clave`, `repetir`, `tipo`, `terminos`, `error-registro`) son los mismos que lee `registrarUsuario`. El `<select id="tipo">` da `cliente` o `negocio`, valor que termina en la metadata del `signUp` y, vía el trigger, en la columna `tipo` de `perfiles`.

---

## Conceptos que debo dominar

- **Supabase** — plataforma que envuelve un PostgreSQL con API automática (PostgREST) y un sistema de Auth. Le hablamos desde el navegador con la librería `supabase-js`.
- **Cliente anon / llave anónima** — llave pública que puede ir en el front. No es peligrosa porque toda lectura/escritura pasa por RLS; solo puede hacer lo que las políticas permiten.
- **CRUD con el query builder** — `sb.from('tabla').select()/insert()/update()/delete()` traduce a SQL: SELECT (leer), INSERT (crear), UPDATE (editar), DELETE (borrar).
- **JOIN anidado de PostgREST** — en un mismo `select` se piden relaciones: `pedido_items(cantidad, platos(nombre))` trae ítems y, dentro, el nombre del plato. Funciona porque hay FK entre las tablas.
- **RLS (Row Level Security)** — seguridad por fila en la BD. Con `auth.uid()` cada usuario solo ve/edita sus filas. Es la verdadera muralla, no el JS.
- **Trigger + función `crear_perfil`** — código en la BD que se dispara solo tras un INSERT en `auth.users` para crear el perfil automáticamente.
- **PK y FK** — la PK identifica una fila; la FK la conecta con otra tabla. `on delete cascade` borra en cadena los datos dependientes.
- **`async/await`** — como hablar con Supabase toma tiempo (red), `await` pausa la función hasta la respuesta sin congelar la página.
- **`numeric(p,s)`** — tipo para dinero: exacto, sin los errores de redondeo de los decimales flotantes.

## Posibles preguntas del docente (y cómo responder)

1. **¿Es seguro tener la llave de Supabase escrita en `auth.js`?**
   Sí. Es la llave `anon` (pública), pensada para ir en el front. Por sí sola no da acceso a datos ajenos: RLS filtra cada consulta por `auth.uid()`. La llave secreta (`service_role`) nunca está en el cliente.

2. **Si el usuario edita el JS y quita las validaciones, ¿puede ver pedidos de otros?**
   No. Las validaciones del JS son solo comodidad. La seguridad real está en la BD: las políticas `pedidos_select`, `items_select` y `dev_select` solo devuelven filas donde `user_id = auth.uid()`. Aunque falsee el front, PostgreSQL no le entrega datos ajenos.

3. **¿Por qué `enviarPedido` no manda `user_id` al insertar el pedido?**
   Porque la columna `user_id` tiene `default auth.uid()`: la BD la rellena sola con el usuario del token. Es más seguro que confiar en un valor que mande el cliente.

4. **¿Para qué sirve el trigger `crear_perfil`?**
   Para que, al registrarse un usuario en `auth.users`, se cree automáticamente su fila en `perfiles` copiando nombre/apellido/tipo desde la metadata del `signUp`. Así no dependemos de un segundo INSERT desde el JS que podría fallar.

5. **¿Qué es `security definer` en la función del trigger y por qué es necesario?**
   Hace que la función corra con los permisos de su dueño, no del usuario recién creado (que aún no tiene permiso para insertar en `perfiles`). Sin eso, el trigger fallaría.

6. **Explica el `select` de `cargarPedidos`. ¿Cómo trae el nombre del plato si `pedido_items` solo guarda `plato_id`?**
   Es un JOIN anidado de PostgREST: `pedido_items(cantidad, platos(nombre))`. PostgREST sigue la FK `plato_id → platos.id` y anida el nombre. Todo en una sola llamada, sin escribir SQL de JOIN a mano.

7. **En `enviarPedido`, si falla el INSERT del detalle, ¿qué pasa con la cabecera?**
   Se revierte a mano: `sb.from('pedidos').delete().eq('id', ...)` borra la cabecera para no dejar un pedido sin ítems. Desde el cliente no hay transacciones, así que se simula el rollback con ese delete.

8. **¿Por qué `precio_unitario` se guarda en `pedido_items` si el precio ya está en `platos`?**
   Para congelar el precio del momento de la compra. Si mañana cambia el precio del plato, el historial del pedido no se altera.

9. **¿Qué hace `auth.uid()` y de dónde sale?**
   Devuelve el id (UUID) del usuario dueño del token JWT de la petición. Supabase lo expone en SQL; lo usamos en las políticas RLS y como default de `user_id`.

10. **¿Por qué `platos` tiene RLS activo pero el catálogo es visible para todos?**
    Porque su política `platos_lectura` usa `using (true)`: permite SELECT a cualquiera. No hay política de escritura, así que nadie puede modificar el menú desde el cliente; solo leerlo.

11. **¿Cuál es la diferencia entre los `grant` y las políticas RLS?**
    Son dos capas. El `grant` da el permiso base de SQL (ej. el rol `authenticated` puede hacer INSERT en `pedidos`). RLS afina *qué filas* puede tocar dentro de ese permiso. Se necesitan ambas: sin grant no hay operación; sin política, RLS bloquea todo.

12. **¿Por qué `devoluciones.pedido_id` es `unique`?**
    Para permitir una sola devolución por pedido. Si alguien intenta devolver dos veces el mismo pedido, el INSERT viola la restricción `unique` y la BD lo rechaza.

13. **¿Qué significa `async/await` en estas funciones?**
    Que la función espera la respuesta de Supabase (que viaja por red) sin bloquear la página. `await` pausa esa función hasta que llega el dato; mientras, el navegador sigue respondiendo.

14. **¿Cómo llegan `nombre`, `apellido` y `tipo` del formulario a la tabla `perfiles`?**
    En `registrarUsuario` van en `options.data` del `signUp`. Supabase los guarda como `raw_user_meta_data`. El trigger `crear_perfil` los lee con `->>` y los inserta en `perfiles`. El HTML solo aporta los inputs con esos `id`.
