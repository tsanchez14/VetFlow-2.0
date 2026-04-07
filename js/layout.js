import { supabase } from './supabase.js';

/**
 * Layout System - VetFlow 2.0
 * Handles sidebar injection, trial banner, and role-based access control.
 */

const MODULES = [
    { name: 'Dashboard', icon: 'fas fa-th-large', path: 'dashboard.html', types: ['veterinaria', 'tienda'] },
    { name: 'Clientes y Mascotas', icon: 'fas fa-paw', path: 'clients.html', types: ['veterinaria'] },
    { name: 'Turnos', icon: 'fas fa-calendar-alt', path: 'appointments.html', types: ['veterinaria'] },
    { name: 'Historias Clínicas', icon: 'fas fa-file-medical', path: 'medical-histories.html', types: ['veterinaria'] },
    { name: 'Productos y Stock', icon: 'fas fa-box', path: 'products.html', types: ['veterinaria', 'tienda'] },
    { name: 'Ventas y Facturación', icon: 'fas fa-shopping-cart', path: 'ventas.html', types: ['veterinaria', 'tienda'] },
    { name: 'Proveedores', icon: 'fas fa-truck', path: 'suppliers.html', types: ['veterinaria', 'tienda'] },
    { name: 'Gastos y Costos', icon: 'fas fa-file-invoice-dollar', path: 'costos.html', types: ['veterinaria', 'tienda'] },
    { name: 'Reportes', icon: 'fas fa-chart-line', path: 'reportes.html', types: ['veterinaria', 'tienda'] },
];

async function initLayout() {
    console.log("Initializing Layout System...");

    // 1. Verificar Sesión
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        window.location.href = '../index.html#login';
        return;
    }

    // 2. Obtener Datos del Tenant
    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', user.id)
        .single();

    if (tenantError || !tenant) {
        console.error("Error fetching tenant:", tenantError);
        return;
    }

    // 3. Route Guard & Verification
    const currentPath = window.location.pathname.split('/').pop();
    const currentModule = MODULES.find(m => m.path === currentPath);

    if (currentModule && !currentModule.types.includes(tenant.tipo)) {
        console.warn("Unauthorized access to module:", currentPath);
        window.location.href = 'dashboard.html';
        return;
    }

    // 4. Inject Structure
    renderStructure(tenant, currentPath);
    setupLogout();

    // 5. Signal that Layout is ready
    window.layoutIsReady = true; // Global flag
    window.layoutData = { tenant, user };
    window.dispatchEvent(new CustomEvent('layoutReady', {
        detail: { tenant, user }
    }));
    console.log("Layout Ready Signal Dispatched.");
}

function renderStructure(tenant, currentPath) {
    const wrapper = document.getElementById('layout-wrapper');
    if (!wrapper) return;

    // Sidebar Content
    const allowedModules = MODULES.filter(m => m.types.includes(tenant.tipo));
    const sidebarHtml = `
        <div id="layout-sidebar">
            <div class="sidebar-logo">
                <img src="../logo-icon.svg" alt="VetFlow">
                <span class="nav-brand" style="font-size: 1.4rem;">VetFlow</span>
            </div>
            <nav class="sidebar-nav">
                ${allowedModules.map(m => `
                    <a href="${m.path}" class="sidebar-link ${currentPath === m.path ? 'active' : ''}">
                        <i class="${m.icon}"></i>
                        <span>${m.name}</span>
                    </a>
                `).join('')}
            </nav>
        </div>
    `;

    // Header Content
    const trialBanner = renderTrialBanner(tenant);
    const headerHtml = `
        <header id="layout-header">
            <div class="header-business-info">
                <h3>${tenant.nombre} <span class="badge-vet" style="margin-left: 10px; font-size: 0.65rem;">${tenant.tipo}</span></h3>
            </div>
            <div class="header-actions">
                <button id="logout-btn-header" class="btn btn-outline btn-sm">
                    <i class="fas fa-sign-out-alt"></i> Salir
                </button>
            </div>
        </header>
    `;

    // Reconstruct DOM
    const appContent = document.getElementById('app-content');
    const originalContent = appContent.innerHTML;

    wrapper.innerHTML = `
        ${sidebarHtml}
        <div id="layout-main">
            ${trialBanner}
            ${headerHtml}
            <main id="app-content">
                ${originalContent}
            </main>
        </div>
    `;
}

function renderTrialBanner(tenant) {
    if (tenant.estado !== 'trial') return '';

    const hoy = new Date();
    const fin = new Date(tenant.trial_fin);
    const diffTime = fin - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let bannerClass = '';
    if (diffDays <= 3) bannerClass = 'warning';
    if (diffDays <= 1) bannerClass = 'critical';

    return `
        <div id="trial-banner" class="${bannerClass}">
            <i class="fas fa-clock"></i> Período de prueba: <strong>${diffDays} días restantes</strong>
        </div>
    `;
}

function setupLogout() {
    const btn = document.getElementById('logout-btn-header');
    if (btn) {
        btn.onclick = async () => {
            // Clear all in-memory tenant data before redirecting
            window.layoutData = null;
            window.layoutIsReady = false;
            await supabase.auth.signOut();
            window.location.href = '../index.html#login';
        };
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', initLayout);
