export const ADMIN_PANEL_HTML = `<section id="admin-view" class="admin-view admin-app">
      <header class="admin-header app-topbar">
        <div class="app-title-group"><img id="admin-header-logo" class="admin-header-logo" src="../assets/logo.png" alt=""><div><p id="admin-company-name" class="eyebrow">Importadora A&amp;N</p><h1 id="admin-title">Inicio</h1></div></div>
        <div class="header-actions"><span id="current-user-badge" class="user-role-badge"></span><a class="button secondary" href="../" target="_blank" rel="noopener">Ver catálogo</a><button id="logout" class="button secondary">Salir</button></div>
      </header>
      <nav id="admin-menu" class="admin-menu app-sidebar" aria-label="Menú de administración">
        <div class="sidebar-brand"><img id="admin-sidebar-logo" src="../assets/logo.png" alt=""><span><strong id="admin-sidebar-company">Importadora A&amp;N</strong><small>Centro de gestión</small></span></div>
        <button class="admin-menu-item active" data-admin-panel="dashboard-panel"><span>⌂</span><strong>Inicio</strong><small>Resumen del negocio</small></button>
        <button class="admin-menu-item" data-admin-panel="products-panel"><span>▦</span><strong>Productos</strong><small>Catálogo y precios</small></button>
        <button class="admin-menu-item" data-admin-panel="sales-panel"><span>＋</span><strong>Ventas</strong><small>Registrar e historial</small></button>
        <button class="admin-menu-item" data-admin-panel="profitability-panel"><span>▤</span><strong>Inventario</strong><small>Stock y rentabilidad</small></button>
        <button class="admin-menu-item" data-admin-panel="finance-panel"><span>Bs</span><strong>Finanzas</strong><small>Proveedor y liquidaciones</small></button>
        <button class="admin-menu-item" data-admin-panel="users-panel" data-role-only="administrador"><span>◎</span><strong>Usuarios</strong><small>Accesos y roles</small></button>
        <button class="admin-menu-item" data-admin-panel="catalog-settings-panel" data-role-only="administrador"><span>◇</span><strong>Configuración</strong><small>Marca y precios públicos</small></button>
        <button class="admin-menu-item" data-admin-panel="whatsapp-panel" data-role-only="administrador"><span>◉</span><strong>WhatsApp</strong><small>Mensaje para compartir</small></button>
      </nav>
      <main class="admin-content">
      <section id="dashboard-panel" class="dashboard-panel" data-panel-section>
        <div class="panel-heading-row"><div><p class="eyebrow">Vista general</p><h2>Hola, <span id="dashboard-user-name">Usuario</span></h2><p id="dashboard-date">Resumen actualizado del negocio.</p></div><button class="button primary quick-sale-button" type="button" data-open-panel="sales-panel">＋ Nueva venta</button></div>
        <div id="dashboard-status" class="dashboard-status">Cargando resumen…</div>
        <div id="dashboard-cards" class="dashboard-cards" aria-live="polite"></div>
        <div class="dashboard-grid">
          <article class="dashboard-widget"><header><div><p class="eyebrow">Inventario</p><h3>Stock bajo</h3></div><button class="text-button" type="button" data-open-panel="profitability-panel">Ver inventario</button></header><div id="dashboard-low-stock" class="dashboard-list"></div></article>
          <article class="dashboard-widget"><header><div><p class="eyebrow">Actividad</p><h3>Ventas recientes</h3></div><button class="text-button" type="button" data-open-panel="sales-panel">Ver ventas</button></header><div id="dashboard-recent-sales" class="dashboard-list"></div></article>
        </div>
      </section>
      <section id="sales-panel" class="module-placeholder" data-panel-section hidden>
        <div class="module-placeholder-card"><span class="module-icon">＋</span><p class="eyebrow">Siguiente módulo</p><h2>Ventas</h2><p>La base segura ya está lista. Aquí construiremos el registro rápido de ventas, optimizado para celular y con resumen lateral en escritorio.</p><div class="placeholder-features"><span>Precio real editable</span><span>Descuento automático</span><span>Ganancia en vivo</span><span>Descuento de stock</span></div></div>
      </section>
      <section id="finance-panel" class="module-placeholder" data-panel-section hidden>
        <div class="module-placeholder-card"><span class="module-icon">Bs</span><p class="eyebrow">Próximamente</p><h2>Finanzas</h2><p>Liquidaciones entregadas al proveedor, monto generado por ventas y saldo pendiente.</p></div>
      </section>
      <section id="users-panel" class="module-placeholder" data-panel-section hidden>
        <div class="module-placeholder-card"><span class="module-icon">◎</span><p class="eyebrow">Administración</p><h2>Usuarios</h2><p>Gestión de administradores, editores y usuarios de solo lectura.</p></div>
      </section>
      <section id="catalog-settings-panel" data-panel-section class="catalog-settings" hidden>
        <div class="settings-heading"><p class="eyebrow">Catálogo público</p><h2>Identidad y precios</h2><p>Estos cambios se mostrarán automáticamente en el catálogo público.</p></div>
        <form id="catalog-settings-form">
          <label>Nombre de la empresa<input id="company-name" type="text" maxlength="80" value="Importadora A&N" required></label>
          <div class="brand-editor">
            <img id="brand-logo-preview" src="../assets/logo.png" alt="Logotipo actual">
            <label>Cambiar logotipo<input id="company-logo" type="file" accept="image/jpeg,image/png,image/webp"><small>Usa una imagen cuadrada. Se comprimirá automáticamente.</small></label>
          </div>
          <label class="setting-toggle"><span><strong>Mostrar precios en el catálogo</strong><small>Si está desactivado, los visitantes verán “Consultar por WhatsApp”.</small></span><input id="show-prices" type="checkbox"><i aria-hidden="true"></i></label>
          <label class="setting-toggle"><span><strong>Mostrar “Mi costo” al abrir el panel</strong><small>Si está desactivado, el costo aparecerá oculto y podrás mostrarlo producto por producto.</small></span><input id="show-admin-cost" type="checkbox"><i aria-hidden="true"></i></label>
          <p id="catalog-settings-message" class="form-message"></p>
          <button class="button primary" type="submit">Guardar configuración</button>
        </form>
      </section>
      <section id="whatsapp-panel" data-panel-section class="message-settings" hidden>
        <div class="settings-heading">
          <div><p class="eyebrow">WhatsApp</p><h2>Mensaje para compartir</h2><p>Edita el texto que acompañará la fotografía. Los campos entre llaves se completan automáticamente para cada producto.</p></div>
        </div>
        <div class="template-layout">
          <form id="template-form">
            <label>Texto del mensaje
              <textarea id="share-template" rows="15" required>*{nombre}*

{descripcion}

*Incluye y presentación:*
{detalle}

*Precio:* {precio}
*Disponibilidad:* {disponibilidad}
*Código:* {codigo}

{enlace}</textarea>
            </label>
            <div class="template-help"><strong>Campos automáticos</strong><p>Tócalos para insertarlos. No cambies el texto dentro de las llaves. <code>{enlace}</code> coloca automáticamente la dirección pública del catálogo.</p><div id="template-variables"><button type="button" data-variable="{nombre}">Nombre</button><button type="button" data-variable="{descripcion}">Descripción</button><button type="button" data-variable="{detalle}">Detalle</button><button type="button" data-variable="{precio}">Precio</button><button type="button" data-variable="{disponibilidad}">Disponibilidad</button><button type="button" data-variable="{codigo}">Código</button><button type="button" data-variable="{enlace}">Enlace del catálogo</button></div></div>
            <p id="template-message" class="form-message"></p>
            <div class="admin-actions"><button class="button primary" type="submit">Guardar mensaje</button><button id="reset-template" class="button secondary" type="button">Restaurar texto original</button></div>
          </form>
          <div class="template-preview"><div class="preview-title"><strong>Así se verá</strong><span>Vista previa</span></div><pre id="template-preview"></pre></div>
        </div>
      </section>

      <section id="profitability-panel" data-panel-section class="profitability-panel" hidden>
        <div class="settings-heading profitability-heading">
          <div>
            <p class="eyebrow">Resumen financiero</p>
            <h2>Rentabilidad del inventario</h2>
            <p>Los totales son proyecciones según el stock y los precios registrados; no representan ventas realizadas.</p>
          </div>
        </div>
        <div id="profitability-summary" class="profitability-summary" aria-live="polite"></div>
        <div class="profitability-toolbar">
          <label class="admin-search" for="profitability-search">
            <span aria-hidden="true">⌕</span>
            <input id="profitability-search" type="search" placeholder="Buscar producto, SKU o color…" autocomplete="off">
            <button id="clear-profitability-search" type="button" aria-label="Limpiar búsqueda" hidden>×</button>
          </label>
          <p id="profitability-result-count" class="search-result-count" aria-live="polite"></p>
        </div>
        <div id="profitability-detail" class="profitability-detail"></div>
        <div id="profitability-empty" class="empty-search" hidden>
          <strong>No encontramos productos</strong>
          <span>Prueba con otro nombre, código o color.</span>
        </div>
      </section>
      <section id="products-panel" data-panel-section>
        <div class="admin-search-wrap">
          <label class="admin-search" for="product-search">
            <span aria-hidden="true">⌕</span>
            <input id="product-search" type="search" placeholder="Buscar por nombre, código o color…" autocomplete="off">
            <button id="clear-product-search" type="button" aria-label="Limpiar búsqueda" hidden>×</button>
          </label>
          <p id="search-result-count" class="search-result-count" aria-live="polite"></p>
        </div>
        <div id="admin-status" class="status">Cargando inventario…</div>
        <div id="admin-products" class="admin-products"></div>
        <div id="no-search-results" class="empty-search" hidden>
          <strong>No encontramos productos</strong>
          <span>Prueba con otro nombre, código o color.</span>
        </div>
      </section></main></section>`;
