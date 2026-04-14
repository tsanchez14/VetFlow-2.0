import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Configuración de Supabase
// Pegar aquí los valores de tu proyecto de Supabase (Settings > API)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inicialización del cliente
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Obtiene el objeto completo del Tenant para el usuario autenticado.
 * Incluye estado, trial_inicio, trial_fin, tipo, etc.
 */
export async function getTenantEstado() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', user.id)
        .single();

    if (error) {
        console.error("Error obteniendo estado del tenant:", error);
        return null;
    }
    return data;
}

/**
 * Obtiene solo el ID del Tenant del usuario actual.
 * Útil para filtrar consultas o insertar nuevos registros.
 */
export async function getTenantId() {
    const tenant = await getTenantEstado();
    return tenant ? tenant.id : null;
}

/**
 * Obtiene el tipo de negocio ('veterinaria' o 'tienda').
 */
export async function getTenantTipo() {
    const tenant = await getTenantEstado();
    return tenant ? tenant.tipo : null;
}

// Global Auth State Listener
supabase.auth.onAuthStateChange((event, session) => {
    const currentPath = window.location.pathname;

    // Detect if we are in a protected area
    const isAppArea = currentPath.includes('/pages/') || currentPath.includes('/admin/');
    // Detect specifically if we are on the login page (supporting various URL formats)
    const isLoginPage = currentPath.toLowerCase().includes('login');

    console.log("Auth Event:", event, "Path:", currentPath, "isAppArea:", isAppArea, "isLoginPage:", isLoginPage);

    // Get base path
    let basePath = '/';
    if (currentPath.includes('/pages/')) {
        basePath = currentPath.substring(0, currentPath.indexOf('/pages/') + 1);
    } else if (currentPath.includes('/admin/')) {
        basePath = currentPath.substring(0, currentPath.indexOf('/admin/') + 1);
    }

    if (!session) {
        // If no session and trying to access protected area, redirect to login
        if (isAppArea) {
            console.log("No session, redirecting to login...");
            window.location.href = basePath + 'login.html';
        }
    } else {
        // Only redirect to dashboard if we are on login page AND a SIGNED_IN event just happened
        // This allows users to visit the login page even if already logged in (e.g. to switch accounts)
        if (isLoginPage && event === 'SIGNED_IN') {
            console.log("Login successful, redirecting to dashboard...");
            if (session.user.email === 'tsanchez.scz@gmail.com') {
                window.location.href = basePath + 'admin/index.html';
            } else {
                window.location.href = basePath + 'pages/dashboard.html';
            }
        } 

        // Cross-role protection
        const isAdmin = session.user.email === 'tsanchez.scz@gmail.com';
        if (isAdmin && currentPath.includes('/pages/')) {
            window.location.href = basePath + 'admin/index.html';
        } else if (!isAdmin && currentPath.includes('/admin/')) {
            window.location.href = basePath + 'pages/dashboard.html';
        }
    }
});
