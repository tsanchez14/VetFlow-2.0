import { supabase } from './supabase.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// CONFIGURACIÓN CRÍTICA: Service Role Key
// ADVERTENCIA: Esta key tiene acceso total y NUNCA debe estar en el frontend en un entorno real.
// Se usa aquí solo para fines de demostración administrativa local.
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZm1qbXNxbXRlaHdnbG56bnZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI1Mzg2NiwiZXhwIjoyMDkwODI5ODY2fQ.4EgZhHlpaCVBOmd9R6iwxoZR7tCDQcOL_zK7cFGx80M';
const SUPABASE_URL = 'https://yafmjmsqmtehwglnznvg.supabase.co';

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
        alert("Acceso denegado. Redirigiendo...");
        window.location.href = '../index.html#login';
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

    const { error } = await supabaseAdmin
        .from('tenants')
        .update({ estado: newStatus })
        .eq('id', id);

    if (error) alert("Error: " + error.message);
    else loadTenants();
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

    const { error } = await supabaseAdmin
        .from('tenant_notas')
        .insert({ tenant_id: currentTenantIdForNotes, nota });

    if (error) alert("Error guardando nota.");
    else {
        newNoteInput.value = '';
        loadNotes(currentTenantIdForNotes);
    }
};

document.getElementById('close-modal').onclick = () => notesModal.classList.add('hidden');

document.getElementById('logout-btn').onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = '../index.html#login';
};

// Start
checkAdminAccess();
