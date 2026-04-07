/**
 * Generic UI functions for VetFlow 2.0
 */

// Initialize global UI containers if they don't exist
function initUIContainers() {
    if (!document.getElementById('global-loader')) {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    }

    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
}

// Call on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUIContainers);
} else {
    initUIContainers();
}

/**
 * Muestra el overlay de carga.
 */
export function showLoading() {
    initUIContainers();
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.classList.add('active');
    }
}

/**
 * Oculta el overlay de carga.
 */
export function hideLoading() {
    const loader = document.getElementById('global-loader');
    if (loader && loader.classList.contains('active')) {
        loader.classList.remove('active');
    }
}

/**
 * Muestra un mensaje flotante (toast)
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - Tipo (success, error, info). Default: info.
 */
export function showToast(message, type = 'info') {
    initUIContainers();
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon"></i>
        <span>${message}</span>
        <i class="fas fa-times toast-close"></i>
    `;

    container.appendChild(toast);

    // Auto dismiss after 3.5 seconds
    const hideTimeout = setTimeout(() => {
        closeToast(toast);
    }, 3500);

    // Manual close
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => {
        clearTimeout(hideTimeout);
        closeToast(toast);
    };
}

function closeToast(toastElement) {
    if (toastElement && !toastElement.classList.contains('hiding')) {
        toastElement.classList.add('hiding');
        // Remove from DOM after animation completes
        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
        }, 400); // 400ms matches CSS animation
    }
}
