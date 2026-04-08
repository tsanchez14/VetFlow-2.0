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
        window.location.href = '../login.html';
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

    // Suspensión check
    if (tenant.estado === 'suspendido') {
        window.forceLogout = async () => {
            await supabase.auth.signOut();
            window.location.href = '../login.html';
        };

        const contactPhone = "+54 9 11 1234-5678"; // Placeholder del proveedor
        document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:Inter,sans-serif;text-align:center;padding:20px;">
                <i class="fas fa-ban" style="font-size:4rem;color:#ef4444;margin-bottom:20px;"></i>
                <h1 style="color:#1e293b;margin-bottom:10px;">Cuenta Suspendida</h1>
                <p style="color:#475569;font-size:1.1rem;margin-bottom:20px;">Tu cuenta ha sido deshabilitada por el administrador.</p>
                <div style="background:#fff;padding:20px 30px;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);margin-bottom:30px;">
                    <p style="margin:0;font-weight:600;color:#006090;font-size:1.2rem;">Comunicate con tu proveedor</p>
                    <p style="margin:10px 0 0 0;font-size:1.5rem;font-weight:700;color:#1e293b;"><i class="fab fa-whatsapp"></i> ${contactPhone}</p>
                </div>
                <button onclick="window.forceLogout()" class="btn btn-outline" style="min-width: 200px;">
                    Volver al login
                </button>
            </div>
        `;
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
    setupMobileSidebar();

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
                <button id="mobile-menu-btn" class="hamburger-btn">
                    <i class="fas fa-bars"></i>
                </button>
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
        <div id="sidebar-overlay" class="sidebar-overlay"></div>
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
            window.location.href = '../login.html';
        };
    }
}

function setupMobileSidebar() {
    const btn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('layout-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (btn && sidebar && overlay) {
        const toggleMenu = () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        };

        btn.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);

        // Closes on any link click (for inner navigation if needed)
        const links = sidebar.querySelectorAll('.sidebar-link');
        links.forEach(link => {
            link.addEventListener('click', () => {
                if(window.innerWidth <= 1024) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', initLayout);
