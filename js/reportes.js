/**
 * VetFlow 2.0 - Módulo de Reportes
 * Carga lazy por reporte, Chart.js para gráficos, filtro por rango de fechas.
 */
import { supabase, getTenantTipo } from './supabase.js';

// ── Estado global del módulo ────────────────────
let activeChart = null;  // instancia Chart.js activa
let currentReport = null;
let tenantTipo = null;

// Fechas por defecto: últimos 30 días
function getDefaultDates() {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10)
    };
}

// ── Definición de reportes ──────────────────────
const REPORTS = [
    {
        id: 'ventas-periodo',
        label: 'Ventas del período',
        icon: 'fas fa-chart-line',
        tipos: ['veterinaria', 'tienda'],
        render: renderVentasPeriodo
    },
    {
        id: 'productos-top',
        label: 'Productos más vendidos',
        icon: 'fas fa-trophy',
        tipos: ['veterinaria', 'tienda'],
        render: renderProductosTop
    },
    {
        id: 'ingresos-costos',
        label: 'Ingresos vs Costos',
        icon: 'fas fa-balance-scale',
        tipos: ['veterinaria', 'tienda'],
        render: renderIngresosCostos
    },
    {
        id: 'stock-bajo',
        label: 'Stock bajo',
        icon: 'fas fa-exclamation-triangle',
        tipos: ['veterinaria', 'tienda'],
        render: renderStockBajo
    },
    {
        id: 'clientes-nuevos',
        label: 'Clientes nuevos',
        icon: 'fas fa-user-plus',
        tipos: ['veterinaria'],
        onlyVet: true,
        render: renderClientesNuevos
    },
    {
        id: 'mascotas-atendidas',
        label: 'Mascotas atendidas',
        icon: 'fas fa-paw',
        tipos: ['veterinaria'],
        onlyVet: true,
        render: renderMascotasAtendidas
    },
    {
        id: 'vacunas-proximas',
        label: 'Vacunas próximas',
        icon: 'fas fa-syringe',
        tipos: ['veterinaria'],
        onlyVet: true,
        render: renderVacunasProximas
    },
];

// ── Helpers de fecha ────────────────────────────
function getDateRange() {
    const from = document.getElementById('date-from').value;
    const to = document.getElementById('date-to').value;
    return { from, to };
}

function formatDate(iso) {
    if (!iso) return '-';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
}

function formatCurrency(n) {
    return '$ ' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

// ── Chart helpers ───────────────────────────────
function destroyChart() {
    if (activeChart) {
        activeChart.destroy();
        activeChart = null;
    }
}

const CHART_COLORS = {
    primary: '#006090',
    secondary: '#00a884',
    danger: '#ef4444',
    warning: '#f59e0b',
    muted: '#94a3b8',
    gradBlue: ['rgba(0,96,144,0.18)', 'rgba(0,96,144,0)'],
    gradGreen: ['rgba(0,168,132,0.18)', 'rgba(0,168,132,0)'],
};

function makeGradient(ctx, colors) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    return gradient;
}

// ── UI Helpers ──────────────────────────────────
function showLoading() {
    document.getElementById('report-content').innerHTML = `
        <div class="report-loading">
            <i class="fas fa-circle-notch"></i> Cargando reporte...
        </div>`;
}

function showEmpty(msg = 'Sin datos para el período seleccionado.') {
    document.getElementById('report-content').innerHTML = `
        <div class="report-empty">
            <i class="fas fa-inbox"></i>
            <p>${msg}</p>
        </div>`;
}

function showError() {
    document.getElementById('report-content').innerHTML = `
        <div class="report-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error al cargar el reporte. Verificá tu conexión.</p>
        </div>`;
}

function setReportContent(html) {
    const el = document.getElementById('report-content');
    el.innerHTML = html;
    el.style.display = 'block';
}

function reportHeader(icon, title, subtitle, onlyVet = false) {
    const vetBadge = onlyVet
        ? `<span class="vet-badge-inline"><i class="fas fa-stethoscope"></i> Solo Veterinaria</span>`
        : '';
    return `
        <div class="report-header">
            <div class="report-header-icon"><i class="${icon}"></i></div>
            <div>
                <h2>${title}${vetBadge}</h2>
                <p>${subtitle}</p>
            </div>
        </div>`;
}

function statRow(stats) {
    const items = stats.map(s => `
        <div class="report-stat ${s.cls || ''}">
            <span class="r-label">${s.label}</span>
            <span class="r-value">${s.value}</span>
        </div>`).join('');
    return `<div class="report-stats-row">${items}</div>`;
}

// ══════════════════════════════════════════════════════
// ── REPORTE 1: Ventas del período ─────────────────────
// ══════════════════════════════════════════════════════
async function renderVentasPeriodo(from, to) {
    showLoading();
    try {
        const { data, error } = await supabase
            .from('ventas')
            .select('fecha, total')
            .gte('fecha', from)
            .lte('fecha', to)
            .order('fecha', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) { showEmpty(); return; }

        // Agrupar por día
        const byDay = {};
        data.forEach(v => {
            const day = v.fecha.slice(0, 10);
            byDay[day] = (byDay[day] || 0) + parseFloat(v.total || 0);
        });

        const labels = Object.keys(byDay);
        const values = Object.values(byDay);
        const totalGeneral = values.reduce((a, b) => a + b, 0);
        const promDia = totalGeneral / labels.length;
        const maxDia = Math.max(...values);

        setReportContent(`
            ${reportHeader('fas fa-chart-line', 'Ventas del período', `${formatDate(from)} — ${formatDate(to)}`)}
            ${statRow([
            { label: 'Total facturado', value: formatCurrency(totalGeneral), cls: 'highlight' },
            { label: 'Promedio / día', value: formatCurrency(promDia) },
            { label: 'Mejor día', value: formatCurrency(maxDia), cls: 'green' },
            { label: 'Días con ventas', value: labels.length },
        ])}
            <div class="chart-wrap"><canvas id="chart-canvas"></canvas></div>
        `);

        destroyChart();
        const ctx = document.getElementById('chart-canvas').getContext('2d');
        activeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(d => formatDate(d)),
                datasets: [{
                    label: 'Ventas ($)',
                    data: values,
                    borderColor: CHART_COLORS.primary,
                    backgroundColor: makeGradient(ctx, CHART_COLORS.gradBlue),
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: CHART_COLORS.primary,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                }]
            },
            options: chartOptions('$')
        });
    } catch (e) {
        console.error(e);
        showError();
    }
}

// ══════════════════════════════════════════════════════
// ── REPORTE 2: Productos más vendidos (Top 10) ────────
// ══════════════════════════════════════════════════════
async function renderProductosTop(from, to) {
    showLoading();
    try {
        // join ventas → venta_items → productos
        const { data, error } = await supabase
            .from('ventas')
            .select('id, fecha, venta_items(cantidad, producto:products(nombre))')
            .gte('fecha', from)
            .lte('fecha', to);

        if (error) throw error;

        // Acumular por producto
        const acc = {};
        (data || []).forEach(v => {
            (v.venta_items || []).forEach(item => {
                const nombre = item.producto?.nombre || 'Desconocido';
                acc[nombre] = (acc[nombre] || 0) + parseInt(item.cantidad || 0);
            });
        });

        const sorted = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 10);

        if (sorted.length === 0) { showEmpty(); return; }

        const labels = sorted.map(([n]) => n);
        const values = sorted.map(([, q]) => q);

        setReportContent(`
            ${reportHeader('fas fa-trophy', 'Productos más vendidos', `Top 10 · ${formatDate(from)} — ${formatDate(to)}`)}
            ${statRow([
            { label: '#1 Producto', value: labels[0], cls: 'highlight' },
            { label: 'Unidades (top 1)', value: values[0] },
            { label: 'Productos distintos', value: sorted.length },
        ])}
            <div class="chart-wrap"><canvas id="chart-canvas"></canvas></div>
        `);

        destroyChart();
        const ctx = document.getElementById('chart-canvas').getContext('2d');
        activeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Unidades vendidas',
                    data: values,
                    backgroundColor: labels.map((_, i) =>
                        i === 0 ? CHART_COLORS.primary : `rgba(0,96,144,${0.7 - i * 0.05})`
                    ),
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                ...chartOptions(''),
                indexAxis: 'y',
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.raw} unidades` } }
                }
            }
        });
    } catch (e) {
        console.error(e);
        showError();
    }
}

// ══════════════════════════════════════════════════════
// ── REPORTE 3: Ingresos vs Costos ─────────────────────
// ══════════════════════════════════════════════════════
async function renderIngresosCostos(from, to) {
    showLoading();
    try {
        const [ventasRes, costosRes] = await Promise.all([
            supabase.from('ventas').select('fecha, total').gte('fecha', from).lte('fecha', to),
            supabase.from('costos').select('fecha, monto').gte('fecha', from).lte('fecha', to)
        ]);

        if (ventasRes.error) throw ventasRes.error;
        if (costosRes.error) throw costosRes.error;

        // Agrupar por mes (YYYY-MM)
        function groupByMonth(rows, field) {
            const acc = {};
            (rows || []).forEach(r => {
                const key = (r.fecha || '').slice(0, 7);
                acc[key] = (acc[key] || 0) + parseFloat(r[field] || 0);
            });
            return acc;
        }

        const ingByM = groupByMonth(ventasRes.data, 'total');
        const costByM = groupByMonth(costosRes.data, 'monto');

        const allMonths = [...new Set([...Object.keys(ingByM), ...Object.keys(costByM)])].sort();

        if (allMonths.length === 0) { showEmpty(); return; }

        const ingresos = allMonths.map(m => ingByM[m] || 0);
        const costos = allMonths.map(m => costByM[m] || 0);
        const totalIng = ingresos.reduce((a, b) => a + b, 0);
        const totalCost = costos.reduce((a, b) => a + b, 0);
        const ganancia = totalIng - totalCost;

        setReportContent(`
            ${reportHeader('fas fa-balance-scale', 'Ingresos vs Costos', `${formatDate(from)} — ${formatDate(to)}`)}
            ${statRow([
            { label: 'Total ingresos', value: formatCurrency(totalIng), cls: 'green' },
            { label: 'Total costos', value: formatCurrency(totalCost), cls: 'red' },
            { label: 'Resultado neto', value: formatCurrency(ganancia), cls: ganancia >= 0 ? 'highlight' : 'red' },
        ])}
            <div class="comparison-legend">
                <div class="legend-dot"><span style="background:#006090"></span> Ingresos</div>
                <div class="legend-dot"><span style="background:#ef4444"></span> Costos</div>
            </div>
            <div class="chart-wrap"><canvas id="chart-canvas"></canvas></div>
        `);

        destroyChart();
        const ctx = document.getElementById('chart-canvas').getContext('2d');
        activeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allMonths.map(m => {
                    const [y, mon] = m.split('-');
                    return `${mon}/${y}`;
                }),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: ingresos,
                        backgroundColor: 'rgba(0,96,144,0.8)',
                        borderRadius: 8,
                        borderSkipped: false,
                    },
                    {
                        label: 'Costos',
                        data: costos,
                        backgroundColor: 'rgba(239,68,68,0.75)',
                        borderRadius: 8,
                        borderSkipped: false,
                    }
                ]
            },
            options: chartOptions('$')
        });
    } catch (e) {
        console.error(e);
        showError();
    }
}

// ══════════════════════════════════════════════════════
// ── REPORTE 4: Stock bajo ─────────────────────────────
// ══════════════════════════════════════════════════════
async function renderStockBajo() {
    showLoading();
    try {
        // productos donde stock ≤ stock_minimo
        const { data, error } = await supabase
            .from('products')
            .select('nombre, stock, stock_minimo, categoria')
            .lte('stock', supabase.rpc ? undefined : 0)  // workaround: usamos filter posterior
            .order('stock', { ascending: true });

        // Filtrar en cliente: stock <= stock_minimo
        const filtered = (data || []).filter(p => p.stock <= (p.stock_minimo ?? 5));

        if (error) throw error;

        if (!data) { showEmpty(); return; }

        const stockRows = filtered.length > 0 ? filtered.map(p => {
            const cls = p.stock === 0 ? 'critical' : 'warning';
            const label = p.stock === 0 ? 'Sin stock' : 'Stock bajo';
            return `
                <tr>
                    <td><strong>${p.nombre}</strong></td>
                    <td>${p.categoria || '-'}</td>
                    <td><span class="stock-badge ${cls}"><i class="fas fa-circle" style="font-size:0.5rem"></i>${label}</span></td>
                    <td style="font-weight:800;color:${p.stock === 0 ? '#dc2626' : '#d97706'}">${p.stock}</td>
                    <td>${p.stock_minimo ?? 5}</td>
                </tr>`;
        }).join('') : `<tr><td colspan="5" style="text-align:center;padding:30px;color:#cbd5e1">✓ Todo el stock está en niveles correctos</td></tr>`;

        setReportContent(`
            ${reportHeader('fas fa-exclamation-triangle', 'Stock bajo', 'Productos que necesitan reposición inmediata')}
            ${statRow([
            { label: 'Sin stock', value: filtered.filter(p => p.stock === 0).length, cls: 'red' },
            { label: 'Stock bajo', value: filtered.filter(p => p.stock > 0).length, cls: 'highlight' },
            { label: 'Total a reponer', value: filtered.length },
        ])}
            <div class="table-card-premium" style="border-radius:12px">
                <table class="low-stock-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Estado</th>
                            <th>Stock actual</th>
                            <th>Stock mínimo</th>
                        </tr>
                    </thead>
                    <tbody>${stockRows}</tbody>
                </table>
            </div>
        `);
    } catch (e) {
        console.error(e);
        showError();
    }
}

// ══════════════════════════════════════════════════════
// ── REPORTE 5: Clientes nuevos (solo VET) ─────────────
// ══════════════════════════════════════════════════════
async function renderClientesNuevos(from, to) {
    showLoading();
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('id, nombre, apellido, email, created_at')
            .gte('created_at', from)
            .lte('created_at', to + 'T23:59:59')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) { showEmpty('No se registraron clientes en el período.'); return; }

        const items = data.map(c => `
            <div class="simple-list-item">
                <div class="item-icon"><i class="fas fa-user"></i></div>
                <div class="item-info">
                    <div class="item-name">${c.nombre} ${c.apellido || ''}</div>
                    <div class="item-sub">${c.email || 'Sin email'}</div>
                </div>
                <span class="item-date">${formatDate(c.created_at)}</span>
            </div>`).join('');

        setReportContent(`
            ${reportHeader('fas fa-user-plus', 'Clientes nuevos', `${formatDate(from)} — ${formatDate(to)}`, true)}
            ${statRow([
            { label: 'Nuevos clientes', value: data.length, cls: 'highlight' },
            { label: 'Promedio / semana', value: (data.length / Math.max(1, Math.ceil((new Date(to) - new Date(from)) / 604800000))).toFixed(1) },
        ])}
            <div class="simple-list">${items}</div>
        `);
    } catch (e) {
        console.error(e);
        showError();
    }
}

// ══════════════════════════════════════════════════════
// ── REPORTE 6: Mascotas atendidas (solo VET) ──────────
// ══════════════════════════════════════════════════════
async function renderMascotasAtendidas(from, to) {
    showLoading();
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('id, fecha, motivo, mascota:pets(nombre, especie), cliente:clients(nombre, apellido)')
            .gte('fecha', from)
            .lte('fecha', to)
            .eq('estado', 'realizada')
            .order('fecha', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) { showEmpty('No hay consultas realizadas en el período.'); return; }

        // Contar por especie
        const porEspecie = {};
        data.forEach(a => {
            const esp = a.mascota?.especie || 'Desconocida';
            porEspecie[esp] = (porEspecie[esp] || 0) + 1;
        });

        const especieLabels = Object.keys(porEspecie);
        const especieValues = Object.values(porEspecie);

        const items = data.slice(0, 15).map(a => `
            <div class="simple-list-item">
                <div class="item-icon"><i class="fas fa-paw"></i></div>
                <div class="item-info">
                    <div class="item-name">${a.mascota?.nombre || 'Sin nombre'} <small style="color:#94a3b8;font-weight:500">(${a.mascota?.especie || '?'})</small></div>
                    <div class="item-sub">${a.cliente?.nombre || ''} ${a.cliente?.apellido || ''} · ${a.motivo || ''}</div>
                </div>
                <span class="item-date">${formatDate(a.fecha)}</span>
            </div>`).join('');

        setReportContent(`
            ${reportHeader('fas fa-paw', 'Mascotas atendidas', `${formatDate(from)} — ${formatDate(to)}`, true)}
            ${statRow([
            { label: 'Consultas realizadas', value: data.length, cls: 'highlight' },
            ...especieLabels.map(e => ({ label: e, value: porEspecie[e] }))
        ])}
            <div class="chart-wrap" style="height:220px;margin-bottom:24px"><canvas id="chart-canvas"></canvas></div>
            <div class="simple-list">${items}</div>
        `);

        destroyChart();
        const ctx = document.getElementById('chart-canvas').getContext('2d');
        activeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: especieLabels,
                datasets: [{
                    data: especieValues,
                    backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.warning, '#8b5cf6', '#ec4899'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { font: { size: 12, weight: '700' }, padding: 16 }
                    }
                }
            }
        });
    } catch (e) {
        console.error(e);
        showError();
    }
}

// ══════════════════════════════════════════════════════
// ── REPORTE 7: Vacunas próximas a vencer (solo VET) ───
// ══════════════════════════════════════════════════════
async function renderVacunasProximas() {
    showLoading();
    try {
        const today = new Date();
        const in30 = new Date();
        in30.setDate(today.getDate() + 30);

        const todayStr = today.toISOString().slice(0, 10);
        const in30Str = in30.toISOString().slice(0, 10);

        const { data, error } = await supabase
            .from('vaccines')
            .select('id, nombre_vacuna, proxima_dosis, mascota:pets(nombre, especie), cliente:clients(nombre, apellido)')
            .gte('proxima_dosis', todayStr)
            .lte('proxima_dosis', in30Str)
            .order('proxima_dosis', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) { showEmpty('No hay vacunas próximas a vencer en los próximos 30 días. ✓'); return; }

        function urgency(dateStr) {
            const diff = Math.ceil((new Date(dateStr) - today) / 86400000);
            return diff <= 7 ? 'urgent' : 'soon';
        }
        function daysLeft(dateStr) {
            return Math.ceil((new Date(dateStr) - today) / 86400000);
        }

        const urgent = data.filter(v => daysLeft(v.proxima_dosis) <= 7).length;

        const items = data.map(v => {
            const days = daysLeft(v.proxima_dosis);
            const cls = urgency(v.proxima_dosis);
            return `
            <div class="simple-list-item">
                <div class="item-icon" style="background:${cls === 'urgent' ? '#ef4444' : 'var(--grad-primary)'}">
                    <i class="fas fa-syringe"></i>
                </div>
                <div class="item-info">
                    <div class="item-name">${v.nombre_vacuna}</div>
                    <div class="item-sub">
                        ${v.mascota?.nombre || '?'} (${v.mascota?.especie || '?'}) · ${v.cliente?.nombre || ''} ${v.cliente?.apellido || ''}
                    </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                    <span class="vaccine-alert ${cls}">
                        ${days === 0 ? 'Hoy' : `en ${days} día${days !== 1 ? 's' : ''}`}
                    </span>
                    <div class="item-date" style="margin-top:3px">${formatDate(v.proxima_dosis)}</div>
                </div>
            </div>`;
        }).join('');

        setReportContent(`
            ${reportHeader('fas fa-syringe', 'Vacunas próximas a vencer', 'Próximos 30 días', true)}
            ${statRow([
            { label: 'Vencen esta semana', value: urgent, cls: urgent > 0 ? 'red' : '' },
            { label: 'Total próximas', value: data.length, cls: 'highlight' },
        ])}
            <div class="simple-list">${items}</div>
        `);
    } catch (e) {
        console.error(e);
        showError();
    }
}

// ── Chart options base ──────────────────────────
function chartOptions(prefix = '$') {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { font: { size: 12, weight: '700' }, padding: 20 }
            },
            tooltip: {
                callbacks: {
                    label: ctx => prefix
                        ? `${prefix} ${Number(ctx.raw).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
                        : `${ctx.raw}`
                }
            }
        },
        scales: {
            x: {
                grid: { color: '#f1f5f9' },
                ticks: { font: { size: 11 }, color: '#94a3b8' }
            },
            y: {
                grid: { color: '#f1f5f9' },
                ticks: {
                    font: { size: 11 }, color: '#94a3b8',
                    callback: v => prefix ? `${prefix}${Number(v).toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : v
                }
            }
        }
    };
}

// ── Renderizar tabs según tipo de negocio ───────
function renderTabs(tipo) {
    const tabs = document.getElementById('report-tabs');
    tabs.innerHTML = '';

    REPORTS.forEach(r => {
        if (!r.tipos.includes(tipo)) return;

        const btn = document.createElement('button');
        btn.className = 'report-tab-btn';
        btn.dataset.id = r.id;
        btn.innerHTML = `<i class="${r.icon}"></i> ${r.label}${r.onlyVet ? '<span class="badge-only-vet">Vet</span>' : ''}`;
        btn.addEventListener('click', () => activateReport(r));
        tabs.appendChild(btn);
    });
}

// ── Activar un reporte ──────────────────────────
async function activateReport(report) {
    currentReport = report;

    // Marcar tab activo
    document.querySelectorAll('.report-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.id === report.id);
    });

    // Mostrar contenedor
    document.getElementById('report-placeholder').style.display = 'none';
    const contentEl = document.getElementById('report-content');
    contentEl.style.display = 'block';

    destroyChart();

    const { from, to } = getDateRange();
    await report.render(from, to);
}

// ── Inicialización ──────────────────────────────
async function initReportes() {
    // Fechas por defecto
    const { from, to } = getDefaultDates();
    document.getElementById('date-from').value = from;
    document.getElementById('date-to').value = to;

    // Tipo de negocio
    tenantTipo = await getTenantTipo() || 'veterinaria';
    renderTabs(tenantTipo);

    // Botón Aplicar
    document.getElementById('btn-apply-dates').addEventListener('click', () => {
        if (currentReport) activateReport(currentReport);
    });

    // Quick range buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const days = parseInt(btn.dataset.range);
            const toD = new Date();
            const fromD = new Date();
            fromD.setDate(toD.getDate() - days);
            document.getElementById('date-from').value = fromD.toISOString().slice(0, 10);
            document.getElementById('date-to').value = toD.toISOString().slice(0, 10);

            if (currentReport) activateReport(currentReport);
        });
    });

    // Marcar 30 días como activo por defecto
    document.querySelector('.quick-btn[data-range="30"]')?.classList.add('active');
}

document.addEventListener('DOMContentLoaded', initReportes);
