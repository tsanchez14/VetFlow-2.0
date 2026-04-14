import{s as h}from"./supabase-BhLaWdlr.js";/* empty css               */import{s as I,a as s,h as y}from"./ui-sLR7WWXu.js";import{createClient as $}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";const L="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZm1qbXNxbXRlaHdnbG56bnZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI1Mzg2NiwiZXhwIjoyMDkwODI5ODY2fQ.4EgZhHlpaCVBOmd9R6iwxoZR7tCDQcOL_zK7cFGx80M",M="https://yafmjmsqmtehwglnznvg.supabase.co",r=$(M,L,{auth:{persistSession:!1,autoRefreshToken:!1,detectSessionInUrl:!1}}),v="tsanchez.scz@gmail.com",c=document.getElementById("tenants-body"),A=document.getElementById("admin-info");let u=null;async function _(){const{data:{user:e}}=await h.auth.getUser();if(!e||e.email!==v){s("Acceso denegado. Redirigiendo...","error"),setTimeout(()=>window.location.href="../login.html",1500);return}A.innerText=`Admin: ${e.email}`,w()}async function w(){c.innerHTML='<tr><td colspan="6">Cargando...</td></tr>';try{const{data:e,error:n}=await r.from("tenants").select("*").order("created_at",{ascending:!1});if(n)throw n;const{data:{users:o},error:t}=await r.auth.admin.listUsers();if(t)throw t;const a={};o.forEach(i=>a[i.id]=i.email),B(e,a)}catch(e){console.error("Error cargando administración:",e),c.innerHTML=`<tr><td colspan="6" style="color:red">Error: ${e.message}</td></tr>`}}function B(e,n){c.innerHTML="";const o=new Date;e.forEach(t=>{const a=document.createElement("tr"),i=n[t.owner_id]||"N/A",E=new Date(t.created_at).toLocaleDateString();let d=t.estado,f=`status-${t.estado}`;if(t.estado==="trial"){const T=new Date(t.trial_fin)-o,g=Math.ceil(T/(1e3*60*60*24));g<=0?(d="Trial Vencido",f="status-vencido"):d=`Trial (${g}d)`}a.innerHTML=`
            <td><strong>${t.nombre}</strong></td>
            <td style="text-transform: capitalize">${t.tipo}</td>
            <td>${i}</td>
            <td>${E}</td>
            <td><span class="status-badge ${f}">${d}</span></td>
            <td class="actions">
                <button class="btn btn-primary btn-sm" 
                    onclick="changeStatus('${t.id}', 'activo')" 
                    ${t.estado==="activo"?'disabled style="opacity:0.6; cursor:not-allowed"':""}>
                    Activar
                </button>
                <button class="btn btn-outline btn-sm" 
                    onclick="changeStatus('${t.id}', 'suspendido')" 
                    style="color:red; border-color:red; ${t.estado==="suspendido"?"opacity:0.6; cursor:not-allowed":""}"
                    ${t.estado==="suspendido"?"disabled":""}>
                    Deshabilitar
                </button>
                <button class="btn btn-outline btn-sm" onclick="openNotes('${t.id}', '${t.nombre}')">
                    <i class="fas fa-sticky-note"></i>
                </button>
            </td>
        `,c.appendChild(a)})}window.changeStatus=async(e,n)=>{if(confirm(`¿Estás seguro de que querés ${n==="activo"?"ACTIVAR":"DESHABILITAR"} este negocio?`))try{I();const{error:t}=await r.from("tenants").update({estado:n}).eq("id",e);if(t)throw t;s("Estado actualizado correctamente","success"),w()}catch(t){console.error(t),s("Error: "+t.message,"error")}finally{y()}};const b=document.getElementById("notes-modal"),l=document.getElementById("notes-list"),m=document.getElementById("new-note");window.openNotes=async(e,n)=>{u=e,document.getElementById("modal-tenant-name").innerText=`Notas: ${n}`,b.classList.remove("hidden"),p(e)};async function p(e){l.innerHTML="Cargando notas...";const{data:n,error:o}=await r.from("tenant_notas").select("*").eq("tenant_id",e).order("created_at",{ascending:!1});if(o){l.innerHTML="Error cargando notas.";return}l.innerHTML=n.length>0?n.map(t=>`
            <div class="note-item">
                <div class="note-date">${new Date(t.created_at).toLocaleString()}</div>
                <div>${t.nota}</div>
            </div>
        `).join(""):"Sin notas registradas."}document.getElementById("save-note").onclick=async()=>{const e=m.innerText||m.value;if(e.trim())try{I();const{error:n}=await r.from("tenant_notas").insert({tenant_id:u,nota:e});if(n)throw n;s("Nota guardada","success"),m.value="",p(u)}catch(n){console.error(n),s("Error guardando nota.","error")}finally{y()}};document.getElementById("close-modal").onclick=()=>b.classList.add("hidden");document.getElementById("logout-btn").onclick=async()=>{await h.auth.signOut(),window.location.href="../login.html"};_();
