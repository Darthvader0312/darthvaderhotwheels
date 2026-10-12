
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  STORE_NAME
} from './config.js';

// CONFIGURACION GENERAL
const $ = selector => document.querySelector(selector);

const escapeHTML = value =>
  String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

const money = amount =>
  new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(Number(amount) || 0);

// LIMITE DE FOTOGRAFIAS: 50 MB
const BUCKET = 'product-images';
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

const validTypes = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/png': 'png',
  'image/x-png': 'png',
  'image/webp': 'webp'
const configured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_ANON_KEY.includes('PEGA_AQUI');

const db = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let products = [];
let orders = [];
let previewObjectURL = null;

// NOMBRE DE LA TIENDA
document.querySelectorAll('[data-store]').forEach(el => {
  el.textContent = STORE_NAME;
});

if (!db) {
  $('#setupNotice').hidden = false;
  $('#setupNotice').textContent =
    'Revisa la conexion con Supabase en config.js.';
  $('#loginForm button').disabled = true;
}

function status(message) {
  $('#adminStatus').textContent = message;
}

// INICIO DE SESION

async function session() {
  if (!db) return;

  const {
    data: { user },
    error
  } = await db.auth.getUser();

  if (error || !user) {
    $('#loginSection').hidden = false;
    $('#dashboard').hidden = true;
    $('#logout').hidden = true;
    return;
  }

  const {
    data: allowed,
    error: permissionError
  } = await db.rpc('is_store_admin');

  if (permissionError || !allowed) {
    await db.auth.signOut();

    $('#loginSection').hidden = false;
    $('#dashboard').hidden = true;
    $('#logout').hidden = true;

    $('#loginStatus').textContent =
      permissionError?.message ||
      'Esta cuenta no esta autorizada como administradora.';
    return;
  }

  $('#loginSection').hidden = true;
  $('#dashboard').hidden = false;
  $('#logout').hidden = false;

  await refresh();
}

$('#loginForm').onsubmit = async event => {
  event.preventDefault();

  if (!db) return;

  $('#loginStatus').textContent = 'Verificando...';

  const { error } = await db.auth.signInWithPassword({
    email: $('#email').value.trim(),
    password: $('#password').value
  });

  if (error) {
    $('#loginStatus').textContent = error.message;
    return;
  }

  $('#loginStatus').textContent = '';
  await session();
};

$('#logout').onclick = async () => {
  if (!db) return;

  await db.auth.signOut();
  await session();
};

// CARGAR PRODUCTOS Y PEDIDOS

async function refresh() {
  const [p, o] = await Promise.all([
    db.from('products')
      .select('*')
      .order('created_at', { ascending: false }),

    db.from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
  ]);

  if (p.error || o.error) {
    status(
      'Error: ' +
      (p.error?.message || o.error?.message)
    );
    return;
  }

  products = p.data || [];
  orders = o.data || [];

  $('#statProducts').textContent = products.length;

  $('#statStock').textContent = products.reduce(
    (sum, p) => sum + Number(p.stock || 0),
    0
  );

  $('#statOrders').textContent = orders.length;

  status('');
  renderProducts();
  renderOrders();
}

// INVENTARIO DE PRODUCTOS

function renderProducts() {
  $('#productRows').innerHTML = products.length
    ? products.map(p => `
      <tr>
        <td>
          ${p.image_url ? `
            <img
              src="${escapeHTML(p.image_url)}"
              alt=""
              loading="lazy"
              style="
                width:54px;
                height:54px;
                object-fit:contain;
                vertical-align:middle;
                margin-right:8px;
                border-radius:7px;
              "
            >
          ` : ''}

          <b>${escapeHTML(p.name)}</b>

          <div class="tiny muted">
            ${escapeHTML(p.category || 'Sin categoria')}
          </div>
        </td>

        <td>${money(p.price)}</td>
        <td>${Number(p.discount_percent || 0)}%</td>
        <td>${Number(p.stock || 0)}</td>
        <td>${p.active ? 'Si' : 'No'}</td>

        <td>
          <button data-edit="${escapeHTML(p.id)}">
            Editar
          </button>

          <button
            class="danger"
            data-delete="${escapeHTML(p.id)}"
          >
            Eliminar
          </button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="6">Todavia no hay productos.</td></tr>';

  document.querySelectorAll('[data-edit]').forEach(button => {
    button.onclick = () => {
      const product = products.find(
        p => String(p.id) === button.dataset.edit
      );

      if (product) openProduct(product);
    };
  });

  document.querySelectorAll('[data-delete]').forEach(button => {
    button.onclick = async () => {
      if (!confirm(
        'Eliminar este producto? No se puede deshacer.'
      )) return;

      const { error } = await db
        .from('products')
        .delete()
        .eq('id', button.dataset.delete);

      if (error) {
        alert(error.message);
      }

      await refresh();
    };
  });
}

// ADMINISTRACION DE PEDIDOS

function renderOrders() {
  $('#orderRows').innerHTML = orders.length
    ? orders.map(o => `
      <article class="order">
        <header>
          <div>
            <b>
              Pedido #${escapeHTML(
                String(o.id).slice(0, 8).toUpperCase()
              )}
            </b>

            <div class="muted tiny">
              ${new Date(o.created_at).toLocaleString('es-EC')}
            </div>
          </div>

          <strong>${money(o.total)}</strong>
        </header>

        <p>
          <b>${escapeHTML(o.customer_name)}</b>
          · ${escapeHTML(o.customer_phone)}
          <br>
          ${escapeHTML(o.delivery_address || 'Sin direccion')}
          <br>
          ${escapeHTML(o.notes || '')}
        </p>

        <ul>
          ${(Array.isArray(o.items) ? o.items : []).map(item => `
            <li>
              ${escapeHTML(item.name)}
              × ${Number(item.quantity)}
              — ${money(item.unit_price * item.quantity)}
            </li>
          `).join('')}
        </ul>

        <label>Estado
          <select data-order="${escapeHTML(o.id)}">
            ${[
              'pendiente',
              'confirmado',
              'preparando',
              'entregado',
              'cancelado'
            ].map(s => `
              <option
                value="${s}"
                ${o.status === s ? 'selected' : ''}
              >
                ${s}
              </option>
            `).join('')}
          </select>
        </label>

        <p class="muted tiny">
          El stock se descuenta al confirmar el pedido.
          Si cancelas uno confirmado, deberas reponerlo
          manualmente.
        </p>
      </article>
    `).join('')
    : '<p class="muted">Todavia no hay pedidos.</p>';

  document.querySelectorAll('[data-order]').forEach(el => {
    el.onchange = async () => {
      const { error } = await db.rpc(
        'change_order_status',
        {
          p_order_id: el.dataset.order,
          p_new_status: el.value
        }
      );

      if (error) {
        alert('No se pudo actualizar: ' + error.message);
      }

      await refresh();
    };
  });
}

// VISTA PREVIA DE FOTOGRAFIAS

function showPreview(url) {
  const img = $('#pImagePreview');

  if (url) {
    img.src = url;
    img.hidden = false;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
  }
}

function clearTemporaryPreview() {
  if (previewObjectURL) {
    URL.revokeObjectURL(previewObjectURL);
    previewObjectURL = null;
  }
}

// ABRIR FORMULARIO DE PRODUCTOS

function openProduct(product = null) {
  clearTemporaryPreview();

  $('#productForm').reset();

  $('#productId').value = product?.id || '';

  $('#productModalTitle').textContent = product
    ? 'Editar producto'
    : 'Nuevo producto';

  $('#pName').value = product?.name || '';
  $('#pCategory').value = product?.category || '';
  $('#pDescription').value = product?.description || '';
  $('#pImage').value = product?.image_url || '';
  $('#pPrice').value = product?.price ?? '';
  $('#pDiscount').value = product?.discount_percent ?? 0;
  $('#pStock').value = product?.stock ?? 0;
  $('#pActive').checked = product?.active ?? true;

  $('#productStatus').textContent = '';

  showPreview(product?.image_url || '');

  $('#productDialog').showModal();
}

// SELECCIONAR FOTOGRAFIA DESDE LA GALERIA

$('#pImageFile').addEventListener('change', () => {
  clearTemporaryPreview();

  const file = $('#pImageFile').files[0];

  if (file) {
    if (!validTypes[file.type]) {
      $('#productStatus').textContent =
        'Solo se permiten imagenes JPG, PNG o WebP.';
      $('#pImageFile').value = '';
      showPreview($('#pImage').value.trim());
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      $('#productStatus').textContent =
        'La fotografia no debe superar los 50 MB.';
      $('#pImageFile').value = '';
      showPreview($('#pImage').value.trim());
      return;
    }

    $('#productStatus').textContent =
      'Fotografia seleccionada: ' +
      (file.size / 1024 / 1024).toFixed(2) +
      ' MB';

    previewObjectURL = URL.createObjectURL(file);
    showPreview(previewObjectURL);

  } else {
    showPreview($('#pImage').value.trim());
  }
});

$('#pImage').addEventListener('input', () => {
  if (!$('#pImageFile').files.length) {
    showPreview($('#pImage').value.trim());
  }
});

$('#newProduct').onclick = () => openProduct();

$('#closeProduct').onclick = () => {
  $('#productDialog').close();
};

$('#productDialog').addEventListener(
  'close',
  clearTemporaryPreview
);

// SUBIR FOTOGRAFIAS A SUPABASE STORAGE
// PERMITE HASTA 50 MB

async function uploadImage(file) {
  if (!validTypes[file.type]) {
    throw new Error(
      'La fotografia debe ser JPG, PNG o WebP.'
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      'La fotografia no debe superar los 50 MB.'
    );
  }

  const {
    data: { user },
    error: userError
  } = await db.auth.getUser();

  if (userError || !user) {
    throw new Error(
      'Debes iniciar sesion nuevamente.'
    );
  }

  const fileName =
    `${user.id}/${crypto.randomUUID()}.${validTypes[file.type]}`;

  const { error } = await db.storage
    .from(BUCKET)
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(
      'No se pudo subir la fotografia: ' + error.message
    );
  }

  const { data } = db.storage
    .from(BUCKET)
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// GUARDAR Y EDITAR PRODUCTOS

$('#productForm').onsubmit = async event => {
  event.preventDefault();

  const button = $(
    '#productForm button[type="submit"]'
  );

  button.disabled = true;

  $('#productStatus').textContent =
    'Guardando producto...';

  try {
    let imageUrl = $('#pImage').value.trim() || null;

    const file = $('#pImageFile').files[0];

    if (file) {
      $('#productStatus').textContent =
        'Subiendo fotografia a Supabase...';

      imageUrl = await uploadImage(file);
    }

    const payload = {
      name: $('#pName').value.trim(),
      category: $('#pCategory').value.trim(),
      description: $('#pDescription').value.trim(),
      image_url: imageUrl,
      price: Number($('#pPrice').value),
      discount_percent: Number($('#pDiscount').value),
      stock: Number($('#pStock').value),
      active: $('#pActive').checked
    };

    const id = $('#productId').value;

    const { error } = id
      ? await db.from('products')
          .update(payload)
          .eq('id', id)
      : await db.from('products')
          .insert(payload);

    if (error) {
      throw error;
    }

    $('#productDialog').close();
    await refresh();

  } catch (error) {
    $('#productStatus').textContent =
      error.message ||
      'Error al guardar el producto.';

  } finally {
    button.disabled = false;
  }
};

// PESTANAS PRODUCTOS Y PEDIDOS

document.querySelectorAll('[data-tab]').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('[data-tab]').forEach(other => {
      other.classList.toggle(
        'active',
        other === button
      );
    });

    ['productPanel', 'orderPanel'].forEach(id => {
      $('#' + id).hidden =
        button.dataset.tab !== id;
    });
  };
});

// INICIAR ADMINISTRADOR

session().catch(error => {
  $('#loginStatus').textContent =
    'Error de conexion: ' + error.message;
});
