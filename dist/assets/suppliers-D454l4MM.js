import{g as d,s as i}from"./supabase-lXe-AwSI.js";/* empty css               */import"./layout-y6UUTfZb.js";import{s as c,a as r,h as u}from"./ui-sLR7WWXu.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";let s=[],l="";async function p(){if(console.log("Suppliers module initializing..."),!document.getElementById("suppliers-list")){setTimeout(p,100);return}await m(),document.getElementById("search-supplier").placeholder="Buscar por empresa, nombre o categoría...",document.getElementById("search-supplier").oninput=o=>{l=o.target.value.toLowerCase(),g()},document.getElementById("form-supplier").onsubmit=f}async function m(){try{c();const t=await d(),{data:o,error:e}=await i.from("suppliers").select("*").eq("tenant_id",t).order("razon_social",{ascending:!0});if(e)throw e;s=o||[],g()}catch(t){console.error(t),r("Error al cargar proveedores","error")}finally{u()}}function g(){const t=document.getElementById("suppliers-list"),o=s.filter(e=>e.razon_social.toLowerCase().includes(l)||e.rubro&&e.rubro.toLowerCase().includes(l)||e.contacto&&e.contacto.toLowerCase().includes(l));if(o.length===0){t.innerHTML='<tr><td colspan="6" style="text-align:center; padding: 40px; color: #94a3b8;">No se encontraron proveedores.</td></tr>';return}t.innerHTML=o.map(e=>`
        <tr>
            <td>
                <span class="supp-name-cell">${e.razon_social}</span>
            </td>
            <td><span class="rubro-badge">${e.rubro||"-"}</span></td>
            <td>
                <span class="contact-pill"><i class="fas fa-id-badge"></i> ${e.contacto||"-"}</span>
            </td>
            <td>
                <div class="contact-pill"><i class="fas fa-phone"></i> ${e.telefono||"-"}</div>
            </td>
            <td>
                <a href="mailto:${e.email}" class="info-link">${e.email||"-"}</a>
            </td>
            <td style="text-align: right;">
                <button class="btn-circular" onclick="window.openEditModal(event, '${e.id}')" title="Editar"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join("")}window.openSupplierModal=(t=null)=>{if(document.getElementById("form-supplier").reset(),document.getElementById("supp-id").value="",document.getElementById("modal-title").innerText=t?"Editar Registro":"Nuevo Registro",t){const e=s.find(a=>a.id===t);e&&(document.getElementById("supp-id").value=e.id,document.getElementById("supp-razon").value=e.razon_social,document.getElementById("supp-cuit").value=e.cuit||"",document.getElementById("supp-rubro").value=e.rubro||"",document.getElementById("supp-tel").value=e.telefono||"",document.getElementById("supp-email").value=e.email||"",document.getElementById("supp-contacto").value=e.contacto||"",document.getElementById("supp-obs").value=e.observaciones||"")}document.getElementById("modal-supplier").classList.add("active")};window.openEditModal=(t,o)=>{t.stopPropagation(),window.openSupplierModal(o)};async function f(t){if(t.preventDefault(),!t.target.checkValidity()){t.target.reportValidity();return}try{c();const o=document.getElementById("supp-id").value,a={tenant_id:await d(),razon_social:document.getElementById("supp-razon").value,rubro:document.getElementById("supp-rubro").value,telefono:document.getElementById("supp-tel").value,email:document.getElementById("supp-email").value,contacto:document.getElementById("supp-contacto").value,observaciones:document.getElementById("supp-obs").value};if(o){const{error:n}=await i.from("suppliers").update(a).eq("id",o);if(n)throw n;r("Proveedor actualizado exitosamente","success")}else{const{error:n}=await i.from("suppliers").insert(a);if(n)throw n;r("Proveedor creado exitosamente","success")}window.closeModal("modal-supplier"),m()}catch(o){console.error(o),r("Error al guardar proveedor: "+o.message,"error")}finally{u()}}window.addEventListener("layoutReady",()=>p());
