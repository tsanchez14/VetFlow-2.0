import { supabase, getTenantId } from './supabase.js';
import { showToast, showLoading, hideLoading } from './ui.js';

/**
 * Stock & Inventory Management - VetFlow 2.0
 */

let allProducts = [];
let currentFilter = { query: '', category: '' };

async function init() {
    console.log("Stock module initializing...");

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
        console.error("Error loading products:", err);
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
        const matchesQuery = p.nombre.toLowerCase().includes(currentFilter.query);
        const matchesCat = currentFilter.category === '' || p.categoria === currentFilter.category;
        return matchesQuery && matchesCat;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: #94a3b8;">No se encontraron productos.</td></tr>';
        return;
    }

    tableBody.innerHTML = filtered.map(p => {
        const isLow = p.stock_actual <= p.stock_minimo;
        return `
            <tr class="${isLow ? 'low-stock' : ''}">
                <td>
                    <div style="font-weight: 700; color: #1e293b;">${p.nombre}</div>
                    <small style="color: #94a3b8;">Ref: ${p.id.substring(0, 8)}</small>
                </td>
                <td><span class="tag-category">${p.categoria || 'Sin cat.'}</span></td>
                <td>
                    <span class="stock-badge ${isLow ? 'alert' : 'ok'}">
                        ${p.stock_actual} ${p.unidad_medida || 'unid.'}
                    </span>
                </td>
                <td style="color: #64748b; font-weight: 600;">${p.stock_minimo}</td>
                <td style="font-weight: 800; color: #0f172a;">$${p.precio_venta.toLocaleString()}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-circular" onclick="window.openEditModal('${p.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-circular" onclick="window.openMovementsModal('${p.id}')" title="Movimientos"><i class="fas fa-history"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

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
            document.getElementById('prod-categoria').value = p.categoria || 'otros';
            document.getElementById('prod-unidad').value = p.unidad_medida || '';
            document.getElementById('prod-minimo').value = p.stock_minimo || 0;
            document.getElementById('prod-costo').value = p.precio_costo || 0;
            document.getElementById('prod-venta').value = p.precio_venta || 0;
        }
    }
    document.getElementById('modal-producto').classList.add('active');
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
            categoria: document.getElementById('prod-categoria').value,
            unidad_medida: document.getElementById('prod-unidad').value,
            stock_minimo: parseFloat(document.getElementById('prod-minimo').value) || 0,
            precio_costo: parseFloat(document.getElementById('prod-costo').value) || 0,
            precio_venta: parseFloat(document.getElementById('prod-venta').value) || 0
        };

        if (id) {
            const { error: resErr } = await supabase.from('products').update(productData).eq('id', id);
            if (resErr) throw resErr;
            showToast("Producto actualizado exitosamente", "success");
        } else {
            const { error: resErr } = await supabase.from('products').insert({ ...productData, stock_actual: 0 });
            if (resErr) throw resErr;
            showToast("Producto creado exitosamente", "success");
        }

        window.closeModal('modal-producto');
        loadProducts();
    } catch (err) {
        console.error(err);
        showToast("Error salvando producto: " + err.message, "error");
    } finally {
        hideLoading();
    }
}

// MOVEMENTS & ADJUSTMENTS
let activeProductIdForMov = null;

window.openMovementsModal = async (id) => {
    activeProductIdForMov = id;
    const p = allProducts.find(item => item.id === id);
    document.getElementById('mov-prod-nombre').innerText = p.nombre;
    document.getElementById('form-ajuste').reset();
    document.getElementById('modal-movimientos').classList.add('active');
    loadMovements(id);
};

async function loadMovements(productId) {
    const list = document.getElementById('movimientos-list');
    list.innerHTML = '<p style="text-align:center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>';

    const tenantId = await getTenantId();
    const { data, error } = await supabase
        .from('stock_movimientos')
        .select('*')
        .eq('product_id', productId)
        .eq('tenant_id', tenantId)
        .order('fecha', { ascending: false });

    if (error) {
        list.innerHTML = '<p>Error cargando movimientos.</p>';
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color: #94a3b8; padding: 40px;">Sin movimientos registrados.</p>';
        return;
    }

    list.innerHTML = data.map(m => `
        <div class="mov-item ${m.tipo}">
            <div class="mov-header">
                <span class="mov-type">${m.tipo}</span>
                <span class="mov-date">${new Date(m.fecha).toLocaleString()}</span>
            </div>
            <div class="mov-qty">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</div>
            <div class="mov-obs">${m.observacion || 'Sin obs.'}</div>
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

        // En ajustes de entrada la cantidad es positiva siempre. 
        // Si el usuario quiere restar debería ser un ajuste negativo? 
        // Por simplicidad: entrada = suma, ajuste = el valor que ponga el usuario (puede ser negativo para restar).

        const movData = {
            tenant_id: tenantId,
            product_id: activeProductIdForMov,
            tipo: tipo,
            cantidad: cantidad,
            observacion: obs
        };

        // 1. Insertar Movimiento
        const { error: movErr } = await supabase.from('stock_movimientos').insert(movData);

        if (movErr) {
            throw movErr;
        }

        // 2. Actualizar stock en producto
        const p = allProducts.find(item => item.id === activeProductIdForMov);
        const nuevoStock = (p.stock_actual || 0) + cantidad;

        const { error: updErr } = await supabase.from('products').update({ stock_actual: nuevoStock }).eq('id', activeProductIdForMov);
        if (updErr) throw updErr;

        showToast("Ajuste registrado", "success");
        loadMovements(activeProductIdForMov);
        loadProducts(); // Recargar lista principal
        e.target.reset();
    } catch (err) {
        console.error(err);
        showToast("Error al registrar movimiento: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Registrar';
        hideLoading();
    }
}

// Helpers globales para botones dinámicos
window.openEditModal = (id) => window.openProductModal(id);

window.addEventListener('layoutReady', () => init());
