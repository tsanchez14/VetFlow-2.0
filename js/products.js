import { supabase, getTenantId } from './supabase.js';
import { showToast, showLoading, hideLoading } from './ui.js';

/**
 * Products & Stock Management - VetFlow 2.0 (Refined v1.1)
 */

let allProducts = [];
let currentFilter = { query: '', category: '' };

async function init() {
    console.log("Products module initializing...");

    const tableBody = document.getElementById('product-list-body');
    if (!tableBody) {
        setTimeout(init, 100);
        return;
    }

    await loadProducts();

    // Listeners
    document.getElementById('search-product').oninput = (e) => {
        currentFilter.query = e.target.value.toLowerCase();
        renderProducts();
    };
    document.getElementById('filter-category').onchange = (e) => {
        currentFilter.category = e.target.value;
        renderProducts();
    };
    document.getElementById('form-producto').onsubmit = handleSaveProduct;
    document.getElementById('form-ajuste').onsubmit = handleSaveAdjustment;
}

async function loadProducts() {
    try {
        showLoading();
        const tenantId = await getTenantId();
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('nombre', { ascending: true });

        if (error) {
            throw error;
        }

        allProducts = data || [];
        updateSummary();
        renderProducts();
    } catch (err) {
        console.error(err);
        showToast("Error al cargar productos", "error");
    } finally {
        hideLoading();
    }
}

function updateSummary() {
    const lowStockCount = allProducts.filter(p => p.stock_actual <= p.stock_minimo).length;
    document.getElementById('low-stock-count').innerText = lowStockCount;
    document.getElementById('total-products-count').innerText = allProducts.length;
}

function renderProducts() {
    const tableBody = document.getElementById('product-list-body');

    const filtered = allProducts.filter(p => {
        const matchesQuery = p.nombre.toLowerCase().includes(currentFilter.query) || (p.codigo && p.codigo.toLowerCase().includes(currentFilter.query));
        const matchesCat = currentFilter.category === '' || p.categoria === currentFilter.category;
        return matchesQuery && matchesCat;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: #94a3b8;">No se encontraron productos.</td></tr>';
        return;
    }

    tableBody.innerHTML = filtered.map(p => {
        const isLow = p.stock_actual <= p.stock_minimo;
        return `
            <tr class="${isLow ? 'row-low-stock' : ''}">
                <td style="font-family: monospace; font-size: 0.75rem;">${p.codigo || 'S/C'}</td>
                <td style="font-weight: 700;">${p.nombre}</td>
                <td><span class="tag-category">${p.categoria || 'Sin cat.'}</span></td>
                <td><span>${p.stock_actual}</span> <small>${p.unidad_medida || 'unid'}</small></td>
                <td style="color: #94a3b8; font-weight: 600;">${p.stock_minimo}</td>
                <td style="text-align: right; font-weight: 800;">$${p.precio_venta.toLocaleString()}</td>
                <td style="text-align: center;">
                    <div class="actions-dropdown">
                        <button class="btn-actions-trigger" onclick="window.toggleActions(event, '${p.id}')">
                            Opciones <i class="fas fa-chevron-down" style="font-size: 0.6rem; margin-left: 5px;"></i>
                        </button>
                        <div id="dd-${p.id}" class="dropdown-menu">
                            <div class="dropdown-item" onclick="window.openEditModal('${p.id}')">
                                <i class="fas fa-edit"></i> Editar
                            </div>
                            <div class="dropdown-item" onclick="window.openMovementsModal('${p.id}')">
                                <i class="fas fa-history"></i> Movimientos
                            </div>
                            <div class="dropdown-item delete" onclick="window.deleteProduct('${p.id}')">
                                <i class="fas fa-trash-alt"></i> Eliminar
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// DROPDOWN LOGIC
window.toggleActions = (e, id) => {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `dd-${id}`) m.classList.remove('active');
    });
    document.getElementById(`dd-${id}`).classList.toggle('active');
};

// PRODUCT CRUD
window.openProductModal = (id = null) => {
    const form = document.getElementById('form-producto');
    form.reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('modal-title').innerText = id ? 'Editar Producto' : 'Nuevo Producto';

    if (id) {
        const p = allProducts.find(item => item.id === id);
        if (p) {
            document.getElementById('prod-id').value = p.id;
            document.getElementById('prod-nombre').value = p.nombre;
            document.getElementById('prod-codigo').value = p.codigo || '';
            document.getElementById('prod-categoria').value = p.categoria || 'otros';
            document.getElementById('prod-unidad').value = p.unidad_medida || '';
            document.getElementById('prod-minimo').value = p.stock_minimo || 0;
            document.getElementById('prod-costo').value = p.precio_costo || 0;
            document.getElementById('prod-venta').value = p.precio_venta || 0;
        }
    }
    document.getElementById('modal-producto').style.display = 'flex';
};

async function handleSaveProduct(e) {
    e.preventDefault();
    if (!e.target.checkValidity()) {
        e.target.reportValidity();
        return;
    }

    try {
        showLoading();
        const tenantId = await getTenantId();
        const id = document.getElementById('prod-id').value;

        const productData = {
            tenant_id: tenantId,
            nombre: document.getElementById('prod-nombre').value,
            codigo: document.getElementById('prod-codigo').value,
            categoria: document.getElementById('prod-categoria').value,
            unidad_medida: document.getElementById('prod-unidad').value,
            stock_minimo: parseFloat(document.getElementById('prod-minimo').value) || 0,
            precio_costo: parseFloat(document.getElementById('prod-costo').value) || 0,
            precio_venta: parseFloat(document.getElementById('prod-venta').value) || 0
        };

        if (id) {
            const { error } = await supabase.from('products').update(productData).eq('id', id);
            if (error) throw error;
            showToast("Producto actualizado", "success");
        } else {
            const { error } = await supabase.from('products').insert({ ...productData, stock_actual: 0 });
            if (error) throw error;
            showToast("Producto agregado", "success");
        }

        window.closeModal('modal-producto');
        loadProducts();
    } catch (err) {
        console.error(err);
        showToast("Error al guardar producto: " + err.message, "error");
    } finally {
        hideLoading();
    }
}

window.deleteProduct = async (id) => {
    if (!confirm("¿Seguro que deseás eliminar este producto?")) return;
    
    try {
        showLoading();
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        showToast("Producto eliminado", "success");
        loadProducts();
    } catch (err) {
        console.error(err);
        showToast("Error al eliminar producto", "error");
    } finally {
        hideLoading();
    }
};

// MOVEMENTS
let activeProductIdForMov = null;

window.openMovementsModal = async (id) => {
    activeProductIdForMov = id;
    const p = allProducts.find(item => item.id === id);
    document.getElementById('mov-prod-nombre').innerText = p.nombre;
    document.getElementById('form-ajuste').reset();
    document.getElementById('modal-movimientos').style.display = 'flex';
    loadMovements(id);
};

async function loadMovements(productId) {
    const list = document.getElementById('movimientos-list');
    list.innerHTML = '<p style="padding: 20px; font-size: 0.8rem; color: #94a3b8;">Cargando...</p>';

    const tenantId = await getTenantId();
    const { data, error } = await supabase
        .from('stock_movimientos')
        .select('*')
        .eq('product_id', productId)
        .eq('tenant_id', tenantId)
        .order('fecha', { ascending: false });

    if (error) {
        list.innerHTML = '<p>Error.</p>';
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color: #94a3b8; padding: 40px; font-size: 0.8rem;">Sin movimientos.</p>';
        return;
    }

    list.innerHTML = data.map(m => `
        <div class="mov-item">
            <div class="mov-header">
                <span style="font-weight: 800; color: ${m.tipo === 'entrada' ? '#22c55e' : '#ef4444'}; text-transform: uppercase; font-size: 0.65rem;">${m.tipo}</span>
                <span style="font-size: 0.65rem; color: #94a3b8;">${new Date(m.fecha).toLocaleDateString()}</span>
            </div>
            <div style="font-weight: 800; font-size: 0.9rem;">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</div>
            <div style="font-size: 0.75rem; color: #64748b; font-style: italic;">${m.observacion || ''}</div>
        </div>
    `).join('');
}

async function handleSaveAdjustment(e) {
    e.preventDefault();
    if (!e.target.checkValidity()) {
        e.target.reportValidity();
        return;
    }
    if (!activeProductIdForMov) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        showLoading();
        const tenantId = await getTenantId();
        const tipo = document.getElementById('ajuste-tipo').value;
        let cantidad = parseFloat(document.getElementById('ajuste-cantidad').value);
        const obs = document.getElementById('ajuste-obs').value;

        const movData = {
            tenant_id: tenantId,
            product_id: activeProductIdForMov,
            tipo: tipo,
            cantidad: cantidad,
            observacion: obs
        };

        const { error: movErr } = await supabase.from('stock_movimientos').insert(movData);
        if (movErr) throw movErr;

        const p = allProducts.find(item => item.id === activeProductIdForMov);
        const nuevoStock = (p.stock_actual || 0) + cantidad;
        const { error: prodErr } = await supabase.from('products').update({ stock_actual: nuevoStock }).eq('id', activeProductIdForMov);
        if (prodErr) throw prodErr;

        showToast("Ajuste de stock registrado", "success");
        loadMovements(activeProductIdForMov);
        loadProducts();
        e.target.reset();
    } catch (err) {
        console.error(err);
        showToast("Error al aplicar movimiento: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Aplicar';
        hideLoading();
    }
}

window.openEditModal = (id) => window.openProductModal(id);
window.addEventListener('layoutReady', () => init());
