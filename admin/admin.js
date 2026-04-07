/**
 * VetFlow Admin Panel - Security Guard
 * Requires authenticated session + whitelisted admin email.
 */
import { supabase } from '../js/supabase.js';

// ── Admin whitelist ─────────────────────────────
// Add all admin emails here. Never expose service_role_key on the frontend.
const ADMIN_EMAILS = [
    'admin@vetflow.io',
    // Agregá tus emails de admin aquí
];

// ── Auth Guard ──────────────────────────────────
async function initAdmin() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        // No session → redirect to login
        window.location.href = '../login.html';
        return;
    }

    if (!ADMIN_EMAILS.includes(user.email)) {
        // Not an admin → show access denied, strip content
        document.getElementById('admin-info').innerHTML =
            `<span style="color:#ef4444;font-weight:800;">⛔ Acceso denegado (${user.email})</span>`;
        document.getElementById('tenants-body').innerHTML =
            `<tr><td colspan="6" style="text-align:center;padding:40px;color:#ef4444;font-weight:700;">
                No tenés permisos para acceder a este panel.
            </td></tr>`;
        document.getElementById('notes-modal').remove();
        // Sign out non-admin user immediately
        await supabase.auth.signOut();
        return;
    }

    // Authenticated admin
    document.getElementById('admin-info').innerHTML =
        `<i class="fas fa-user-shield"></i> ${user.email}`;

    document.getElementById('logout-btn').onclick = async () => {
        await supabase.auth.signOut();
        window.location.href = '../login.html';
    };

    loadTenants();
    setupNotesModal();
}

// ── Tenants CRUD ────────────────────────────────
// NOTE: This uses the anon key + RLS. For admin-level reads of ALL tenants,
// the RLS policy on 'tenants' must allow authenticated users with admin email,
// OR you should call a Supabase Edge Function backed by the service_role_key.
async function loadTenants() {
    const tbody = document.getElementById('tenants-body');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px"><i class="fas fa-spinner fa-spin"></i> Cargando...</td></tr>';

    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#ef4444">Error: ${error.message}</td></tr>`;
        return;
    }

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px">Sin tenants registrados.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(t => `
        <tr>
            <td><strong>${t.nombre}</strong></td>
            <td>${t.tipo}</td>
            <td style="font-size:0.8rem;color:#64748b">${t.owner_email || '-'}</td>
            <td style="font-size:0.8rem;color:#94a3b8">${new Date(t.created_at).toLocaleDateString()}</td>
            <td>
                <span class="status-badge status-${t.estado}">${t.estado}</span>
            </td>
            <td>
                <div class="actions">
                    <button class="btn btn-primary btn-sm" onclick="setStatus('${t.id}', 'activo')">Activar</button>
                    <button class="btn btn-outline btn-sm" onclick="setStatus('${t.id}', 'suspendido')">Suspender</button>
                    <button class="btn btn-outline btn-sm" onclick="openNotes('${t.id}', '${t.nombre}')">Notas</button>
                </div>
            </td>
        </tr>
    `).join('');
}

window.setStatus = async (tenantId, estado) => {
    const { error } = await supabase.from('tenants').update({ estado }).eq('id', tenantId);
    if (error) alert('Error: ' + error.message);
    else loadTenants();
};

// ── Notes Modal ─────────────────────────────────
let activeTenantForNotes = null;

function setupNotesModal() {
    document.getElementById('close-modal').onclick = () => {
        document.getElementById('notes-modal').classList.add('hidden');
    };
    document.getElementById('save-note').onclick = saveNote;
}

window.openNotes = async (tenantId, tenantName) => {
    activeTenantForNotes = tenantId;
    document.getElementById('modal-tenant-name').innerText = `Notas: ${tenantName}`;
    document.getElementById('new-note').value = '';
    document.getElementById('notes-modal').classList.remove('hidden');
    await loadNotes(tenantId);
};

async function loadNotes(tenantId) {
    const { data, error } = await supabase
        .from('tenant_notes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    const list = document.getElementById('notes-list');
    if (error || !data || data.length === 0) {
        list.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem">Sin notas.</p>';
        return;
    }
    list.innerHTML = data.map(n => `
        <div class="note-item">
            <div class="note-date">${new Date(n.created_at).toLocaleString()}</div>
            <div>${n.contenido}</div>
        </div>
    `).join('');
}

async function saveNote() {
    const text = document.getElementById('new-note').value.trim();
    if (!text || !activeTenantForNotes) return;

    const { error } = await supabase.from('tenant_notes').insert({
        tenant_id: activeTenantForNotes,
        contenido: text
    });

    if (error) alert('Error: ' + error.message);
    else {
        document.getElementById('new-note').value = '';
        loadNotes(activeTenantForNotes);
    }
}

// ── Init ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initAdmin);
