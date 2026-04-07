import { supabase } from './supabase.js';
import { showToast, showLoading, hideLoading } from './ui.js';

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

/**
 * Lógica de REGISTRO
 */
registerForm.onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const tipo = document.getElementById('reg-tipo').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        showLoading();
        // 1. Crear usuario en Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario.");

        // 2. Crear Tenant (14 días de trial)
        const trialInicio = new Date();
        const trialFin = new Date();
        trialFin.setDate(trialFin.getDate() + 14);

        const { error: tenantError } = await supabase
            .from('tenants')
            .insert({
                nombre,
                tipo,
                owner_id: authData.user.id,
                estado: 'trial',
                trial_inicio: trialInicio.toISOString(),
                trial_fin: trialFin.toISOString()
            });

        if (tenantError) throw tenantError;

        showToast("¡Cuenta creada! Redirigiendo...", "success");

        // Redirigir según el correo
        setTimeout(() => {
            if (email === 'tsanchez.scz@gmail.com') {
                window.location.href = 'admin/index.html';
            } else {
                window.location.href = 'pages/dashboard.html';
            }
        }, 1500);

    } catch (err) {
        console.error("Error en registro:", err);
        showToast(err.message || "Error al registrarse.", "error");
    } finally {
        hideLoading();
    }
};

/**
 * Lógica de LOGIN
 */
loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        showLoading();
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Verificar estado del tenant
        const { data: tenant, error: tError } = await supabase
            .from('tenants')
            .select('*')
            .eq('owner_id', data.user.id)
            .single();

        if (tError) throw new Error("No se encontró información del negocio.");

        const hoy = new Date();
        const trialFin = new Date(tenant.trial_fin);

        // Modificamos el estado o enviamos alert si está vencido
        if (tenant.estado === 'suspendido') {
            await supabase.auth.signOut();
            throw new Error("Tu cuenta ha sido suspendida. Contactá al soporte.");
        }

        if (tenant.estado === 'trial_vencido' || (tenant.estado === 'trial' && trialFin < hoy)) {
            // Actualizar estado si venció
            if (tenant.estado === 'trial') {
                await supabase.from('tenants').update({ estado: 'trial_vencido' }).eq('id', tenant.id);
            }
            // Mostrar mensaje y bloquear
            await supabase.auth.signOut();
            throw new Error("Tu período de prueba ha vencido. Contactá al proveedor para continuar.");
        }

        showToast("Iniciando sesión...", "success");
        // No redirigimos aquí manualmente porque supabase.js globalAuthListener se encarga de saltar la pag vía 'SIGNED_IN'.
        
    } catch (err) {
        console.error("Error en login:", err);
        showToast(err.message || "Credenciales incorrectas.", "error");
    } finally {
        hideLoading();
    }
};
