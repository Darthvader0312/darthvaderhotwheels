# Darth Vader tienda Hotwheels — catálogo gratuito

Incluye catálogo móvil, búsqueda y categorías, descuentos, carrito, recepción de pedidos, panel privado de productos, inventario y cambio de estados. Los importes se validan en la base de datos, no se aceptan precios inventados por el navegador.

## ¿Qué necesitas?

1. Una cuenta gratuita de **Supabase** (https://supabase.com) para productos, pedidos y acceso privado.
2. **GitHub Pages** (https://pages.github.com) o **Cloudflare Pages** (https://pages.cloudflare.com) para alojar estos archivos de forma gratuita dentro de los límites del proveedor. La URL gratuita será un subdominio del proveedor.
3. Un navegador y un correo electrónico. No necesitas comprar un dominio ni contratar un desarrollador para esta versión.

## Configuración paso a paso

1. Crea un proyecto en Supabase. En **SQL Editor**, pega TODO el contenido de `supabase.sql` y ejecútalo una sola vez en una base nueva.
2. En **Authentication > Users**, crea tu usuario administrador (correo y contraseña). Si Supabase requiere confirmar el correo, confírmalo.
3. En **SQL Editor**, ejecuta por separado, cambiando el correo por el tuyo:

   ```sql
   insert into public.store_admins(user_id)
   select id from auth.users where email = 'tu-correo@ejemplo.com';
   ```

4. Ve a **Project Settings / API** (los nombres pueden variar según la interfaz). Copia la **Project URL** y la clave **anon/public/publishable**. Pégalas en `config.js`, sustituyendo los textos de ejemplo. **NUNCA** pegues una clave `service_role` o `secret` en el navegador.
5. El WhatsApp comercial **ya está configurado** como `593963717971` en `config.js`. Si cambias de número, edita ese valor sin `+`.
6. Sube los archivos de esta carpeta a un repositorio de GitHub y activa **Settings > Pages > Deploy from a branch** (rama `main`, carpeta `/root`). Si prefieres Cloudflare Pages, importa ese repositorio y publica el directorio raíz como sitio estático.
7. Entra a `https://tu-sitio.../admin.html`, inicia sesión y crea tus productos. Tus clientes usarán la dirección principal `https://tu-sitio.../`.
8. Si el proveedor de Auth limita las URL admitidas, configura la dirección final en Supabase **Authentication > URL Configuration**.

## Operación de los pedidos

- El visitante añade productos y proporciona contacto. La solicitud queda **pendiente** en el panel y se abre WhatsApp con el texto del pedido. **El cliente debe pulsar Enviar en WhatsApp**; la apertura no garantiza que el mensaje haya sido enviado.
- En tu panel, al pasar el estado a **confirmado**, se descuenta automáticamente el stock, una sola vez.
- Si no alcanza el stock al confirmar, recibirás un error y no se descontará parcialmente.
- Cancelar un pedido confirmado **NO devuelve el stock automáticamente**: debes reponerlo editando el producto si procede.
- El precio se fija al realizar el pedido; si luego cambias los precios, el pedido anterior no cambia.
- Para fotografías de tus carritos reales, sube imágenes a un servicio con URL pública directa (por ejemplo el bucket público de Supabase Storage configurado por ti); pega la URL en el formulario. El prototipo no incluye subida integrada de archivos.

## Límites y seguridad

- La gratuidad depende de las cuotas y reglas vigentes de los proveedores. Pueden pausar recursos inactivos, poner límites de tráfico o cambiar planes.
- Los pedidos públicos no requieren cuenta, por lo que un atacante podría enviar spam. Antes de una campaña comercial importante añade protección anti-bots / rate limiting y aviso de privacidad. Esta primera versión no incorpora pasarela de pago, sistema de envíos, facturación, correos automáticos ni reservas de stock al añadir al carrito.
- El navegador público solo puede ver productos activos. Solo el administrador autorizado ve pedidos y modifica productos. El número telefónico del comprador no aparece en el catálogo público.
- Usa una contraseña segura, activa MFA en tu cuenta del proveedor y no compartas credenciales.
- Haz copias de seguridad/exporta pedidos regularmente; los planes gratis tienen condiciones de disponibilidad y respaldo variables.

## Archivos

- `index.html`, `shop.js`: catálogo y pedidos.
- `admin.html`, `admin.js`: panel privado.
- `styles.css`: diseño adaptable al celular.
- `config.js`: enlace a tu proyecto y nombre de la tienda.
- `supabase.sql`: estructura y políticas seguras.

**Importante:** esta entrega es el código listo para configurar, no una web ya publicada. Para hacerlo visible en Internet tendrás que ejecutar los pasos anteriores con cuentas bajo tu control.

## Personalización Hot Wheels

- Nombre: **Darth Vader tienda Hotwheels**. Para cambiarlo edita `STORE_NAME` en `config.js`.
- Categorías sugeridas: **Mainline, Premium, Treasure Hunt, Super Treasure Hunt, Team Transport, Boulevard, Monster Trucks, Sets**. Puedes escribir cualquier categoría desde el administrador.
- En `config.js`, el número comercial `WHATSAPP_NUMBER = '593963717971'` ya está incorporado (código 593 sin `+`).
- En modo demostración aparecen modelos y precios **ficticios** como ejemplos. Al conectar Supabase aparecen únicamente tus productos reales.
- El pedido se registra en Supabase **antes** de abrir WhatsApp. Si el cliente cierra WhatsApp sin pulsar Enviar, la solicitud puede permanecer pendiente en tu panel: verifica el mensaje antes de confirmar.
- La tienda no está asociada ni afiliada a Mattel/Hot Wheels. Si utilizas fotos o logos de terceros, respeta sus derechos. Para las fichas es preferible usar fotografías propias.
