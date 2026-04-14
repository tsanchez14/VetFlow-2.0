import { supabase, getTenantId } from './supabase.js';
import { showToast, showLoading, hideLoading } from './ui.js';

/**
 * Appointments Module - VetFlow 2.0 (Unified WhatsApp Action Version)
 */

let currentView = 'day';
let currentDate = new Date();
let selectedAppointment = null;

async function init() {
    console.log("Appointments module initializing...");

    const btnNuevo = document.getElementById('btn-nuevo-turno');
    if (!btnNuevo) {
        setTimeout(init, 100);
        return;
    }

    updateDateLabel();
    loadAppointments();

    // Event Listeners
    document.getElementById('view-day-btn').onclick = () => switchView('day');
    document.getElementById('view-week-btn').onclick = () => switchView('week');
    document.getElementById('prev-btn').onclick = () => navigateRange(-1);
    document.getElementById('next-btn').onclick = () => navigateRange(1);

    btnNuevo.onclick = () => openAppointmentModal();

    document.getElementById('form-turno').onsubmit = handleSaveAndNotify;
    document.getElementById('appt-owner-search').oninput = (e) => searchOwners(e.target.value);

    document.getElementById('btn-change-client').onclick = () => {
        document.getElementById('group-search-owner').style.display = 'block';
        document.getElementById('client-summary').style.display = 'none';
        document.getElementById('appt-client-id').value = '';
        document.getElementById('appt-phone').value = '';
    };

    document.getElementById('btn-crear-consulta').onclick = () => {
        if (!selectedAppointment) return;
        window.location.href = `medical-histories.html?petId=${selectedAppointment.pet_id}&appointmentId=${selectedAppointment.id}`;
    };
}

/**
 * NAVIGATION & VIEW SWITCHING
 */
function updateDateLabel() {
    const label = document.getElementById('current-date-label');
    if (currentView === 'day') {
        label.innerText = currentDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    } else {
        const start = getStartOfWeek(currentDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        label.innerText = `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('es-AR', { month: 'short' })}`;
    }
}

function switchView(view) {
    currentView = view;
    document.getElementById('view-day-btn').classList.toggle('active', view === 'day');
    document.getElementById('view-week-btn').classList.toggle('active', view === 'week');
    document.getElementById('view-day').style.display = view === 'day' ? 'block' : 'none';
    document.getElementById('view-week').style.display = view === 'week' ? 'block' : 'none';
    updateDateLabel();
    loadAppointments();
}

function navigateRange(dir) {
    if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + dir);
    } else {
        currentDate.setDate(currentDate.getDate() + (dir * 7));
    }
    updateDateLabel();
    loadAppointments();
}

/**
 * DATA FETCHING
 */
async function loadAppointments() {
    const tenantId = await getTenantId();
    let query = supabase.from('appointments').select('*, pets(id, nombre, client_id, clients(nombre, apellido, telefono))').eq('tenant_id', tenantId);

    if (currentView === 'day') {
        const start = new Date(currentDate); start.setHours(0, 0, 0, 0);
        const end = new Date(currentDate); end.setHours(23, 59, 59, 999);
        query = query.gte('fecha_hora', start.toISOString()).lte('fecha_hora', end.toISOString());
    } else {
        const start = getStartOfWeek(currentDate); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 7);
        query = query.gte('fecha_hora', start.toISOString()).lt('fecha_hora', end.toISOString());
    }

    try {
        showLoading();
        const { data, error } = await query.order('fecha_hora', { ascending: true });

        if (error) {
            throw error;
        }

        if (currentView === 'day') renderDayView(data);
        else renderWeekView(data);
    } catch (err) {
        console.error("Error loading appointments:", err);
        showToast("Error al cargar los turnos", "error");
    } finally {
        hideLoading();
    }
}

/**
 * RENDERING
 */
function renderDayView(data) {
    const list = document.getElementById('appointments-list');
    if (data.length === 0) {
        list.innerHTML = `
            <div class="empty-view" style="padding: 80px 20px; text-align: center; animation: fadeIn 0.5s ease-out;">
                <i class="fas fa-calendar-day" style="font-size: 5rem; color: #cbd5e1; margin-bottom: 20px; display: block;"></i>
                <h3 style="color: var(--text-main); margin-bottom: 10px;">No hay turnos agendados</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem;">Hacé clic en "Nuevo Turno" para comenzar.</p>
            </div>`;
        return;
    }

    list.innerHTML = data.map(apt => {
        const hora = new Date(apt.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="appointment-card status-${apt.estado}" onclick="openAppointmentModal('${apt.id}')">
                <div class="apt-time">${hora}</div>
                <div class="apt-details">
                    <h4>${apt.pets.nombre}</h4>
                    <p>
                        <span><i class="fas fa-user-circle"></i> ${apt.pets.clients.nombre} ${apt.pets.clients.apellido}</span>
                        <span style="margin-left: 15px;"><i class="fas fa-stethoscope"></i> ${apt.motivo}</span>
                    </p>
                </div>
                <div class="apt-status">
                    <span class="status-badge">${apt.estado}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderWeekView(data) {
    const grid = document.getElementById('weekly-grid');
    const start = getStartOfWeek(currentDate);
    let html = '';

    for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(day.getDate() + i);
        const dayIso = day.toISOString().split('T')[0];
        const dayApts = data.filter(a => a.fecha_hora.startsWith(dayIso));

        html += `
            <div class="week-day-col">
                <div class="week-day-header">
                    <h5>${day.toLocaleDateString('es-AR', { weekday: 'short' })}</h5>
                    <span>${day.getDate()}</span>
                </div>
                <div class="week-apts">
                    ${dayApts.map(a => `
                        <div class="week-apt-mini status-${a.estado}" onclick="openAppointmentModal('${a.id}')">
                            <strong>${new Date(a.fecha_hora).getHours()}:${String(new Date(a.fecha_hora).getMinutes()).padStart(2, '0')}</strong> ${a.pets.nombre}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    grid.innerHTML = html;
}

/**
 * MODAL LOGIC (UNIFIED)
 */
window.openAppointmentModal = async (id = null) => {
    document.getElementById('form-turno').reset();
    document.getElementById('appointment-id').value = id || '';

    if (id) {
        // MODO EDICIÓN
        document.getElementById('modal-turno-title').innerText = "Editar Turno";
        const tenantId = await getTenantId();
        const { data: apt } = await supabase.from('appointments').select('*, pets(id, nombre, client_id, clients(nombre, apellido, telefono))').eq('id', id).eq('tenant_id', tenantId).single();
        if (!apt) { document.getElementById('modal-turno').classList.remove('active'); return; }
        selectedAppointment = apt;

        // UI para Edición
        document.getElementById('group-search-owner').style.display = 'none';
        document.getElementById('client-summary').style.display = 'block';
        document.getElementById('display-owner-name').innerText = `${apt.pets.nombre} (${apt.pets.clients.nombre} ${apt.pets.clients.apellido})`;
        document.getElementById('appt-client-id').value = apt.pets.client_id;
        document.getElementById('appt-phone').value = apt.pets.clients.telefono || '';

        // Cargar mascotas y autocompletar el input
        await selectOwner(apt.pets.client_id, `${apt.pets.clients.nombre} ${apt.pets.clients.apellido}`, false);
        document.getElementById('appt-pet-name').value = apt.pets.nombre;
        document.getElementById('appt-pet-id').value = apt.pet_id;

        // Fecha/Hora
        const localDate = new Date(apt.fecha_hora).toISOString().slice(0, 16);
        document.getElementById('appt-datetime').value = localDate;
        document.getElementById('appt-status').value = apt.estado;
        document.getElementById('appt-motivo').value = apt.motivo;

        // Botones de acción si ya fue atendido
        document.getElementById('attended-actions').style.display = apt.estado === 'atendido' ? 'block' : 'none';

    } else {
        // MODO NUEVO
        selectedAppointment = null;
        document.getElementById('modal-turno-title').innerText = "Nuevo Turno";
        document.getElementById('group-search-owner').style.display = 'block';
        document.getElementById('client-summary').style.display = 'none';
        document.getElementById('appt-pet-name').disabled = true;
        document.getElementById('appt-pet-name').value = '';
        document.getElementById('appt-pet-id').value = '';
        document.getElementById('attended-actions').style.display = 'none';
    }

    document.getElementById('modal-turno').classList.add('active');
};

async function searchOwners(query) {
    const resultsDiv = document.getElementById('owner-results');
    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    const tenantId = await getTenantId();
    const { data } = await supabase.from('clients').select('*').eq('tenant_id', tenantId).or(`nombre.ilike.%${query}%,apellido.ilike.%${query}%,dni.ilike.%${query}%`).limit(5);

    if (data && data.length > 0) {
        resultsDiv.innerHTML = data.map(c => `
            <div class="search-item" onclick="selectOwner('${c.id}', '${c.nombre} ${c.apellido}', true, '${c.telefono || ''}')">
                ${c.apellido}, ${c.nombre} (${c.dni || 'S/D'})
            </div>
        `).join('');
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.style.display = 'none';
    }
}

window.selectOwner = async (id, name, updatePhone = true, phone = '') => {
    document.getElementById('appt-owner-search').value = name;
    document.getElementById('appt-client-id').value = id;
    if (updatePhone) document.getElementById('appt-phone').value = phone;
    document.getElementById('owner-results').style.display = 'none';

    try {
        showLoading();
        const tenantId = await getTenantId();
        const { data, error } = await supabase.from('pets').select('id, nombre').eq('client_id', id).eq('tenant_id', tenantId);
        if (error) throw error;

        const petList = document.getElementById('pets-list');
        const petNameInput = document.getElementById('appt-pet-name');

        petList.innerHTML = data.map(p => `<option value="${p.nombre}" data-id="${p.id}"></option>`).join('');
        petNameInput.disabled = false;
        petNameInput.placeholder = "Escriba el nombre de la mascota...";

        // Listener to sync ID
        petNameInput.oninput = () => {
            const val = petNameInput.value;
            const option = Array.from(petList.options).find(opt => opt.value === val);
            document.getElementById('appt-pet-id').value = option ? option.dataset.id : '';
        };

    } catch (err) {
        console.error(err);
        showToast("Error al cargar mascotas", "error");
    } finally {
        hideLoading();
    }
};

async function handleSaveAndNotify(e) {
    e.preventDefault();

    // HTML5 Form Validation
    if (!e.target.checkValidity()) {
        e.target.reportValidity();
        return;
    }

    const tenantId = await getTenantId();
    const id = document.getElementById('appointment-id').value;
    const phone = document.getElementById('appt-phone').value;
    const btn = document.getElementById('btn-submit-turno');
    const originalContent = btn.innerHTML;

    if (!phone) {
        showToast("Por favor, ingresá un teléfono para el WhatsApp.", "error");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

    try {
        showLoading();
        const petIdValue = document.getElementById('appt-pet-id').value;
        const petNameValue = document.getElementById('appt-pet-name').value;
        const clientId = document.getElementById('appt-client-id').value;

        let finalPetId = petIdValue;

        // If no ID but name exists, create the pet
        if (!finalPetId && petNameValue) {
            const { data: newPet, error: petError } = await supabase
                .from('pets')
                .insert({
                    tenant_id: tenantId,
                    client_id: clientId,
                    nombre: petNameValue,
                    especie: 'Desconocido' // Default species for quick entry
                })
                .select()
                .single();

            if (petError) throw petError;
            finalPetId = newPet.id;
        }

        if (!finalPetId) {
            throw new Error("Debe seleccionar o escribir el nombre de una mascota.");
        }

        const aptData = {
            tenant_id: tenantId,
            pet_id: finalPetId,
            fecha_hora: document.getElementById('appt-datetime').value,
            motivo: document.getElementById('appt-motivo').value,
            estado: document.getElementById('appt-status').value
        };

        // Update phone in DB
        const { error: phoneError } = await supabase.from('clients').update({ telefono: phone }).eq('id', document.getElementById('appt-client-id').value);
        if (phoneError) throw phoneError;

        let result;
        if (id) {
            result = await supabase.from('appointments').update(aptData).eq('id', id);
            if (result.error) throw result.error;
            showToast("Turno actualizado correctamente.", "success");
        } else {
            result = await supabase.from('appointments').insert(aptData).select('*, pets(nombre, clients(nombre))').single();
            if (result.error) throw result.error;
            showToast("Turno creado correctamente.", "success");

            // Trigger WhatsApp for NEW appointments only, or conditionally
            const fecha = new Date(aptData.fecha_hora).toLocaleDateString();
            const hora = new Date(aptData.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const clientName = result.data.pets.clients.nombre;
            const petName = result.data.pets.nombre;

            const msg = `🚀 *VetFlow - Turno Agendado*\n\nHola *${clientName}*, te recordamos el turno de *${petName}*:\n\n📅 Fecha: ${fecha}\n⏰ Hora: ${hora}\n🏥 Motivo: ${aptData.motivo}\n\n¡Te esperamos! 🐾`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
        }

        window.closeModal('modal-turno');
        loadAppointments();
    } catch (err) {
        console.error(err);
        showToast("Error al guardar: " + err.message, "error");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        hideLoading();
    }
}

function getStartOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

window.addEventListener('layoutReady', () => {
    init();
});
