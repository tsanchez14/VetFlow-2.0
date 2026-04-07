import { supabase, getTenantId } from './supabase.js';

/**
 * Suppliers Module - VetFlow 2.0
 */

let allSuppliers = [];
let products = [];
let costs = [];
let query = '';

async function init() {
    console.log("Suppliers module initializing...");

    const list = document.getElementById('suppliers-list');
    if (!list) {
        setTimeout(init, 100);
        return;
    }

    await loadSuppliers();

    // Listeners
    document.getElementById('search-supplier').placeholder = "Buscar por empresa, nombre o categoría...";
    document.getElementById('search-supplier').oninput = (e) => {
        query = e.target.value.toLowerCase();
        renderSuppliers();
    };
    document.getElementById('form-supplier').onsubmit = handleSaveSupplier;
}

async function loadSuppliers() {
    const tenantId = await getTenantId();
    const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('razon_social', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    allSuppliers = data || [];
    renderSuppliers();
}


function renderSuppliers() {
    const list = document.getElementById('suppliers-list');

    const filtered = allSuppliers.filter(s =>
        s.razon_social.toLowerCase().includes(query) ||
        (s.rubro && s.rubro.toLowerCase().includes(query)) ||
        (s.contacto && s.contacto.toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        list.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: #94a3b8;">No se encontraron proveedores.</td></tr>';
        return;
    }

    list.innerHTML = filtered.map(s => `
        <tr>
            <td>
                <span class="supp-name-cell">${s.razon_social}</span>
            </td>
            <td><span class="rubro-badge">${s.rubro || '-'}</span></td>
            <td>
                <span class="contact-pill"><i class="fas fa-id-badge"></i> ${s.contacto || '-'}</span>
            </td>
            <td>
                <div class="contact-pill"><i class="fas fa-phone"></i> ${s.telefono || '-'}</div>
            </td>
            <td>
                <a href="mailto:${s.email}" class="info-link">${s.email || '-'}</a>
            </td>
            <td style="text-align: right;">
                <button class="btn-circular" onclick="window.openEditModal(event, '${s.id}')" title="Editar"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

// CRUD
window.openSupplierModal = (id = null) => {
    const form = document.getElementById('form-supplier');
    form.reset();
    document.getElementById('supp-id').value = '';
    document.getElementById('modal-title').innerText = id ? 'Editar Registro' : 'Nuevo Registro';

    if (id) {
        const s = allSuppliers.find(item => item.id === id);
        if (s) {
            document.getElementById('supp-id').value = s.id;
            document.getElementById('supp-razon').value = s.razon_social;
            document.getElementById('supp-cuit').value = s.cuit || '';
            document.getElementById('supp-rubro').value = s.rubro || '';
            document.getElementById('supp-tel').value = s.telefono || '';
            document.getElementById('supp-email').value = s.email || '';
            document.getElementById('supp-contacto').value = s.contacto || '';
            document.getElementById('supp-obs').value = s.observaciones || '';
        }
    }
    document.getElementById('modal-supplier').classList.add('active');
};

window.openEditModal = (e, id) => {
    e.stopPropagation();
    window.openSupplierModal(id);
};

async function handleSaveSupplier(e) {
    e.preventDefault();
    const id = document.getElementById('supp-id').value;
    const tenantId = await getTenantId();

    const data = {
        tenant_id: tenantId,
        razon_social: document.getElementById('supp-razon').value,
        rubro: document.getElementById('supp-rubro').value,
        telefono: document.getElementById('supp-tel').value,
        email: document.getElementById('supp-email').value,
        contacto: document.getElementById('supp-contacto').value,
        observaciones: document.getElementById('supp-obs').value
    };

    const { error } = id
        ? await supabase.from('suppliers').update(data).eq('id', id)
        : await supabase.from('suppliers').insert(data);

    if (error) alert(error.message);
    else {
        window.closeModal('modal-supplier');
        loadSuppliers();
    }
}

window.addEventListener('layoutReady', () => init());
