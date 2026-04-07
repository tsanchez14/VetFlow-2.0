import { supabase, getTenantId } from './supabase.js';
import { showToast, showLoading, hideLoading } from './ui.js';

/**
 * Costs Module - VetFlow 2.0
 */

let allCosts = [];
let query = '';
let selectedMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

async function init() {
    console.log("Costs module initializing...");

    const list = document.getElementById('costs-list');
    if (!list) {
        setTimeout(init, 100);
        return;
    }

    // Set initial month filter
    document.getElementById('filter-month').value = selectedMonth;

    await loadCosts();

    // Listeners
    document.getElementById('search-cost').oninput = (e) => {
        query = e.target.value.toLowerCase();
        renderCosts();
    };

    document.getElementById('filter-month').onchange = (e) => {
        selectedMonth = e.target.value;
        loadCosts();
    };

    document.getElementById('form-cost').onsubmit = handleSaveCost;
}

async function loadCosts() {
    const tenantId = await getTenantId();
    if (!tenantId) return;

    // Filter by the selected month in the DB query
    const parts = selectedMonth.split('-');
    const startDate = `${selectedMonth}-01`;
    const lastDay = new Date(parts[0], parts[1], 0).getDate();
    const endDate = `${selectedMonth}-${lastDay}`;

    try {
        showLoading();
        const { data, error } = await supabase
            .from('costs')
            .select('*')
            .eq('tenant_id', tenantId)
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: false });

        if (error) {
            throw error;
        }

        allCosts = data || [];
        renderCosts();
        updateSummary();
    } catch (err) {
        console.error(err);
        showToast("Error al cargar los gastos", "error");
    } finally {
        hideLoading();
    }
}

function updateSummary() {
    const totalFijo = allCosts
        .filter(c => c.categoria === 'fijo')
        .reduce((sum, c) => sum + parseFloat(c.monto), 0);

    const totalVariable = allCosts
        .filter(c => c.categoria === 'variable')
        .reduce((sum, c) => sum + parseFloat(c.monto), 0);

    const totalMes = totalFijo + totalVariable;

    document.getElementById('total-fijo').innerText = `$ ${totalFijo.toLocaleString()}`;
    document.getElementById('total-variable').innerText = `$ ${totalVariable.toLocaleString()}`;
    document.getElementById('total-mes').innerText = `$ ${totalMes.toLocaleString()}`;
}

function renderCosts() {
    const list = document.getElementById('costs-list');

    const filtered = allCosts.filter(c =>
        c.concepto.toLowerCase().includes(query) ||
        c.categoria.toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #94a3b8;">No se encontraron registros en este período.</td></tr>';
        return;
    }

    list.innerHTML = filtered.map(c => `
        <tr>
            <td style="font-weight: 700;">${new Date(c.fecha).toLocaleDateString()}</td>
            <td>${c.concepto}</td>
            <td><span class="badge-category ${c.categoria}">${c.categoria}</span></td>
            <td style="text-align: right;" class="cost-amount">$ ${parseFloat(c.monto).toLocaleString()}</td>
            <td style="text-align: right;">
                <button class="btn-circular" onclick="window.openEditModal(event, '${c.id}')" title="Editar"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

// CRUD
window.openCostModal = (id = null) => {
    const form = document.getElementById('form-cost');
    form.reset();
    document.getElementById('cost-id').value = '';
    document.getElementById('modal-title').innerText = id ? 'Editar Gasto' : 'Nuevo gasto';

    // Default today's date
    document.getElementById('cost-date').value = new Date().toISOString().substring(0, 10);

    if (id) {
        const c = allCosts.find(item => item.id === id);
        if (c) {
            document.getElementById('cost-id').value = c.id;
            document.getElementById('cost-date').value = c.fecha;
            document.getElementById('cost-concepto').value = c.concepto;
            document.getElementById('cost-tipo').value = c.categoria; // Maps to categoria in DB
            document.getElementById('cost-monto').value = c.monto;
        }
    }
    document.getElementById('modal-cost').classList.add('active');
};

window.openEditModal = (e, id) => {
    e.stopPropagation();
    window.openCostModal(id);
};

// Initiation with race condition protection
if (window.layoutIsReady) {
    init();
} else {
    window.addEventListener('layoutReady', () => init());
}

async function handleSaveCost(e) {
    e.preventDefault();
    if (!e.target.checkValidity()) {
        e.target.reportValidity();
        return;
    }

    const id = document.getElementById('cost-id').value;
    const tenantId = await getTenantId();

    try {
        showLoading();
        const data = {
            tenant_id: tenantId,
            concepto: document.getElementById('cost-concepto').value,
            categoria: document.getElementById('cost-tipo').value,
            monto: parseFloat(document.getElementById('cost-monto').value),
            fecha: document.getElementById('cost-date').value
        };

        if (id) {
            const { error } = await supabase.from('costs').update(data).eq('id', id);
            if (error) throw error;
            showToast("Gasto actualizado", "success");
        } else {
            const { error } = await supabase.from('costs').insert(data);
            if (error) throw error;
            showToast("Gasto registrado", "success");
        }

        window.closeModal('modal-cost');
        loadCosts();
    } catch (err) {
        console.error(err);
        showToast("Error guardando el gasto: " + err.message, "error");
    } finally {
        hideLoading();
    }
}
