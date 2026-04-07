import { supabase, getTenantId } from './supabase.js';

/**
 * Medical Histories Module - VetFlow 2.0 (Precision Fix v4.3)
 */

let allPets = [];
let selectedPetId = null;

async function init() {
    console.log("Medical Histories initializing...");

    const searchInput = document.getElementById('search-pet');
    if (!searchInput) {
        setTimeout(init, 100);
        return;
    }

    document.getElementById('today-date').innerText = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

    await loadPets();

    // Event Listeners
    searchInput.oninput = (e) => handleSearch(e.target.value);
    document.getElementById('form-consulta').onsubmit = handleSaveConsultation;
    document.getElementById('form-prevencion').onsubmit = handleSavePrevention;

    const urlParams = new URLSearchParams(window.location.search);
    const petId = urlParams.get('petId');
    if (petId) selectPet(petId);
}

async function loadPets() {
    const tenantId = await getTenantId();
    const { data } = await supabase.from('pets').select('*, clients(*)').eq('tenant_id', tenantId);
    allPets = data || [];
}

function handleSearch(query) {
    const resultsArea = document.getElementById('search-results-section');
    const noPetCtx = document.getElementById('no-pet-context');

    if (query.length < 2) {
        resultsArea.style.display = 'none';
        if (!selectedPetId) noPetCtx.style.display = 'block';
        return;
    }

    const q = query.toLowerCase();
    const matches = allPets.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.clients.apellido.toLowerCase().includes(q)
    ).slice(0, 4);

    if (matches.length > 0) {
        noPetCtx.style.display = 'none';
        resultsArea.style.display = 'grid';
        resultsArea.innerHTML = matches.map(p => `
            <div class="pet-result-card" onclick="selectPet('${p.id}')">
                <i class="fas fa-paw"></i>
                <div>
                    <strong>${p.nombre}</strong>
                    <small>${p.clients.nombre} ${p.clients.apellido}</small>
                </div>
            </div>
        `).join('');
    } else {
        resultsArea.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 0.8rem;">Sin resultados.</p>';
        resultsArea.style.display = 'grid';
    }
}

window.selectPet = async (id) => {
    selectedPetId = id;
    const pet = allPets.find(p => p.id === id) || (await supabase.from('pets').select('*, clients(*)').eq('id', id).single()).data;
    if (!pet) return;

    document.getElementById('search-results-section').style.display = 'none';
    document.getElementById('search-pet').value = '';
    document.getElementById('active-pet-indicator').style.display = 'flex';
    document.getElementById('name-banner').innerText = pet.nombre;
    document.getElementById('cons-pet-id').value = id;

    document.getElementById('no-pet-context').style.display = 'none';
    document.getElementById('results-section').style.display = 'block';

    loadHistoryData(id);
};

async function loadHistoryData(petId) {
    const tenantId = await getTenantId();
    const [{ data: records }, { data: health }] = await Promise.all([
        supabase.from('medical_records').select('*').eq('pet_id', petId).eq('tenant_id', tenantId).order('fecha', { ascending: false }),
        supabase.from('preventive_controls').select('*').eq('pet_id', petId).eq('tenant_id', tenantId).order('fecha_aplicacion', { ascending: false })
    ]);

    const timeline = document.getElementById('timeline-list');
    if (!records || records.length === 0) {
        timeline.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px; font-size: 0.8rem;">Sin historia clínica cargada.</p>';
    } else {
        timeline.innerHTML = records.map(r => `
            <div class="rec-item">
                <div class="rec-head" onclick="toggleRec(this)">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <span style="font-weight: 800; color: var(--primary); font-size: 0.7rem;">${new Date(r.fecha).toLocaleDateString()}</span>
                        <strong style="color: #334155;">${r.motivo}</strong>
                    </div>
                    <i class="fas fa-chevron-down" style="opacity: 0.3;"></i>
                </div>
                <div class="rec-body" style="display:none;">
                    <p style="white-space: pre-line; color: #4b5563;">${r.diagnostico}</p>
                    <div style="margin-top: 12px; padding: 12px; background: #f0f7ff; border-radius: 12px; border-left: 4px solid var(--primary);">
                        <strong style="color: var(--primary); font-size: 0.75rem;">PLAN A SEGUIR:</strong>
                        <p style="margin-top: 5px; font-style: italic; font-size: 0.8rem;">${r.tratamiento}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    const vacs = (health || []).filter(i => i.tipo === 'vacuna');
    const pars = (health || []).filter(i => i.tipo === 'desparasitacion');
    document.getElementById('vaccine-list').innerHTML = vacs.map(i => `<div class="health-mini-row">${i.nombre} <small>${new Date(i.fecha_aplicacion).toLocaleDateString()}</small></div>`).join('') || 'Sin registros';
    document.getElementById('parasite-list').innerHTML = pars.map(i => `<div class="health-mini-row">${i.nombre} <small>${new Date(i.fecha_aplicacion).toLocaleDateString()}</small></div>`).join('') || 'Sin registros';
}

async function handleSaveConsultation(e) {
    e.preventDefault();
    if (!selectedPetId) {
        console.warn('No pet selected for consultation');
        return;
    }
    const btn = document.getElementById('btn-save-consult');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const tid = await getTenantId();
    const record = {
        tenant_id: tid,
        pet_id: selectedPetId,
        fecha: new Date().toISOString(),
        motivo: document.getElementById('cons-motivo').value,
        peso: document.getElementById('cons-peso').value,
        temperatura: document.getElementById('cons-temp').value,
        fc: document.getElementById('cons-fc').value,
        fr: document.getElementById('cons-fr').value,
        diagnostico: document.getElementById('cons-diagnostico').value,
        tratamiento: document.getElementById('cons-tratamiento').value
    };

    const { error } = await supabase.from('medical_records').insert(record);
    if (error) alert(error.message);
    else {
        e.target.reset();
        loadHistoryData(selectedPetId);
    }
    btn.disabled = false;
    btn.innerHTML = originalText;
}

async function handleSavePrevention(e) {
    e.preventDefault();
    const tid = await getTenantId();
    const data = {
        tenant_id: tid,
        pet_id: selectedPetId,
        tipo: document.getElementById('prev-tipo').value,
        nombre: document.getElementById('prev-nombre').value,
        fecha_aplicacion: document.getElementById('prev-fecha').value,
        fecha_proxima: document.getElementById('prev-proxima').value || null
    };

    await supabase.from('preventive_controls').insert(data);
    window.closeModal('modal-prevencion');
    loadHistoryData(selectedPetId);
}

window.openVaccineModal = (tipo) => {
    document.getElementById('prev-tipo').value = tipo;
    document.getElementById('modal-prev-title').innerText = tipo === 'vacuna' ? 'Nueva Vacuna' : 'Antiparasitario';
    document.getElementById('modal-prevencion').style.display = 'flex'; // Explicit show
};

window.addEventListener('layoutReady', () => init());
