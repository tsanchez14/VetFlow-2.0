import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Configuración de Supabase
// Pegar aquí los valores de tu proyecto de Supabase (Settings > API)
const SUPABASE_URL = 'https://yafmjmsqmtehwglnznvg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZm1qbXNxbXRlaHdnbG56bnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNTM4NjYsImV4cCI6MjA5MDgyOTg2Nn0.qKPCkZDvRH9GZFZDFvOTRv9vY1JOqqqaJECiJapmqvU';

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
