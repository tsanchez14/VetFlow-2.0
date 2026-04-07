import { supabase, getTenantEstado } from './supabase.js';
import { showToast, showLoading, hideLoading } from './ui.js';

/**
 * Dashboard Logic - VetFlow 2.0
 */

async function initDashboard() {
    console.log("Dashboard initializing...");

    const tenant = await getTenantEstado();
    if (!tenant) {
        console.error("Tenant not found for current user");
        return;
    }

    // Re-check elements AFTER tenant fetch to ensure layout wrap has likely completed
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) {
        console.warn("Dashboard containers not found. Layout might be still wrapping. Retrying...");
        setTimeout(initDashboard, 100);
        return;
    }

    const elements = {
        statsGrid: document.getElementById('stats-grid'),
        alertsSection: document.getElementById('alerts-section'),
        mainGrid: document.getElementById('main-grid'),
        quickActions: document.getElementById('quick-actions')
    };

    if (tenant.tipo === 'veterinaria') {
        renderVetDashboard(tenant, elements);
    } else {
        renderTiendaDashboard(tenant, elements);
    }
}

/**
 * VETERINARIA DASHBOARD
 */
async function renderVetDashboard(tenant, elements) {
    const { statsGrid, alertsSection, mainGrid, quickActions } = elements;
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch Data in Parallel
    try {
        showLoading();
        const [appointments, lastSales, productsResponse] = await Promise.all([
            supabase.from('appointments').select('*, pets(nombre)').eq('tenant_id', tenant.id).gte('fecha_hora', today).order('fecha_hora', { ascending: true }),
            supabase.from('sales').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('products').select('*').eq('tenant_id', tenant.id)
        ]);

        if (appointments.error) throw appointments.error;
        if (lastSales.error) throw lastSales.error;

    const lowStockItems = productsResponse.data ? productsResponse.data.filter(p => p.stock_actual < p.stock_minimo) : [];

    // 2. Render Stats
    const pendingAppts = appointments.data ? appointments.data.filter(a => a.estado === 'pendiente').length : 0;
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon bg-blue"><i class="fas fa-calendar-check"></i></div>
            <div class="stat-info">
                <h4>Turnos Pendientes</h4>
                <div class="stat-value">${pendingAppts}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon bg-orange"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-info">
                <h4>Stock Bajo</h4>
                <div class="stat-value">${lowStockItems.length}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon bg-green"><i class="fas fa-dollar-sign"></i></div>
            <div class="stat-info">
                <h4>Ventas Hoy</h4>
                <div class="stat-value">$${calculateTodayTotal(lastSales.data)}</div>
            </div>
        </div>
    `;

    // 3. Render Alerts
    renderAlerts(lowStockItems, alertsSection);

    // 4. Render Main Activity
    mainGrid.innerHTML = `
        <div class="activity-card">
            <h3><i class="fas fa-clock"></i> Próximos Turnos</h3>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr><th>Hora</th><th>Mascota</th><th>Motivo</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                        ${appointments.data && appointments.data.length > 0
            ? appointments.data.slice(0, 5).map(a => `
                                <tr>
                                    <td>${new Date(a.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td>${a.pets?.nombre || 'N/A'}</td>
                                    <td>${a.motivo || '-'}</td>
                                    <td><span class="badge-vet">${a.estado}</span></td>
                                </tr>
                            `).join('')
            : '<tr><td colspan="4">No hay turnos pendientes para hoy.</td></tr>'
        }
                    </tbody>
                </table>
            </div>
        </div>
        <div class="activity-card">
            <h3><i class="fas fa-shopping-bag"></i> Últimas Ventas</h3>
            <div class="table-responsive">
                <table>
                    <tbody>
                        ${lastSales.data && lastSales.data.length > 0
            ? lastSales.data.map(s => `
                                <tr>
                                    <td>${new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td><strong>$${s.total}</strong></td>
                                </tr>
                            `).join('')
            : '<tr><td>Sin ventas registradas hoy.</td></tr>'
        }
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 5. Quick Actions
    quickActions.innerHTML = `
        <a href="appointments.html" class="action-btn"><i class="fas fa-calendar-plus"></i> Nuevo Turno</a>
        <a href="sales.html" class="action-btn"><i class="fas fa-cash-register"></i> Nueva Venta</a>
        <a href="clients.html" class="action-btn"><i class="fas fa-user-plus"></i> Nuevo Cliente</a>
        <a href="products.html" class="action-btn"><i class="fas fa-plus-circle"></i> Cargar Stock</a>
    `;

    } catch (err) {
        console.error("Dashboard error:", err);
        showToast("Error al cargar datos del tablero", "error");
    } finally {
        hideLoading();
    }
}

/**
 * TIENDA DASHBOARD
 */
async function renderTiendaDashboard(tenant, elements) {
    const { statsGrid, alertsSection, mainGrid, quickActions } = elements;
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // 1. Fetch Data
    try {
        showLoading();
        const [monthSales, lastSales, productsResponse] = await Promise.all([
            supabase.from('sales').select('total').eq('tenant_id', tenant.id).gte('created_at', startOfMonth),
            supabase.from('sales').select('*').eq('tenant_id', tenant.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('products').select('*').eq('tenant_id', tenant.id)
        ]);

        if (monthSales.error) throw monthSales.error;

    const lowStockItems = productsResponse.data ? productsResponse.data.filter(p => p.stock_actual < p.stock_minimo) : [];
    const monthTotal = monthSales.data ? monthSales.data.reduce((acc, s) => acc + Number(s.total), 0) : 0;

    // 2. Render Stats
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-icon bg-green"><i class="fas fa-chart-line"></i></div>
            <div class="stat-info">
                <h4>Ingresos del Mes</h4>
                <div class="stat-value">$${monthTotal.toLocaleString()}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon bg-orange"><i class="fas fa-box-open"></i></div>
            <div class="stat-info">
                <h4>Stock Bajo</h4>
                <div class="stat-value">${lowStockItems.length}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon bg-blue"><i class="fas fa-shopping-basket"></i></div>
            <div class="stat-info">
                <h4>Ventas Hoy</h4>
                <div class="stat-value">${lastSales.data ? lastSales.data.filter(s => s.created_at.startsWith(today)).length : 0}</div>
            </div>
        </div>
    `;

    // 3. Alerts
    renderAlerts(lowStockItems, alertsSection);

    // 4. Main Activity
    mainGrid.innerHTML = `
        <div class="activity-card" style="grid-column: span 2;">
            <h3><i class="fas fa-history"></i> Últimas Ventas</h3>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr><th>Hora</th><th>Fecha</th><th>Total</th><th>Medio de Pago</th></tr>
                    </thead>
                    <tbody>
                        ${lastSales.data && lastSales.data.length > 0
            ? lastSales.data.map(s => `
                                <tr>
                                    <td>${new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td>${new Date(s.created_at).toLocaleDateString()}</td>
                                    <td><strong>$${s.total}</strong></td>
                                    <td><span class="badge-vet">${s.medio_pago || 'efectivo'}</span></td>
                                </tr>
                            `).join('')
            : '<tr><td colspan="4">Sin ventas registradas aún.</td></tr>'
        }
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // 5. Quick Actions
    quickActions.innerHTML = `
        <a href="sales.html" class="action-btn"><i class="fas fa-cash-register"></i> Nueva Venta</a>
        <a href="products.html" class="action-btn"><i class="fas fa-boxes"></i> Inventario</a>
        <a href="suppliers.html" class="action-btn"><i class="fas fa-truck"></i> Proveedores</a>
        <a href="reportes.html" class="action-btn"><i class="fas fa-chart-pie"></i> Ver Reportes</a>
    `;

    } catch (err) {
        console.error("Dashboard error:", err);
        showToast("Error al cargar datos del tablero", "error");
    } finally {
        hideLoading();
    }
}

function renderAlerts(lowStockItems, alertsSection) {
    if (lowStockItems.length === 0) {
        alertsSection.innerHTML = '';
        return;
    }

    alertsSection.innerHTML = `
        <div class="alert-card">
            <div class="alert-content">
                <i class="fas fa-exclamation-circle fa-lg"></i>
                <div>
                    <strong>Alerta de Inventario:</strong> Tenés ${lowStockItems.length} productos con stock insuficiente.
                </div>
            </div>
            <a href="products.html" class="btn btn-outline btn-sm">Gestionar Stock</a>
        </div>
    `;
}

function calculateTodayTotal(sales) {
    if (!sales) return 0;
    const today = new Date().toISOString().split('T')[0];
    return sales
        .filter(s => s.created_at.startsWith(today))
        .reduce((acc, s) => acc + Number(s.total), 0);
}

window.addEventListener('layoutReady', () => {
    initDashboard();
});
