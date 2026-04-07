import { supabase, getTenantId } from './supabase.js';
import { showToast, showLoading, hideLoading } from './ui.js';

/**
 * Clients & Pets Module - VetFlow 2.0
 */

let allClients = [];
let selectedClientId = null;

/**
 * Initialization
 */
async function init() {
    console.log("Clients module initializing...");

    const btnNuevo = document.getElementById('btn-nuevo-cliente');
    if (!btnNuevo) {
        console.warn("Clients UI not ready. Retrying...");
        setTimeout(init, 100);
        return;
    }

    loadClients();

    // Re-bind elements to ensure we have the correct ones in DOM
    const searchInput = document.getElementById('search-input');
    const formCliente = document.getElementById('form-cliente');
    const formMascota = document.getElementById('form-mascota');

    // Event Listeners
    searchInput.addEventListener('input', (e) => renderClients(e.target.value));

    btnNuevo.onclick = () => openClientModal();
    document.getElementById('btn-editar-cliente').onclick = () => openClientModal(selectedClientId);
    document.getElementById('btn-nueva-mascota').onclick = () => openPetModal();

    formCliente.onsubmit = handleSaveClient;
    formMascota.onsubmit = handleSavePet;
}

/**
 * CLIENTS LOGIC
 */
async function loadClients() {
    try {
        showLoading();
        const tenantId = await getTenantId();
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('apellido', { ascending: true });

        if (error) {
            throw error;
        }

        allClients = data;
        renderClients();
    } catch (err) {
        console.error("Error loading clients:", err);
        showToast("Error al cargar clientes", "error");
    } finally {
        hideLoading();
    }
}

function renderClients(filter = "") {
    const clientsScroll = document.getElementById('clients-scroll');
    if (!clientsScroll) return;

    const query = filter.toLowerCase();
    const filtered = allClients.filter(c =>
        c.nombre.toLowerCase().includes(query) ||
        c.apellido.toLowerCase().includes(query) ||
        (c.dni && c.dni.includes(query))
    );

    clientsScroll.innerHTML = filtered.map(c => `
        <div class="client-item ${selectedClientId === c.id ? 'active' : ''}" onclick="selectClient('${c.id}')">
            <h4>${c.apellido}, ${c.nombre}</h4>
            <p><i class="fas fa-id-card"></i> ${c.dni || 'S/D'}</p>
        </div>
    `).join('');
}

window.selectClient = async (id) => {
    selectedClientId = id;
    const searchInput = document.getElementById('search-input');
    const emptyView = document.getElementById('empty-view');
    const detailView = document.getElementById('detail-view');

    if (searchInput) renderClients(searchInput.value);

    const client = allClients.find(c => c.id === id);
    if (!client) return;

    // Show detail view
    if (emptyView) emptyView.style.display = 'none';
    if (detailView) detailView.classList.add('active');

    // Update UI
    document.getElementById('det-nombre').innerText = `${client.nombre} ${client.apellido}`;
    document.getElementById('det-dni').innerHTML = `<i class="fas fa-id-card"></i> DNI: ${client.dni || '-'}`;
    document.getElementById('det-contacto').innerHTML = `
        <i class="fas fa-phone"></i> ${client.telefono || '-'} | 
        <i class="fas fa-envelope"></i> ${client.email || '-'}
    `;

    loadPets(id);
};

async function handleSaveClient(e) {
    e.preventDefault();
    if (!e.target.checkValidity()) {
        e.target.reportValidity();
        return;
    }

    try {
        showLoading();
        const tenantId = await getTenantId();
        const id = document.getElementById('client-id').value;

        const clientData = {
            tenant_id: tenantId,
            nombre: document.getElementById('cli-nombre').value,
            apellido: document.getElementById('cli-apellido').value,
            dni: document.getElementById('cli-dni').value,
            telefono: document.getElementById('cli-telefono').value,
            email: document.getElementById('cli-email').value,
            direccion: document.getElementById('cli-direccion').value
        };

        if (id) {
            const { error } = await supabase.from('clients').update(clientData).eq('id', id);
            if (error) throw error;
            showToast("Cliente actualizado", "success");
        } else {
            const { error } = await supabase.from('clients').insert(clientData);
            if (error) throw error;
            showToast("Cliente creado", "success");
        }

        closeModal('modal-cliente');
        loadClients();
    } catch (err) {
        console.error(err);
        showToast("Error al guardar cliente: " + err.message, "error");
    } finally {
        hideLoading();
    }
}

/**
 * PETS LOGIC
 */
async function loadPets(clientId) {
    const petsGrid = document.getElementById('pets-grid');
    petsGrid.innerHTML = '<div class="spinner" style="margin: 20px auto;"></div>';
    
    try {
        const { data, error } = await supabase
            .from('pets')
            .select('*')
            .eq('client_id', clientId)
            .order('nombre', { ascending: true });

        if (error) throw error;

        petsGrid.innerHTML = data.length > 0
            ? data.map(p => `
                <div class="pet-card">
                    <div class="pet-icon">
                        <i class="fas ${p.especie === 'Gato' ? 'fa-cat' : 'fa-dog'}"></i>
                    </div>
                    <div class="pet-info">
                        <h5>${p.nombre}</h5>
                        <p>${p.especie} ${p.raza ? '• ' + p.raza : ''}</p>
                        <div class="pet-actions">
                            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); openPetModal('${p.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.location.href='medical-histories.html?petId=${p.id}'">
                                Historial
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')
            : '<p>Este cliente no tiene mascotas registradas.</p>';
    } catch (err) {
        console.error(err);
        petsGrid.innerHTML = 'Error al cargar mascotas.';
        showToast("Error al cargar mascotas", "error");
    }
}

async function handleSavePet(e) {
    e.preventDefault();
    if (!e.target.checkValidity()) {
        e.target.reportValidity();
        return;
    }

    try {
        showLoading();
        const tenantId = await getTenantId();
        const id = document.getElementById('pet-id').value;

        const petData = {
            tenant_id: tenantId,
            client_id: selectedClientId,
            nombre: document.getElementById('pet-nombre').value,
            especie: document.getElementById('pet-especie').value,
            raza: document.getElementById('pet-raza').value,
            fecha_nacimiento: document.getElementById('pet-nacimiento').value || null,
            sexo: document.getElementById('pet-sexo').value,
            color: document.getElementById('pet-color').value
        };

        if (id) {
            const { error } = await supabase.from('pets').update(petData).eq('id', id);
            if (error) throw error;
            showToast("Mascota actualizada", "success");
        } else {
            const { error } = await supabase.from('pets').insert(petData);
            if (error) throw error;
            showToast("Mascota registrada", "success");
        }

        closeModal('modal-mascota');
        loadPets(selectedClientId);
    } catch (err) {
        console.error(err);
        showToast("Error al guardar mascota: " + err.message, "error");
    } finally {
        hideLoading();
    }
}

/**
 * MODAL HELPERS
 */
function openClientModal(id = null) {
    const modalCliente = document.getElementById('modal-cliente');
    const formCliente = document.getElementById('form-cliente');
    const title = document.getElementById('modal-cliente-title');

    if (!modalCliente || !formCliente || !title) return;

    formCliente.reset();
    document.getElementById('client-id').value = id || '';

    if (id) {
        title.innerText = "Editar Cliente";
        const c = allClients.find(cli => cli.id === id);
        if (c) {
            document.getElementById('cli-nombre').value = c.nombre;
            document.getElementById('cli-apellido').value = c.apellido;
            document.getElementById('cli-dni').value = c.dni || '';
            document.getElementById('cli-telefono').value = c.telefono || '';
            document.getElementById('cli-email').value = c.email || '';
            document.getElementById('cli-direccion').value = c.direccion || '';
        }
    } else {
        title.innerText = "Nuevo Cliente";
    }
    modalCliente.classList.add('active');
}

window.openPetModal = async (id = null) => {
    const modalMascota = document.getElementById('modal-mascota');
    const formMascota = document.getElementById('form-mascota');
    const title = document.getElementById('modal-mascota-title');

    if (!modalMascota || !formMascota || !title) return;

    formMascota.reset();
    document.getElementById('pet-id').value = id || '';

    if (id) {
        title.innerText = "Editar Mascota";
        const tenantId = await getTenantId();
        const { data: p } = await supabase.from('pets').select('*').eq('id', id).eq('tenant_id', tenantId).single();
        if (p) {
            document.getElementById('pet-nombre').value = p.nombre;
            document.getElementById('pet-especie').value = p.especie;
            document.getElementById('pet-raza').value = p.raza || '';
            document.getElementById('pet-nacimiento').value = p.fecha_nacimiento || '';
            document.getElementById('pet-sexo').value = p.sexo || 'M';
            document.getElementById('pet-color').value = p.color || '';
        }
    } else {
        title.innerText = "Nueva Mascota";
    }
    modalMascota.classList.add('active');
};

window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
};

// Listen for layout stable event
window.addEventListener('layoutReady', (e) => {
    init();
});
