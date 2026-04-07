import { supabase, getTenantId } from './supabase.js';

/**
 * Sales & Invoicing - VetFlow 2.0
 */

let cart = [];
let clients = [];
let products = [];
let tenantInfo = null;

async function init() {
    console.log("Sales module initializing...");

    const cartTable = document.getElementById('cart-items');
    if (!cartTable) {
        setTimeout(init, 100);
        return;
    }

    // 1. Datos iniciales
    const tenantId = await getTenantId();
    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
    tenantInfo = tenant;

    // Ocultar selector de cliente si no es veterinaria
    if (tenant.tipo !== 'veterinaria') {
        document.getElementById('client-container').style.display = 'none';
    } else {
        loadClients();
    }

    loadProducts();

    // 2. Listeners
    document.getElementById('pos-search-input').oninput = handleProductSearch;
    document.getElementById('hist-date-from').onchange = loadHistory;
    document.getElementById('hist-date-to').onchange = loadHistory;
    document.getElementById('hist-status').onchange = loadHistory;

    // Fechas por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('hist-date-from').value = today;
    document.getElementById('hist-date-to').value = today;

    loadHistory();
}

// === POS LOGIC ===

async function loadClients() {
    const tenantId = await getTenantId();
    const { data } = await supabase.from('clients').select('id, nombre, apellido').eq('tenant_id', tenantId);
    if (data) {
        const select = document.getElementById('sale-client');
        data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.nombre} ${c.apellido}`;
            select.appendChild(opt);
        });
    }
}

async function loadProducts() {
    const tenantId = await getTenantId();
    const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
    products = data || [];
}

function handleProductSearch(e) {
    const query = e.target.value.toLowerCase();
    const resultsDiv = document.getElementById('pos-search-results');

    if (query.length < 2) {
        resultsDiv.innerHTML = '';
        return;
    }

    const filtered = products.filter(p =>
        p.nombre.toLowerCase().includes(query) || (p.codigo && p.codigo.toLowerCase().includes(query))
    );

    resultsDiv.innerHTML = filtered.map(p => `
        <div class="search-item" onclick="window.addToCart('${p.id}')">
            <div>
                <div class="name">${p.nombre}</div>
                <div class="stock">Stock: ${p.stock_actual} | Código: ${p.codigo || '-'}</div>
            </div>
            <div class="price">$${p.precio_venta}</div>
        </div>
    `).join('');
}

window.addToCart = (productId) => {
    const p = products.find(item => item.id === productId);
    if (!p) return;

    // Evitar duplicados? Mejor sumar cantidad
    const existing = cart.find(c => c.productId === productId);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({
            productId: p.id,
            name: p.nombre,
            price: p.precio_venta,
            qty: 1,
            isService: false
        });
    }
    document.getElementById('pos-search-input').value = '';
    document.getElementById('pos-search-results').innerHTML = '';
    renderCart();
};

window.addManualItem = () => {
    const desc = document.getElementById('manual-desc').value;
    const price = parseFloat(document.getElementById('manual-price').value);

    if (!desc || isNaN(price)) return;

    cart.push({
        productId: null,
        name: desc,
        price: price,
        qty: 1,
        isService: true
    });

    document.getElementById('manual-desc').value = '';
    document.getElementById('manual-price').value = '';
    renderCart();
};

function renderCart() {
    const container = document.getElementById('cart-items');
    const emptyMsg = document.getElementById('empty-cart-msg');

    if (cart.length === 0) {
        container.innerHTML = '';
        emptyMsg.style.display = 'block';
        updateTotal();
        return;
    }

    emptyMsg.style.display = 'none';
    container.innerHTML = cart.map((item, index) => `
        <tr>
            <td style="font-weight: 700;">${item.name}</td>
            <td>
                <input type="number" class="cart-qty-input" value="${item.qty}" onchange="window.updateCartQty(${index}, this.value)">
            </td>
            <td>
                <input type="number" class="cart-price-input" value="${item.price}" onchange="window.updateCartPrice(${index}, this.value)">
            </td>
            <td style="font-weight: 800;">$${(item.qty * item.price).toLocaleString()}</td>
            <td>
                <button class="btn-remove-item" onclick="window.removeFromCart(${index})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    updateTotal();
}

window.updateCartQty = (index, val) => {
    cart[index].qty = parseFloat(val) || 0;
    renderCart();
};

window.updateCartPrice = (index, val) => {
    cart[index].price = parseFloat(val) || 0;
    renderCart();
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    renderCart();
};

function updateTotal() {
    const total = cart.reduce((acc, item) => acc + (item.qty * item.price), 0);
    document.getElementById('total-display').innerText = `$${total.toLocaleString()}`;
}

window.confirmSale = async () => {
    if (cart.length === 0) return;

    const btn = document.getElementById('btn-confirm-sale');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';

    try {
        const tenantId = await getTenantId();
        const clientId = document.getElementById('sale-client')?.value || null;
        const total = cart.reduce((acc, item) => acc + (item.qty * item.price), 0);
        const medioPago = document.getElementById('sale-payment-method').value;

        // 1. Crear Venta
        const { data: sale, error: saleErr } = await supabase
            .from('sales')
            .insert({
                tenant_id: tenantId,
                client_id: clientId,
                total: total,
                medio_pago: medioPago,
                estado: 'pagado'
            })
            .select()
            .single();

        if (saleErr) throw saleErr;

        // 2. Crear Líneas y Descontar Stock
        for (const item of cart) {
            // Linea de venta
            await supabase.from('sale_items').insert({
                tenant_id: tenantId,
                sale_id: sale.id,
                product_id: item.productId,
                descripcion: item.name,
                cantidad: item.qty,
                precio_unitario: item.price,
                subtotal: item.qty * item.price
            });

            // Si es producto, bajar stock y registrar movimiento
            if (item.productId) {
                const p = products.find(prod => prod.id === item.productId);
                const nuevoStock = (p.stock_actual || 0) - item.qty;

                await supabase.from('products').update({ stock_actual: nuevoStock }).eq('id', item.productId);

                await supabase.from('stock_movimientos').insert({
                    tenant_id: tenantId,
                    product_id: item.productId,
                    tipo: 'venta',
                    cantidad: -item.qty,
                    observacion: `Venta #${sale.id.substring(0, 8)}`
                });
            }
        }

        alert("Venta confirmada exitosamente!");
        cart = [];
        renderCart();
        loadProducts(); // Refrescar stock local
        loadHistory();
    } catch (err) {
        console.error(err);
        alert("Error al procesar venta: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle"></i> CONFIRMAR VENTA';
    }
};

// === HISTORY & CLOSURE ===

async function loadHistory() {
    const tenantId = await getTenantId();
    const from = document.getElementById('hist-date-from').value;
    const to = document.getElementById('hist-date-to').value + 'T23:59:59';
    const status = document.getElementById('hist-status').value;

    let query = supabase
        .from('sales')
        .select('*, clients(nombre, apellido)')
        .eq('tenant_id', tenantId)
        .gte('fecha', from)
        .lte('fecha', to)
        .order('fecha', { ascending: false });

    if (status) query = query.eq('estado', status);

    const { data } = await query;
    const list = document.getElementById('history-list');

    if (!data || data.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay ventas en este período.</td></tr>';
        return;
    }

    list.innerHTML = data.map(s => `
        <tr onclick="window.viewSaleDetail('${s.id}')">
            <td>
                <span class="history-date">${new Date(s.fecha).toLocaleDateString()}</span><br>
                <small style="color: #cbd5e1;">${new Date(s.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</small>
            </td>
            <td>
                <span class="history-client">${s.clients ? s.clients.nombre + ' ' + s.clients.apellido : 'Consumidor Final'}</span>
                <small style="color: #94a3b8;">${s.id.substring(0, 8).toUpperCase()}</small>
            </td>
            <td><span class="history-total">$${s.total.toLocaleString()}</span></td>
            <td><span class="badge-method">${s.medio_pago}</span></td>
            <td><span class="badge-status ${s.estado}">${s.estado}</span></td>
            <td style="text-align: right;"><button class="btn btn-outline btn-sm"><i class="fas fa-eye"></i></button></td>
        </tr>
    `).join('');
}

window.viewSaleDetail = async (id) => {
    const tenantId = await getTenantId();
    const { data: sale } = await supabase.from('sales').select('*, sale_items(*)').eq('id', id).eq('tenant_id', tenantId).single();
    if (!sale) return;

    const modal = document.getElementById('modal-sale-detail');
    const content = document.getElementById('sale-detail-content');
    const footer = document.getElementById('modal-sale-footer');

    content.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p><strong>Fecha:</strong> ${new Date(sale.fecha).toLocaleString()}</p>
            <p><strong>Medio de Pago:</strong> ${sale.medio_pago.toUpperCase()}</p>
            <p><strong>Estado:</strong> ${sale.estado.toUpperCase()}</p>
        </div>
        <table class="cart-table">
            <thead>
                <tr><th>Item</th><th>Cant.</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
                ${sale.sale_items.map(item => `
                    <tr>
                        <td>${item.descripcion}</td>
                        <td>${item.cantidad}</td>
                        <td>$${item.subtotal.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <h3 style="text-align: right; margin-top: 20px;">TOTAL: $${sale.total.toLocaleString()}</h3>
    `;

    footer.innerHTML = sale.estado === 'pagado' ? `
        <button class="btn btn-outline" style="color: #ef4444; border-color: #ef4444; width: 100%; margin-top: 20px;" onclick="window.annulSale('${sale.id}')">
            <i class="fas fa-ban"></i> ANULAR VENTA Y RESTAURAR STOCK
        </button>
    ` : '';

    modal.style.display = 'flex';
};

window.annulSale = async (id) => {
    if (!confirm("¿Seguro que deseás anular esta venta? El stock se restaurará.")) return;

    const tenantId = await getTenantId();
    const { data: sale } = await supabase.from('sales').select('*, sale_items(*)').eq('id', id).eq('tenant_id', tenantId).single();
    if (!sale) { console.error('Sale not found or unauthorized'); return; }

    // 1. Anular Venta
    await supabase.from('sales').update({ estado: 'anulado' }).eq('id', id).eq('tenant_id', tenantId);

    // 2. Restaurar Stock
    for (const item of sale.sale_items) {
        if (item.product_id) {
            const { data: p } = await supabase.from('products').select('stock_actual').eq('id', item.product_id).single();
            const nuevoStock = (p.stock_actual || 0) + item.cantidad;
            await supabase.from('products').update({ stock_actual: nuevoStock }).eq('id', item.product_id);

            // Registrar movimiento de restauración
            const tenantId = await getTenantId();
            await supabase.from('stock_movimientos').insert({
                tenant_id: tenantId,
                product_id: item.product_id,
                tipo: 'ajuste',
                cantidad: item.cantidad,
                observacion: `Anulación Venta #${id.substring(0, 8)}`
            });
        }
    }

    alert("Venta anulada y stock restaurado.");
    window.closeModal('modal-sale-detail');
    loadHistory();
    loadProducts();
};

window.loadClosure = async () => {
    const tenantId = await getTenantId();
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
        .from('sales')
        .select('total, medio_pago')
        .eq('tenant_id', tenantId)
        .eq('estado', 'pagado')
        .gte('fecha', today);

    const summary = {
        efectivo: 0,
        tarjeta: 0,
        transferencia: 0
    };

    let grandTotal = 0;
    if (data) {
        data.forEach(s => {
            if (summary[s.medio_pago] !== undefined) {
                summary[s.medio_pago] += s.total;
            }
            grandTotal += s.total;
        });
    }

    document.getElementById('closure-date').innerText = new Date().toLocaleDateString();
    document.getElementById('closure-grand-total').innerText = `$${grandTotal.toLocaleString()}`;

    document.getElementById('closure-results').innerHTML = Object.keys(summary).map(method => `
        <div class="closure-card">
            <span class="method">${method}</span>
            <span class="amount">$${summary[method].toLocaleString()}</span>
        </div>
    `).join('');
};

window.addEventListener('layoutReady', () => {
    init();
    // Iniciar con Cierre cargado por las dudas
    window.loadClosure();
});
