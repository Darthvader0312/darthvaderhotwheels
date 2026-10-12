
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STORE_NAME,
  WHATSAPP_NUMBER
} from './config.js';

const $ = selector => document.querySelector(selector);

const money = value => new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD'
}).format(Number(value) || 0);

const escapeHTML = value =>
  String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

// FOTOGRAFIAS SEGURAS
function safeImage(url) {
  if (!url) return null;

  try {
    const parsed = new URL(String(url), window.location.href);
    return ['http:', 'https:'].includes(parsed.protocol)
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

// CONEXION CON SUPABASE
document.querySelectorAll('[data-store]').forEach(el => {
  el.textContent = STORE_NAME;
});

const configured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_ANON_KEY.includes('PEGA_AQUI');

const db = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let products = [];
let cart = {};

const price = product => Math.round(
  Number(product.price) *
  (1 - Number(product.discount_percent || 0) / 100) *
  100
) / 100;

// MOSTRAR PRODUCTOS
function render() {
  const query = $('#search').value.toLocaleLowerCase().trim();
  const category = $('#category').value;

  const filtered = products.filter(product =>
    (!category || product.category === category) &&
    [product.name, product.description, product.category]
      .join(' ')
      .toLocaleLowerCase()
      .includes(query)
  );

  $('#status').textContent = filtered.length
    ? `${filtered.length} producto(s) disponibles para consultar`
    : 'No encontramos productos con ese filtro.';

  $('#products').innerHTML = filtered.map(product => {
    const imageUrl = safeImage(product.image_url);
    const stock = Number(product.stock) || 0;

    const photo = imageUrl
      ? `
        <button
          type="button"
          class="product-media"
          data-zoom="${escapeHTML(product.id)}"
          aria-label="Ampliar fotografía de ${escapeHTML(product.name)}"
          title="Toca para ampliar"
        >
          <img
            src="${escapeHTML(imageUrl)}"
            alt="${escapeHTML(product.name)}"
            loading="lazy"
            referrerpolicy="no-referrer"
          >
          <span class="zoom-label">⌕ Ampliar foto</span>
        </button>
      `
      : `
        <div class="product-media product-placeholder"
          aria-label="Sin fotografía disponible">
          📷
          <span>Fotografía pendiente</span>
        </div>
      `;

    return `
      <article class="product">
        ${photo}

        <div class="info">
          <span class="tag">
            ${escapeHTML(product.category || 'Producto')}
          </span>

          <h3>${escapeHTML(product.name)}</h3>

          <p class="desc">
            ${escapeHTML(product.description || '')}
          </p>

          <div>
            <span class="price">${money(price(product))}</span>
            ${Number(product.discount_percent) > 0
              ? `<span class="old">${money(product.price)}</span>`
              : ''}
          </div>

          <p class="stock ${stock <= 0 ? 'out' : ''}">
            ${stock > 0
              ? `${stock} unidad(es) disponibles`
              : 'Agotado'}
          </p>

          <button
            type="button"
            class="add-cart"
            data-add="${escapeHTML(product.id)}"
            ${stock <= 0 ? 'disabled' : ''}
          >
            ${stock <= 0
              ? 'No disponible'
              : '+ Agregar al carrito'}
          </button>
        </div>
      </article>
    `;
  }).join('');

  // AGREGAR AL CARRITO
  document.querySelectorAll('[data-add]').forEach(button => {
    button.onclick = () => {
      const product = products.find(
        item => String(item.id) === button.dataset.add
      );

      if (!product) return;

      cart[product.id] = Math.min(
        Number(product.stock),
        (cart[product.id] || 0) + 1
      );

      updateCart();
    };
  });

  // AMPLIAR FOTOGRAFIA
  document.querySelectorAll('[data-zoom]').forEach(button => {
    button.onclick = () => {
      const product = products.find(
        item => String(item.id) === button.dataset.zoom
      );

      const url = product
        ? safeImage(product.image_url)
        : null;

      if (!product || !url) return;

      $('#zoomImage').src = url;
      $('#zoomImage').alt = product.name;
      $('#zoomName').textContent = product.name;
      $('#imageDialog').showModal();
    };
  });
}

// CERRAR FOTOGRAFIA AMPLIADA
$('#closeImage').onclick = () => {
  $('#imageDialog').close();
};

$('#imageDialog').addEventListener('click', event => {
  if (event.target === $('#imageDialog')) {
    $('#imageDialog').close();
  }
});

// ACTUALIZAR CARRITO
function updateCart() {
  Object.keys(cart).forEach(id => {
    const product = products.find(
      item => String(item.id) === id
    );

    if (!product || Number(product.stock) < 1) {
      delete cart[id];
    } else {
      cart[id] = Math.min(
        cart[id],
        Number(product.stock)
      );
    }
  });

  $('#cartCount').textContent =
    Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const entries = Object.entries(cart);

  $('#cartLines').innerHTML = entries.length
    ? entries.map(([id, qty]) => {
        const product = products.find(
          item => String(item.id) === id
        );

        return `
          <div class="cartLine">
            <div>
              <b>${escapeHTML(product.name)}</b>
              <div class="muted">
                ${money(price(product))} c/u
              </div>
            </div>

            <input
              class="qty"
              type="number"
              min="0"
              max="${Number(product.stock)}"
              value="${qty}"
              data-qty="${escapeHTML(id)}"
              aria-label="Cantidad de ${escapeHTML(product.name)}"
            >

            <b>${money(price(product) * qty)}</b>
          </div>
        `;
      }).join('')
    : 'Tu carrito está vacío.';

  $('#cartTotal').textContent = money(
    entries.reduce((sum, [id, qty]) => {
      const product = products.find(
        item => String(item.id) === id
      );
      return sum + price(product) * qty;
    }, 0)
  );

  document.querySelectorAll('[data-qty]').forEach(input => {
    input.onchange = () => {
      const qty = Math.max(
        0,
        Math.min(
          Number(input.max),
          Math.floor(Number(input.value) || 0)
        )
      );

      if (qty) {
        cart[input.dataset.qty] = qty;
      } else {
        delete cart[input.dataset.qty];
      }

      updateCart();
    };
  });
}

// BOTONES DEL CARRITO Y FILTROS
$('#cartButton').onclick = () => {
  updateCart();
  $('#cartDialog').showModal();
};

$('#closeCart').onclick = () => {
  $('#cartDialog').close();
};

$('#search').oninput = render;
$('#category').onchange = render;

// CARGAR PRODUCTOS DESDE SUPABASE
async function load() {
  if (!db) {
    $('#status').textContent =
      'Configura Supabase para publicar tu catálogo.';

    products = [];
    render();
    updateCart();
    return;
  }

  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    $('#status').textContent =
      'No se pudo cargar el catálogo: ' + error.message;
    return;
  }

  products = data || [];

  const categories = [
    ...new Set(
      products.map(p => p.category).filter(Boolean)
    )
  ].sort();

  $('#category').innerHTML =
    '<option value="">Todas las categorías</option>' +
    categories.map(c => `
      <option value="${escapeHTML(c)}">
        ${escapeHTML(c)}
      </option>
    `).join('');

  render();
  updateCart();
}

// FORMAS DE PAGO
const paymentLabels = {
  pichincha: 'Transferencia Banco Pichincha',
  produbanco: 'Transferencia Produbanco',
  efectivo: 'Efectivo (a coordinar)'
};

// FORMAS DE ENTREGA
const deliveryLabels = {
  ambato: 'Entrega coordinada en Ambato',
  nacional: 'Envío nacional (costo por confirmar)'
};

$('#deliveryMethod').onchange = () => {
  const needsAddress =
    $('#deliveryMethod').value === 'nacional';

  $('#customerAddress').required = needsAddress;
};

// REGISTRAR PEDIDO Y ENVIAR A WHATSAPP
$('#checkout').onsubmit = async event => {
  event.preventDefault();

  if (!db) {
    $('#checkoutStatus').textContent =
      'Conecta Supabase antes de recibir pedidos.';
    return;
  }

  const entries = Object.entries(cart);

  if (!entries.length) {
    $('#checkoutStatus').textContent =
      'Primero agrega productos.';
    return;
  }

  if (!/^\d{10,15}$/.test(WHATSAPP_NUMBER)) {
    $('#checkoutStatus').textContent =
      'El número de WhatsApp de la tienda no está configurado.';
    return;
  }

  const payment = paymentLabels[$('#paymentMethod').value];
  const delivery = deliveryLabels[$('#deliveryMethod').value];

  const address = $('#customerAddress').value.trim();
  const notes = $('#customerNotes').value.trim();

  if (!payment || !delivery) {
    $('#checkoutStatus').textContent =
      'Selecciona forma de entrega y pago.';
    return;
  }

  if (
    $('#deliveryMethod').value === 'nacional' &&
    !address
  ) {
    $('#checkoutStatus').textContent =
      'Indica tu ciudad y dirección para el envío.';
    return;
  }

  const button = $('#checkout button[type="submit"]');
  button.disabled = true;

  $('#checkoutStatus').textContent = 'Registrando pedido…';

  try {
    const customer = $('#customerName').value.trim();
    const phone = $('#customerPhone').value.trim();

    const items = entries.map(([id, quantity]) => ({
      id,
      quantity
    }));

    // Guardamos pago y entrega en las notas existentes.
    const orderNotes = [
      `Pago: ${payment}`,
      `Entrega: ${delivery}`,
      notes ? `Notas: ${notes}` : ''
    ].filter(Boolean).join(' | ');

    const { data, error } = await db.rpc(
      'place_public_order',
      {
        p_customer_name: customer,
        p_customer_phone: phone,
        p_delivery_address: address,
        p_notes: orderNotes,
        p_items: items
      }
    );

    if (error) throw error;

    const ref = String(data).slice(0, 8).toUpperCase();

    const orderLines = entries.map(([id, quantity]) => {
      const product = products.find(
        item => String(item.id) === id
      );

      return `• ${product.name} × ${quantity} — ${money(
        price(product) * quantity
      )}`;
    });

    const total = entries.reduce((sum, [id, qty]) => {
      const product = products.find(
        item => String(item.id) === id
      );

      return sum + price(product) * qty;
    }, 0);

    const message = [
      `Hola, quiero confirmar mi pedido en ${STORE_NAME}.`,
      `Referencia: #${ref}`,
      `Cliente: ${customer}`,
      `Teléfono: ${phone}`,
      `Entrega: ${delivery}`,
      address ? `Dirección: ${address}` : '',
      `Forma de pago: ${payment}`,
      notes ? `Observaciones: ${notes}` : '',
      ...orderLines,
      `TOTAL PRODUCTOS: ${money(total)}`,
      'El costo de envío, si corresponde, queda por confirmar.'
    ].filter(Boolean).join('\n');

    const url =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    $('#checkoutStatus').textContent =
      `Pedido #${ref} registrado. `;

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent =
      'Abrir WhatsApp para enviar el pedido';

    $('#checkoutStatus').append(link);

    cart = {};
    updateCart();
    $('#checkout').reset();
    $('#customerAddress').required = false;

    window.open(url, '_blank', 'noopener,noreferrer');

    await load();

  } catch (error) {
    $('#checkoutStatus').textContent =
      'No se pudo registrar el pedido: ' +
      error.message;

  } finally {
    button.disabled = false;
  }
};

// INICIAR CATALOGO
load().catch(error => {
  $('#status').textContent =
    'Error al cargar productos: ' + error.message;
});
