-- ============================================================
--  Base de datos de Kulto Rescata  (Supabase / PostgreSQL)
--  Modelo normalizado: 5 tablas propias + auth.users (Supabase Auth)
--  Cubre: catálogo, registro, compras, órdenes y devoluciones.
-- ============================================================

-- 1) perfiles — datos del registro, 1:1 con el usuario de Supabase Auth
create table public.perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  apellido   text,
  tipo       text not null default 'cliente' check (tipo in ('cliente','negocio')),
  created_at timestamptz not null default now()
);

-- Al registrarse un usuario, se crea su perfil automáticamente (trigger).
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

-- 2) platos — catálogo del menú
create table public.platos (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  descripcion   text,
  categoria     text not null check (categoria in ('cafe','dulce','salado','bakery')),
  precio_antes  numeric(6,2) not null,
  precio        numeric(6,2) not null,        -- precio rescate (menú)
  precio_oferta numeric(6,2),                 -- precio última hora (ofertas); null = no está en ofertas
  vence         text,                         -- 'hoy' | 'mañana'
  imagen        text,                         -- ruta de la foto (img/platos/<slug>.webp)
  destacado     boolean not null default false,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 3) pedidos — cabecera de la orden
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

-- 4) pedido_items — detalle de la orden (1 pedido → N ítems)
create table public.pedido_items (
  id              bigint generated always as identity primary key,
  pedido_id       bigint not null references public.pedidos(id) on delete cascade,
  plato_id        bigint not null references public.platos(id),
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(6,2) not null
);
create index on public.pedido_items (pedido_id);

-- 5) devoluciones — la devolución como entidad propia (1 por pedido)
create table public.devoluciones (
  id         bigint generated always as identity primary key,
  pedido_id  bigint not null unique references public.pedidos(id) on delete cascade,
  motivo     text not null,
  estado     text not null default 'solicitada' check (estado in ('solicitada','aceptada','rechazada')),
  created_at timestamptz not null default now()
);

-- ============================================================
--  Seguridad por fila (RLS): cada usuario solo ve/edita lo suyo
-- ============================================================
alter table public.perfiles     enable row level security;
alter table public.platos       enable row level security;
alter table public.pedidos      enable row level security;
alter table public.pedido_items enable row level security;
alter table public.devoluciones enable row level security;

create policy perfiles_propio on public.perfiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

create policy platos_lectura on public.platos for select using (true);   -- catálogo público

create policy pedidos_select on public.pedidos for select using (auth.uid() = user_id);
create policy pedidos_insert on public.pedidos for insert with check (auth.uid() = user_id);
create policy pedidos_update on public.pedidos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy pedidos_delete on public.pedidos for delete using (auth.uid() = user_id);

create policy items_select on public.pedido_items for select
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = auth.uid()));
create policy items_insert on public.pedido_items for insert
  with check (exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = auth.uid()));

create policy dev_select on public.devoluciones for select
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = auth.uid()));
create policy dev_insert on public.devoluciones for insert
  with check (exists (select 1 from public.pedidos p where p.id = pedido_id and p.user_id = auth.uid()));

grant select on public.platos to anon, authenticated;
grant select, insert, update on public.perfiles to authenticated;
grant select, insert, update, delete on public.pedidos to authenticated;
grant select, insert on public.pedido_items to authenticated;
grant select, insert on public.devoluciones to authenticated;

-- ============================================================
--  Catálogo inicial (16 platos)
-- ============================================================
insert into public.platos (nombre, descripcion, categoria, precio_antes, precio, precio_oferta, vence, destacado) values
('Capuccino','Espuma con devoción, tibio y bendito. Del último jarro del día, listo para rescatar.','cafe',10.00,6.00,null,'hoy',false),
('Latte','Leche sedosa y café con culto. Suave, cremoso y sin desperdicio.','cafe',11.00,6.60,null,'hoy',false),
('Cold Brew','Frío, paciente y fiel. Preparado ayer, mejor hoy, a precio rescatado.','cafe',12.00,7.20,null,'mañana',false),
('Affogato','Helado ahogado en espresso, pura tentación. Última copa del día, rescátala.','cafe',13.00,7.80,5.20,'hoy',false),
('Bowl de Yogurt','Yogurt fresco, fruta y granola con culto. Sano, generoso y a mitad de precio.','dulce',22.00,11.00,null,'mañana',false),
('French Toast','Pan dorado y dulce, ofrenda de la mañana. Recién hecho, listo para rescatar.','dulce',24.00,12.00,null,'hoy',true),
('Panqueques de Pistacho','Un pequeño milagro para equilibrar el alma. Últimas porciones del día.','dulce',26.00,13.00,7.80,'mañana',true),
('Berry Bowl','Berries frescos que piden ser rescatados hoy. Dulce, ácido y sin culpa.','dulce',23.00,11.50,9.20,'hoy',false),
('Media Luna Clásica','Hojaldre dorado del horno de la mañana. Todavía tierna, rescátala antes que nadie.','bakery',8.00,4.00,null,'hoy',false),
('Banana Bread','Pan de plátano húmedo y con culto. Del día, jugoso y a media tarifa.','bakery',8.00,4.00,null,'mañana',false),
('Brownie','Chocolate denso, casi pecado. Última fila de la bandeja, listo para rescatar.','bakery',9.00,4.50,3.60,'hoy',false),
('Media Luna Jamón y Queso','Hojaldre relleno, salado y bendito. Del horno de hoy, a mitad de precio.','bakery',12.00,6.00,null,'mañana',false),
('Butifarra','El sánguche peruanísimo y bendito. Del mostrador a tu mano, sin desperdicio.','salado',20.00,12.00,8.00,'hoy',true),
('Huevos de la Casa','Huevos al punto con toque de culto. Desayuno del día que no merece el tacho.','salado',20.00,12.00,null,'hoy',false),
('Salchicha AQP','Salchicha huachana arequipeña, criolla y buena. Sartén de hoy, precio rescatado.','salado',21.00,12.60,null,'mañana',false),
('Divina Trucha','Trucha andina fresca, casi un milagro. Última ración del día, rescátala.','salado',27.00,16.20,8.10,'hoy',false);

-- Rutas de las fotos de cada plato (archivos en img/platos/)
update public.platos p set imagen = 'img/platos/' || m.slug || '.webp'
from (values
  (1,'capuccino'),(2,'latte'),(3,'cold-brew'),(4,'affogato'),(5,'bowl-yogurt'),
  (6,'french-toast'),(7,'panqueques-pistacho'),(8,'berry-bowl'),(9,'media-luna-clasica'),
  (10,'banana-bread'),(11,'brownie'),(12,'media-luna-jyq'),(13,'butifarra'),
  (14,'huevos-casa'),(15,'salchicha-aqp'),(16,'divina-trucha')
) as m(id, slug)
where p.id = m.id;
