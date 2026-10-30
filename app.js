'use strict';
/* StockScan - Inventario manual (PWA, sin backend, sin IA) */

const $ = s => document.querySelector(s);
const K = { inv: 'stockscan.inv' };
const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};

let inventory = store.get(K.inv, []);
let editId = null;

/* ---------- utilidades ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = Number(String(v ?? '').replace(/[^\d.]/g, '')); return Number.isFinite(n) ? n : 0; };
const money = n => (n > 0 ? ARS.format(n) : '—');
const safeUrl = u => (/^https?:\/\//i.test(u || '') ? u : '#');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600);
}
function persist() {
  if (!store.set(K.inv, inventory)) toast('⚠️ Sin espacio para guardar. Exportá un respaldo y borrá items.');
}


/* ---------- modelo ---------- */
const today = () => new Date().toISOString().slice(0, 10);
function newItem(d) {
  const p = num(d.precio);
  return {
    id: uid(), nombre: d.nombre, marca: d.marca || '', modelo: d.modelo || '', categoria: d.categoria || '',
    descripcion: d.descripcion || '', especificaciones: d.especificaciones || [], serie: d.serie || '',
    estado: d.estado || 'Nuevo', fechaCompra: d.fechaCompra || '', proveedor: d.proveedor || '',
    qty: Math.max(1, parseInt(d.qty, 10) || 1), ubicacion: d.ubicacion || '', thumb: null,
    precio: { min: p, promedio: p, max: p, fecha: today(), fuentes: [], nota: '' },
    creado: new Date().toISOString()
  };
}

/* ---------- carga rápida ---------- */
function parseQuick(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
    const sep = l.includes(';') ? ';' : '.';
    const [nombre, marca, modelo, precio, qty, ubicacion, categoria] = l.split(sep).map(x => x.trim());
    return { nombre, marca, modelo, precio, qty, ubicacion, categoria };
  }).filter(d => d.nombre);
}
$('#quick').addEventListener('input', () => {
  const n = parseQuick($('#quick').value).length;
  $('#quick-preview').textContent = n ? `${n} ítem${n > 1 ? 's' : ''} para agregar` : '';
});
$('#quick-save').onclick = () => {
  const list = parseQuick($('#quick').value);
  if (!list.length) return toast('Escribí al menos un nombre');
  list.reverse().forEach(d => inventory.unshift(newItem(d)));
  persist(); $('#quick').value = ''; $('#quick-preview').textContent = '';
  toast(`✅ ${list.length} agregado${list.length > 1 ? 's' : ''}`); renderInventory(); showView('view-inv');
};

/* ---------- carga detallada / edición ---------- */
const F = id => $('#f-' + id);
const specsToText = a => (a || []).map(s => `${s.k}: ${s.v}`).join('\n');
const textToSpecs = t => t.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
  const i = l.indexOf(':'); return i > 0 ? { k: l.slice(0, i).trim(), v: l.slice(i + 1).trim() } : { k: l, v: '' };
});
function fillForm(i) {
  F('nombre').value = i?.nombre || ''; F('marca').value = i?.marca || ''; F('modelo').value = i?.modelo || '';
  F('categoria').value = i?.categoria || ''; F('serie').value = i?.serie || '';
  F('precio').value = i && i.precio.promedio ? i.precio.promedio : ''; F('qty').value = i?.qty || 1;
  F('estado').value = i?.estado || 'Nuevo'; F('ubi').value = i?.ubicacion || '';
  F('fecha').value = i?.fechaCompra || ''; F('proveedor').value = i?.proveedor || '';
  F('desc').value = i?.descripcion || ''; F('specs').value = specsToText(i?.especificaciones);
  $('#full-title').textContent = i ? 'Editar herramienta' : 'Nueva herramienta';
}
function showTab(id) {
  document.querySelectorAll('.tab').forEach(t => (t.hidden = t.id !== id));
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
}
document.querySelectorAll('.tabs button').forEach(b => (b.onclick = () => { if (b.dataset.tab === 'tab-full' && editId === null) fillForm(null); showTab(b.dataset.tab); }));
$('#f-cancel').onclick = () => { const was = editId; editId = null; fillForm(null); showTab('tab-quick'); if (was) showView('view-inv'); };
$('#form-full').addEventListener('submit', e => {
  e.preventDefault();
  const d = {
    nombre: F('nombre').value.trim(), marca: F('marca').value.trim(), modelo: F('modelo').value.trim(),
    categoria: F('categoria').value.trim(), serie: F('serie').value.trim(), precio: F('precio').value,
    qty: F('qty').value, estado: F('estado').value, ubicacion: F('ubi').value.trim(),
    fechaCompra: F('fecha').value, proveedor: F('proveedor').value.trim(),
    descripcion: F('desc').value.trim(), especificaciones: textToSpecs(F('specs').value)
  };
  if (!d.nombre) return;
  if (editId) {
    const it = inventory.find(i => i.id === editId);
    if (it) {
      const p = num(d.precio), cambio = p !== it.precio.promedio;
      Object.assign(it, { ...d, qty: Math.max(1, parseInt(d.qty, 10) || 1) });
      it.precio = { ...it.precio, min: p, promedio: p, max: p, ...(cambio ? { fecha: today(), fuentes: [], nota: '' } : {}) };
    }
    toast('✅ Cambios guardados');
  } else { inventory.unshift(newItem(d)); toast('✅ Guardado en inventario'); }
  persist(); editId = null; fillForm(null); showTab('tab-quick'); renderInventory(); showView('view-inv');
});

/* ---------- render ---------- */
function specsBlock(f) {
  return f.especificaciones?.length ? `<ul class="specs">${f.especificaciones.map(s => `<li><b>${esc(s.k)}:</b> ${esc(s.v)}</li>`).join('')}</ul>` : '';
}
function detailsBlock(i) {
  const rows = [['Categoría', i.categoria], ['Estado', i.estado], ['Nº de serie', i.serie], ['Compra', i.fechaCompra], ['Proveedor', i.proveedor]]
    .filter(r => r[1]).map(r => `<li><b>${r[0]}:</b> ${esc(r[1])}</li>`).join('');
  return `${i.descripcion ? `<p>${esc(i.descripcion)}</p>` : ''}${rows ? `<ul class="specs">${rows}</ul>` : ''}${specsBlock(i)}`;
}

function renderInventory() {
  $('#count').textContent = inventory.length;
  $('#cats').innerHTML = [...new Set(inventory.map(i => i.categoria).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('');
  const q = $('#filter').value.trim().toLowerCase();
  const items = inventory.filter(i => !q || [i.nombre, i.marca, i.modelo, i.categoria, i.ubicacion, i.serie, i.proveedor].join(' ').toLowerCase().includes(q));
  const units = inventory.reduce((a, i) => a + i.qty, 0);
  const total = inventory.reduce((a, i) => a + i.qty * i.precio.promedio, 0);
  $('#totals').innerHTML = `<div><span>Ítems</span>${inventory.length}</div><div><span>Unidades</span>${units}</div><div><span>Valor estimado</span>${money(total)}</div>`;
  $('#list').innerHTML = items.length ? items.map(i => `<div class="item" data-id="${i.id}">
    ${i.thumb ? `<img src="${i.thumb}" alt="">` : '<img alt="" src="icon-192.png">'}
    <div class="info">
      <h3>${esc(i.nombre)}</h3>
      <div class="sub">${esc([i.marca, i.modelo, i.categoria].filter(Boolean).join(' · '))}${i.ubicacion ? ' · 📍' + esc(i.ubicacion) : ''}</div>
      <div><b>${money(i.precio.promedio)}</b> <span class="sub">c/u · al ${esc(i.precio.fecha)} · subtotal ${money(i.precio.promedio * i.qty)}</span></div>
      <div class="qty"><button data-a="minus">−</button><b>${i.qty}</b><button data-a="plus">+</button>
        <button data-a="info">ℹ️</button><button data-a="edit" title="Editar">✏️</button><button data-a="del" class="danger">🗑</button></div>
      <div class="more" hidden>${detailsBlock(i) || '<span class="sub">Sin más datos.</span>'}</div>
    </div></div>`).join('') : `<div class="empty">${inventory.length ? 'Sin resultados.' : 'Todavía no cargaste nada.<br>Usá la carga rápida o la detallada.'}</div>`;
}

$('#list').addEventListener('click', e => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const card = b.closest('.item'); const item = inventory.find(i => i.id === card.dataset.id); if (!item) return;
  const a = b.dataset.a;
  if (a === 'plus') item.qty++;
  else if (a === 'minus') item.qty = Math.max(1, item.qty - 1);
  else if (a === 'info') { const m = card.querySelector('.more'); m.hidden = !m.hidden; return; }
  else if (a === 'edit') { editId = item.id; fillForm(item); showTab('tab-full'); showView('view-add'); return; }
  else if (a === 'del') { if (!confirm('¿Borrar "' + item.nombre + '"?')) return; inventory = inventory.filter(i => i !== item); }
  persist(); renderInventory();
});

/* ---------- export / import ---------- */
function download(name, mime, data) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: mime }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#btn-csv').onclick = () => {
  const rows = [['Nombre', 'Marca', 'Modelo', 'Categoría', 'Estado', 'Nº serie', 'Cantidad', 'Ubicación', 'Precio ARS', 'Subtotal ARS', 'Fecha precio', 'Fecha compra', 'Proveedor', 'Descripción']];
  inventory.forEach(i => rows.push([i.nombre, i.marca, i.modelo, i.categoria, i.estado, i.serie, i.qty, i.ubicacion, i.precio.promedio, i.precio.promedio * i.qty, i.precio.fecha, i.fechaCompra, i.proveedor, i.descripcion]));
  const csv = rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(';')).join('\r\n');
  download('stockscan-inventario.csv', 'text/csv;charset=utf-8', '\ufeff' + csv);
};
$('#btn-json').onclick = () => download('stockscan-respaldo.json', 'application/json', JSON.stringify(inventory));
$('#import').onchange = async e => {
  try {
    const data = JSON.parse(await e.target.files[0].text());
    if (!Array.isArray(data)) throw 0;
    const ids = new Set(inventory.map(i => i.id));
    inventory = [...data.filter(i => i && i.id && i.precio && !ids.has(i.id)), ...inventory];
    persist(); renderInventory(); toast('Respaldo restaurado');
  } catch { toast('Archivo inválido'); }
  e.target.value = '';
};

/* ---------- navegación ---------- */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.view === id));
  if (id === 'view-inv') renderInventory();
  window.scrollTo(0, 0);
}
document.querySelectorAll('nav button').forEach(b => (b.onclick = () => showView(b.dataset.view)));
$('#filter').oninput = renderInventory;

/* ---------- instalación PWA ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('#btn-install').hidden = false; });
window.addEventListener('appinstalled', () => { $('#btn-install').hidden = true; toast('✅ App instalada'); });
$('#btn-install').onclick = async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('#btn-install').hidden = true;
};
const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone) {
  $('#btn-install').hidden = false;
  $('#btn-install').onclick = () => toast('En Safari: Compartir ⬆ → "Agregar a inicio"');
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

renderInventory();
