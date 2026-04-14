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
    const isPublicPage = currentPath === '/' ||
        currentPath.endsWith('index.html') ||
        currentPath.endsWith('login.html');
    @
    // Obtener el basePath seguro de manera dinámica (soporta subdominios e.g. GitHub Pages)
    let basePath = '/';
    if (currentPath.includes('/pages/')) {
        basePath = currentPath.substring(0, currentPath.indexOf('/pages/') + 1);
    } else if (currentPath.includes('/admin/')) {
        basePath = currentPath.substring(0, currentPath.indexOf('/admin/') + 1);
    } else {
        basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
    }

    if (event === 'SIGNED_OUT' || !session) {
        // Redirigir al inicio de sesión si la sesión se pierde
        if (!isPublicPage) {
            window.location.href = basePath + 'login.html';
        }
    } else if (session) {
        // Protección de rutas cruzadas (Admin tratando de entrar a Pages o Usuario tratando de entrar a Admin)
        if (session.user.email === 'tsanchez.scz@gmail.com' && currentPath.includes('/pages/')) {
            window.location.href = basePath + 'admin/index.html';
        } else if (session.user.email !== 'tsanchez.scz@gmail.com' && currentPath.includes('/admin/')) {
            window.location.href = basePath + 'pages/dashboard.html';
        }
    }
});
