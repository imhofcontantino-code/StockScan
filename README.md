# 📦 StockScan - Inventario de herramientas

App instalable (PWA) para PC y celular. **Sin IA, sin API key, sin servidor**: todo corre en el navegador y el inventario queda guardado en tu dispositivo. Funciona offline.

## Cargar herramientas

- **⚡ Rápida:** una herramienta por línea, campos separados por punto:
  `nombre.marca.modelo.precio.cantidad.ubicación.categoría`
  Solo el nombre es obligatorio. Ej: `Taladro percutor.Bosch.GSB 13 RE.85000.1.Taller.Eléctricas`
  (También podés separar con `;` si algún dato lleva punto.)
- **📝 Detallada:** formulario con nombre, marca, modelo, categoría, nº de serie, precio, cantidad, estado, ubicación, fecha de compra, proveedor, descripción y especificaciones.
- **✏️ Editar** cualquier ítem desde el inventario.

## Respaldo
**Exportar CSV** (Excel) y **Respaldo JSON** / **Restaurar** desde Inventario. Hacé respaldos seguido: los datos viven solo en tu navegador.

## Publicar en GitHub
1. Creá un repo y subí **todo el contenido** de esta carpeta (incluida `.github/`).
2. Settings → Pages → Source: **GitHub Actions**.
3. Esperá a que termine la pestaña Actions. Tu app queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.
4. Instalar: Android (Chrome) botón "⬇ Instalar" · iPhone (Safari) Compartir → Agregar a inicio · PC (Chrome/Edge) ícono en la barra de direcciones.

Probar local: `python3 -m http.server 8080` → http://localhost:8080
