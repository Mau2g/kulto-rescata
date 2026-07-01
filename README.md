# Kulto Rescata — Menos desperdicio, más sabor

Sitio web estático desarrollado para el curso **Taller de Programación Web (100000I57N) — UTP**, como **Avance de Proyecto Final 3 (APF3)**.

El sitio está orientado a la **reducción del desperdicio de alimentos**: permite que restaurantes y negocios oferten comidas próximas a vencer a precios accesibles. Reutiliza la identidad de marca de *Kulto* (café de especialidad de Arequipa), reconvertida al propósito de rescatar comida buena antes de que termine en la basura.

## Páginas del sitio

| Archivo | Página | Qué hace |
|---|---|---|
| `index.html` | Inicio | Portada, misión, cómo funciona y rescates destacados |
| `login.html` | Iniciar sesión | Formulario de acceso con validación |
| `registrar.html` | Registrar usuario | Formulario de registro con validación de contraseñas |
| `menu.html` | Menú de comidas | Catálogo de platos rescatados con filtros por categoría |
| `form_pedido.html` | Formulario de pedido | Pedido con cálculo de total en vivo |
| `pedidos.html` | Tabla de pedidos realizados | Tabla dinámica de pedidos con indicadores |
| `ofertas.html` | Ofertas especiales | Descuentos de última hora con animación |

## Estructura

```
kulto-rescata/
├── index.html, login.html, registrar.html, menu.html,
│   form_pedido.html, pedidos.html, ofertas.html
├── css/
│   └── estilos.css      Sistema de diseño único (todas las páginas)
├── js/
│   └── main.js          Comportamiento (menú, modales, validación, tabla)
└── img/
    ├── logo.png
    ├── mascota-salida.png
    ├── mascota-entrada.png
    └── hand.png
```

## Conceptos del sílabo aplicados

Solo se usaron temas vistos en el curso (Unidades 1, 2 y 3):

**HTML y CSS**
- Estructura de página: encabezado con menú, cuerpo y pie de página
- Formularios (login, registro, pedido) y tablas de datos
- Tipografía, fuentes e íconos externos (Google Fonts)
- **Flexbox** y **Grid Layout** en cada página
- **Animaciones y transiciones CSS** en cada página
- **Diseño responsivo con Media Queries** en cada página

**JavaScript básico**
- Variables, constantes, operadores y arreglos
- Estructuras de control
- Métodos de entrada/salida: `prompt`, `confirm`, `alert`
- Eventos desde HTML: `onclick`, `onchange`, `oninput`, `onsubmit`
- Manipulación del DOM con `document`
- Menú responsivo y ventanas flotantes (modales)

## Cómo verlo

Es un sitio 100% estático: abre `index.html` en el navegador. No necesita servidor ni instalación.

## Autor

Mauricio Gómez · Taller de Programación Web · UTP · Ciclo 2026-1
