import { supabase } from './supabase.js';

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const messageBox = document.getElementById('message-box');

/**
 * Muestra un mensaje en pantalla (éxito o error)
 */
function showMessage(text, type = 'error') {
    messageBox.innerText = text;
    messageBox.className = type === 'error' ? 'error' : 'success';
    messageBox.classList.remove('hidden');
}

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

        showMessage("¡Cuenta creada! Redirigiendo...", "success");

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
        showMessage(err.message || "Error al registrarse.");
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

        // Lógica de redirección según estado
        if (tenant.estado === 'suspendido') {
            await supabase.auth.signOut();
            showMessage("Tu cuenta ha sido suspendida. Contactá al soporte.");
            return;
        }

        if (tenant.estado === 'trial_vencido' || (tenant.estado === 'trial' && trialFin < hoy)) {
            // Actualizar estado si venció
            if (tenant.estado === 'trial') {
                await supabase.from('tenants').update({ estado: 'trial_vencido' }).eq('id', tenant.id);
            }
            // Mostrar mensaje y bloquear (podríamos redirigir a una página de 'vencido')
            showMessage("Tu período de prueba ha vencido. Contactá al proveedor para continuar.");
            await supabase.auth.signOut();
            return;
        }

        // Redirección condicional: Admin vs Cliente
        if (email === 'tsanchez.scz@gmail.com') {
            window.location.href = 'admin/index.html';
        } else {
            window.location.href = 'pages/dashboard.html';
        }

    } catch (err) {
        console.error("Error en login:", err);
        showMessage(err.message || "Credenciales incorrectas.");
    }
};
