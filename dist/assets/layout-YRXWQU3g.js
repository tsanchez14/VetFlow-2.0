import{s as l}from"./supabase-BhLaWdlr.js";const c=[{name:"Dashboard",icon:"fas fa-th-large",path:"dashboard.html",types:["veterinaria","tienda"]},{name:"Clientes y Mascotas",icon:"fas fa-paw",path:"clients.html",types:["veterinaria"]},{name:"Turnos",icon:"fas fa-calendar-alt",path:"appointments.html",types:["veterinaria"]},{name:"Historias Clínicas",icon:"fas fa-file-medical",path:"medical-histories.html",types:["veterinaria"]},{name:"Productos y Stock",icon:"fas fa-box",path:"products.html",types:["veterinaria","tienda"]},{name:"Ventas y Facturación",icon:"fas fa-shopping-cart",path:"ventas.html",types:["veterinaria","tienda"]},{name:"Proveedores",icon:"fas fa-truck",path:"suppliers.html",types:["veterinaria","tienda"]},{name:"Gastos y Costos",icon:"fas fa-file-invoice-dollar",path:"costos.html",types:["veterinaria","tienda"]},{name:"Reportes",icon:"fas fa-chart-line",path:"reportes.html",types:["veterinaria","tienda"]}];async function p(){console.log("Initializing Layout System...");const{data:{user:t},error:a}=await l.auth.getUser();if(a||!t){window.location.href="../login.html";return}const{data:e,error:o}=await l.from("tenants").select("*").eq("owner_id",t.id).single();if(o||!e){console.error("Error fetching tenant:",o);return}if(e.estado==="suspendido"){window.forceLogout=async()=>{await l.auth.signOut(),window.location.href="../login.html"};const r="+54 9 11 1234-5678";document.body.innerHTML=`
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:Inter,sans-serif;text-align:center;padding:20px;">
                <i class="fas fa-ban" style="font-size:4rem;color:#ef4444;margin-bottom:20px;"></i>
                <h1 style="color:#1e293b;margin-bottom:10px;">Cuenta Suspendida</h1>
                <p style="color:#475569;font-size:1.1rem;margin-bottom:20px;">Tu cuenta ha sido deshabilitada por el administrador.</p>
                <div style="background:#fff;padding:20px 30px;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);margin-bottom:30px;">
                    <p style="margin:0;font-weight:600;color:#006090;font-size:1.2rem;">Comunicate con tu proveedor</p>
                    <p style="margin:10px 0 0 0;font-size:1.5rem;font-weight:700;color:#1e293b;"><i class="fab fa-whatsapp"></i> ${r}</p>
                </div>
                <button onclick="window.forceLogout()" class="btn btn-outline" style="min-width: 200px;">
                    Volver al login
                </button>
            </div>
        `;return}const n=window.location.pathname.split("/").pop(),i=c.find(r=>r.path===n);if(i&&!i.types.includes(e.tipo)){console.warn("Unauthorized access to module:",n),window.location.href="dashboard.html";return}u(e,n),m(),h(),window.layoutIsReady=!0,window.layoutData={tenant:e,user:t},window.dispatchEvent(new CustomEvent("layoutReady",{detail:{tenant:e,user:t}})),console.log("Layout Ready Signal Dispatched.")}function u(t,a){const e=document.getElementById("layout-wrapper");if(!e)return;const n=`
        <div id="layout-sidebar">
            <div class="sidebar-logo">
                <img src="../logo-icon.svg" alt="VetFlow" onerror="this.src='/logo-icon.svg'; this.onerror=function(){this.src='https://raw.githubusercontent.com/FortAwesome/Font-Awesome/master/svgs/solid/paw.svg'}">
                <span class="nav-brand" style="font-size: 1.4rem;">VetFlow</span>
            </div>
            <nav class="sidebar-nav">
                ${c.filter(s=>s.types.includes(t.tipo)).map(s=>`
                    <a href="${s.path}" class="sidebar-link ${a===s.path?"active":""}">
                        <i class="${s.icon}"></i>
                        <span>${s.name}</span>
                    </a>
                `).join("")}
            </nav>
        </div>
    `,i=f(t),r=`
        <header id="layout-header">
            <div class="header-business-info">
                <button id="mobile-menu-btn" class="hamburger-btn">
                    <i class="fas fa-bars"></i>
                </button>
                <h3>${t.nombre} <span class="badge-vet" style="margin-left: 10px; font-size: 0.65rem;">${t.tipo}</span></h3>
            </div>
            <div class="header-actions">
                <button id="logout-btn-header" class="btn btn-outline btn-sm">
                    <i class="fas fa-sign-out-alt"></i> Salir
                </button>
            </div>
        </header>
    `,d=document.getElementById("app-content").innerHTML;e.innerHTML=`
        ${n}
        <div id="sidebar-overlay" class="sidebar-overlay"></div>
        <div id="layout-main">
            ${i}
            ${r}
            <main id="app-content">
                ${d}
            </main>
        </div>
    `}function f(t){if(t.estado!=="trial")return"";const a=new Date,o=new Date(t.trial_fin)-a,n=Math.ceil(o/(1e3*60*60*24));let i="";return n<=3&&(i="warning"),n<=1&&(i="critical"),`
        <div id="trial-banner" class="${i}">
            <i class="fas fa-clock"></i> Período de prueba: <strong>${n} días restantes</strong>
        </div>
    `}function m(){const t=document.getElementById("logout-btn-header");t&&(t.onclick=async()=>{window.layoutData=null,window.layoutIsReady=!1,await l.auth.signOut(),window.location.href="../login.html"})}function h(){const t=document.getElementById("mobile-menu-btn"),a=document.getElementById("layout-sidebar"),e=document.getElementById("sidebar-overlay");if(t&&a&&e){const o=()=>{a.classList.toggle("open"),e.classList.toggle("active")};t.addEventListener("click",o),e.addEventListener("click",o),a.querySelectorAll(".sidebar-link").forEach(i=>{i.addEventListener("click",()=>{window.innerWidth<=1024&&(a.classList.remove("open"),e.classList.remove("active"))})})}}document.addEventListener("DOMContentLoaded",p);
