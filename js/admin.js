import { supabase } from './supabase.js';
import { showToast, showLoading, hideLoading } from './ui.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// CONFIGURACIÓN CRÍTICA: Service Role Key
// ADVERTENCIA: Esta key tiene acceso total y NUNCA debe estar en el frontend en un entorno real.
// Se usa aquí solo para fines de demostración administrativa local.
const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Cliente Admin (bypass RLS)
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

const ADMIN_EMAIL = 'tsanchez.scz@gmail.com';
const tenantsBody = document.getElementById('tenants-body');
const adminInfo = document.getElementById('admin-info');

let currentTenantIdForNotes = null;

/**
 * Verificación de Acceso
 */
async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== ADMIN_EMAIL) {
        showToast("Acceso denegado. Redirigiendo...", "error");
        setTimeout(() => window.location.href = '../login.html', 1500);
        return;
    }
    adminInfo.innerText = `Admin: ${user.email}`;
    loadTenants();
}

/**
 * Cargar Tenants y mapear sus emails de auth.users
 */
async function loadTenants() {
    tenantsBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

    try {
        // 1. Obtener todos los tenants
        const { data: tenants, error: tError } = await supabaseAdmin
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

        if (tError) throw tError;

        // 2. Obtener lista de usuarios para mapear emails (Requiere Service Role)
        const { data: { users }, error: uError } = await supabaseAdmin.auth.admin.listUsers();
        if (uError) throw uError;

        const userMap = {};
        users.forEach(u => userMap[u.id] = u.email);

        renderTenants(tenants, userMap);

    } catch (err) {
        console.error("Error cargando administración:", err);
        tenantsBody.innerHTML = `<tr><td colspan="6" style="color:red">Error: ${err.message}</td></tr>`;
    }
}

function renderTenants(tenants, userMap) {
    tenantsBody.innerHTML = '';
    const hoy = new Date();

    tenants.forEach(t => {
        const tr = document.createElement('tr');
        const email = userMap[t.owner_id] || 'N/A';
        const fecha = new Date(t.created_at).toLocaleDateString();

        let statusLabel = t.estado;
        let badgeClass = `status-${t.estado}`;

        // Lógica de días restantes si es trial
        if (t.estado === 'trial') {
            const fin = new Date(t.trial_fin);
            const diffTime = fin - hoy;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) {
                statusLabel = 'Trial Vencido';
                badgeClass = 'status-vencido';
            } else {
                statusLabel = `Trial (${diffDays}d)`;
            }
        }

        tr.innerHTML = `
            <td><strong>${t.nombre}</strong></td>
            <td style="text-transform: capitalize">${t.tipo}</td>
            <td>${email}</td>
            <td>${fecha}</td>
            <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" 
                    onclick="changeStatus('${t.id}', 'activo')" 
                    ${t.estado === 'activo' ? 'disabled style="opacity:0.6; cursor:not-allowed"' : ''}>
                    Activar
                </button>
                <button class="btn btn-outline btn-sm" 
                    onclick="changeStatus('${t.id}', 'suspendido')" 
                    style="color:red; border-color:red; ${t.estado === 'suspendido' ? 'opacity:0.6; cursor:not-allowed' : ''}"
                    ${t.estado === 'suspendido' ? 'disabled' : ''}>
                    Deshabilitar
                </button>
                <button class="btn btn-outline btn-sm" onclick="openNotes('${t.id}', '${t.nombre}')">
                    <i class="fas fa-sticky-note"></i>
                </button>
            </td>
        `;
        tenantsBody.appendChild(tr);
    });
}

/**
 * Cambio de estado (Service Role)
 */
window.changeStatus = async (id, newStatus) => {
    const action = newStatus === 'activo' ? 'ACTIVAR' : 'DESHABILITAR';
    if (!confirm(`¿Estás seguro de que querés ${action} este negocio?`)) return;

    try {
        showLoading();
        const { error } = await supabaseAdmin
            .from('tenants')
            .update({ estado: newStatus })
            .eq('id', id);

        if (error) throw error;
        showToast("Estado actualizado correctamente", "success");
        loadTenants();
    } catch (err) {
        console.error(err);
        showToast("Error: " + err.message, "error");
    } finally {
        hideLoading();
    }
};

/**
 * Gestión de Notas
 */
const notesModal = document.getElementById('notes-modal');
const notesList = document.getElementById('notes-list');
const newNoteInput = document.getElementById('new-note');

window.openNotes = async (id, name) => {
    currentTenantIdForNotes = id;
    document.getElementById('modal-tenant-name').innerText = `Notas: ${name}`;
    notesModal.classList.remove('hidden');
    loadNotes(id);
};

async function loadNotes(id) {
    notesList.innerHTML = 'Cargando notas...';
    const { data: notes, error } = await supabaseAdmin
        .from('tenant_notas')
        .select('*')
        .eq('tenant_id', id)
        .order('created_at', { ascending: false });

    if (error) {
        notesList.innerHTML = "Error cargando notas.";
        return;
    }

    notesList.innerHTML = notes.length > 0
        ? notes.map(n => `
            <div class="note-item">
                <div class="note-date">${new Date(n.created_at).toLocaleString()}</div>
                <div>${n.nota}</div>
            </div>
        `).join('')
        : 'Sin notas registradas.';
}

document.getElementById('save-note').onclick = async () => {
    const nota = newNoteInput.innerText || newNoteInput.value;
    if (!nota.trim()) return;

    try {
        showLoading();
        const { error } = await supabaseAdmin
            .from('tenant_notas')
            .insert({ tenant_id: currentTenantIdForNotes, nota });

        if (error) throw error;
        
        showToast("Nota guardada", "success");
        newNoteInput.value = '';
        loadNotes(currentTenantIdForNotes);
    } catch (err) {
        console.error(err);
        showToast("Error guardando nota.", "error");
    } finally {
        hideLoading();
    }
};

document.getElementById('close-modal').onclick = () => notesModal.classList.add('hidden');

document.getElementById('logout-btn').onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = '../login.html';
};

// Start
checkAdminAccess();
