import{b as j,s as v}from"./supabase-BhLaWdlr.js";/* empty css               */import"./layout-YRXWQU3g.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";let y=null,I=null,M=null;function O(){const t=new Date,a=new Date;return a.setDate(t.getDate()-30),{from:a.toISOString().slice(0,10),to:t.toISOString().slice(0,10)}}const V=[{id:"ventas-periodo",label:"Ventas del período",icon:"fas fa-chart-line",tipos:["veterinaria","tienda"],render:H},{id:"productos-top",label:"Productos más vendidos",icon:"fas fa-trophy",tipos:["veterinaria","tienda"],render:q},{id:"ingresos-costos",label:"Ingresos vs Costos",icon:"fas fa-balance-scale",tipos:["veterinaria","tienda"],render:N},{id:"stock-bajo",label:"Stock bajo",icon:"fas fa-exclamation-triangle",tipos:["veterinaria","tienda"],render:z},{id:"clientes-nuevos",label:"Clientes nuevos",icon:"fas fa-user-plus",tipos:["veterinaria"],onlyVet:!0,render:F},{id:"mascotas-atendidas",label:"Mascotas atendidas",icon:"fas fa-paw",tipos:["veterinaria"],onlyVet:!0,render:G},{id:"vacunas-proximas",label:"Vacunas próximas",icon:"fas fa-syringe",tipos:["veterinaria"],onlyVet:!0,render:U}];function P(){const t=document.getElementById("date-from").value,a=document.getElementById("date-to").value;return{from:t,to:a}}function p(t){if(!t)return"-";const[a,e,o]=t.split("T")[0].split("-");return`${o}/${e}/${a}`}function D(t){return"$ "+Number(t||0).toLocaleString("es-AR",{minimumFractionDigits:0})}function B(){y&&(y.destroy(),y=null)}const $={primary:"#006090",secondary:"#00a884",danger:"#ef4444",warning:"#f59e0b",muted:"#94a3b8",gradBlue:["rgba(0,96,144,0.18)","rgba(0,96,144,0)"],gradGreen:["rgba(0,168,132,0.18)","rgba(0,168,132,0)"]};function A(t,a){const e=t.createLinearGradient(0,0,0,300);return e.addColorStop(0,a[0]),e.addColorStop(1,a[1]),e}function k(){document.getElementById("report-content").innerHTML=`
        <div class="report-loading">
            <i class="fas fa-circle-notch"></i> Cargando reporte...
        </div>`}function w(t="Sin datos para el período seleccionado."){document.getElementById("report-content").innerHTML=`
        <div class="report-empty">
            <i class="fas fa-inbox"></i>
            <p>${t}</p>
        </div>`}function S(){document.getElementById("report-content").innerHTML=`
        <div class="report-empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error al cargar el reporte. Verificá tu conexión.</p>
        </div>`}function x(t){const a=document.getElementById("report-content");a.innerHTML=t,a.style.display="block"}function E(t,a,e,o=!1){return`
        <div class="report-header">
            <div class="report-header-icon"><i class="${t}"></i></div>
            <div>
                <h2>${a}${o?'<span class="vet-badge-inline"><i class="fas fa-stethoscope"></i> Solo Veterinaria</span>':""}</h2>
                <p>${e}</p>
            </div>
        </div>`}function C(t){return`<div class="report-stats-row">${t.map(e=>`
        <div class="report-stat ${e.cls||""}">
            <span class="r-label">${e.label}</span>
            <span class="r-value">${e.value}</span>
        </div>`).join("")}</div>`}async function H(t,a){k();try{const{data:e,error:o}=await v.from("ventas").select("fecha, total").gte("fecha",t).lte("fecha",a).order("fecha",{ascending:!0});if(o)throw o;if(!e||e.length===0){w();return}const s={};e.forEach(c=>{const m=c.fecha.slice(0,10);s[m]=(s[m]||0)+parseFloat(c.total||0)});const r=Object.keys(s),l=Object.values(s),d=l.reduce((c,m)=>c+m,0),f=d/r.length,i=Math.max(...l);x(`
            ${E("fas fa-chart-line","Ventas del período",`${p(t)} — ${p(a)}`)}
            ${C([{label:"Total facturado",value:D(d),cls:"highlight"},{label:"Promedio / día",value:D(f)},{label:"Mejor día",value:D(i),cls:"green"},{label:"Días con ventas",value:r.length}])}
            <div class="chart-wrap"><canvas id="chart-canvas"></canvas></div>
        `),B();const n=document.getElementById("chart-canvas").getContext("2d");y=new Chart(n,{type:"line",data:{labels:r.map(c=>p(c)),datasets:[{label:"Ventas ($)",data:l,borderColor:$.primary,backgroundColor:A(n,$.gradBlue),borderWidth:2.5,fill:!0,tension:.4,pointBackgroundColor:$.primary,pointRadius:4,pointHoverRadius:7}]},options:L("$")})}catch(e){console.error(e),S()}}async function q(t,a){k();try{const{data:e,error:o}=await v.from("ventas").select("id, fecha, venta_items(cantidad, producto:products(nombre))").gte("fecha",t).lte("fecha",a);if(o)throw o;const s={};(e||[]).forEach(i=>{(i.venta_items||[]).forEach(n=>{var m;const c=((m=n.producto)==null?void 0:m.nombre)||"Desconocido";s[c]=(s[c]||0)+parseInt(n.cantidad||0)})});const r=Object.entries(s).sort((i,n)=>n[1]-i[1]).slice(0,10);if(r.length===0){w();return}const l=r.map(([i])=>i),d=r.map(([,i])=>i);x(`
            ${E("fas fa-trophy","Productos más vendidos",`Top 10 · ${p(t)} — ${p(a)}`)}
            ${C([{label:"#1 Producto",value:l[0],cls:"highlight"},{label:"Unidades (top 1)",value:d[0]},{label:"Productos distintos",value:r.length}])}
            <div class="chart-wrap"><canvas id="chart-canvas"></canvas></div>
        `),B();const f=document.getElementById("chart-canvas").getContext("2d");y=new Chart(f,{type:"bar",data:{labels:l,datasets:[{label:"Unidades vendidas",data:d,backgroundColor:l.map((i,n)=>n===0?$.primary:`rgba(0,96,144,${.7-n*.05})`),borderRadius:8,borderSkipped:!1}]},options:{...L(""),indexAxis:"y",plugins:{legend:{display:!1},tooltip:{callbacks:{label:i=>`${i.raw} unidades`}}}}})}catch(e){console.error(e),S()}}async function N(t,a){k();try{let s=function(u,g){const h={};return(u||[]).forEach(T=>{const _=(T.fecha||"").slice(0,7);h[_]=(h[_]||0)+parseFloat(T[g]||0)}),h};const[e,o]=await Promise.all([v.from("ventas").select("fecha, total").gte("fecha",t).lte("fecha",a),v.from("costos").select("fecha, monto").gte("fecha",t).lte("fecha",a)]);if(e.error)throw e.error;if(o.error)throw o.error;const r=s(e.data,"total"),l=s(o.data,"monto"),d=[...new Set([...Object.keys(r),...Object.keys(l)])].sort();if(d.length===0){w();return}const f=d.map(u=>r[u]||0),i=d.map(u=>l[u]||0),n=f.reduce((u,g)=>u+g,0),c=i.reduce((u,g)=>u+g,0),m=n-c;x(`
            ${E("fas fa-balance-scale","Ingresos vs Costos",`${p(t)} — ${p(a)}`)}
            ${C([{label:"Total ingresos",value:D(n),cls:"green"},{label:"Total costos",value:D(c),cls:"red"},{label:"Resultado neto",value:D(m),cls:m>=0?"highlight":"red"}])}
            <div class="comparison-legend">
                <div class="legend-dot"><span style="background:#006090"></span> Ingresos</div>
                <div class="legend-dot"><span style="background:#ef4444"></span> Costos</div>
            </div>
            <div class="chart-wrap"><canvas id="chart-canvas"></canvas></div>
        `),B();const b=document.getElementById("chart-canvas").getContext("2d");y=new Chart(b,{type:"bar",data:{labels:d.map(u=>{const[g,h]=u.split("-");return`${h}/${g}`}),datasets:[{label:"Ingresos",data:f,backgroundColor:"rgba(0,96,144,0.8)",borderRadius:8,borderSkipped:!1},{label:"Costos",data:i,backgroundColor:"rgba(239,68,68,0.75)",borderRadius:8,borderSkipped:!1}]},options:L("$")})}catch(e){console.error(e),S()}}async function z(){k();try{const{data:t,error:a}=await v.from("products").select("nombre, stock, stock_minimo, categoria").lte("stock",v.rpc?void 0:0).order("stock",{ascending:!0}),e=(t||[]).filter(s=>s.stock<=(s.stock_minimo??5));if(a)throw a;if(!t){w();return}const o=e.length>0?e.map(s=>{const r=s.stock===0?"critical":"warning",l=s.stock===0?"Sin stock":"Stock bajo";return`
                <tr>
                    <td><strong>${s.nombre}</strong></td>
                    <td>${s.categoria||"-"}</td>
                    <td><span class="stock-badge ${r}"><i class="fas fa-circle" style="font-size:0.5rem"></i>${l}</span></td>
                    <td style="font-weight:800;color:${s.stock===0?"#dc2626":"#d97706"}">${s.stock}</td>
                    <td>${s.stock_minimo??5}</td>
                </tr>`}).join(""):'<tr><td colspan="5" style="text-align:center;padding:30px;color:#cbd5e1">✓ Todo el stock está en niveles correctos</td></tr>';x(`
            ${E("fas fa-exclamation-triangle","Stock bajo","Productos que necesitan reposición inmediata")}
            ${C([{label:"Sin stock",value:e.filter(s=>s.stock===0).length,cls:"red"},{label:"Stock bajo",value:e.filter(s=>s.stock>0).length,cls:"highlight"},{label:"Total a reponer",value:e.length}])}
            <div class="table-card-premium" style="border-radius:12px">
                <table class="low-stock-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Estado</th>
                            <th>Stock actual</th>
                            <th>Stock mínimo</th>
                        </tr>
                    </thead>
                    <tbody>${o}</tbody>
                </table>
            </div>
        `)}catch(t){console.error(t),S()}}async function F(t,a){k();try{const{data:e,error:o}=await v.from("clients").select("id, nombre, apellido, email, created_at").gte("created_at",t).lte("created_at",a+"T23:59:59").order("created_at",{ascending:!1});if(o)throw o;if(!e||e.length===0){w("No se registraron clientes en el período.");return}const s=e.map(r=>`
            <div class="simple-list-item">
                <div class="item-icon"><i class="fas fa-user"></i></div>
                <div class="item-info">
                    <div class="item-name">${r.nombre} ${r.apellido||""}</div>
                    <div class="item-sub">${r.email||"Sin email"}</div>
                </div>
                <span class="item-date">${p(r.created_at)}</span>
            </div>`).join("");x(`
            ${E("fas fa-user-plus","Clientes nuevos",`${p(t)} — ${p(a)}`,!0)}
            ${C([{label:"Nuevos clientes",value:e.length,cls:"highlight"},{label:"Promedio / semana",value:(e.length/Math.max(1,Math.ceil((new Date(a)-new Date(t))/6048e5))).toFixed(1)}])}
            <div class="simple-list">${s}</div>
        `)}catch(e){console.error(e),S()}}async function G(t,a){k();try{const{data:e,error:o}=await v.from("appointments").select("id, fecha, motivo, mascota:pets(nombre, especie), cliente:clients(nombre, apellido)").gte("fecha",t).lte("fecha",a).eq("estado","realizada").order("fecha",{ascending:!1});if(o)throw o;if(!e||e.length===0){w("No hay consultas realizadas en el período.");return}const s={};e.forEach(i=>{var c;const n=((c=i.mascota)==null?void 0:c.especie)||"Desconocida";s[n]=(s[n]||0)+1});const r=Object.keys(s),l=Object.values(s),d=e.slice(0,15).map(i=>{var n,c,m,b;return`
            <div class="simple-list-item">
                <div class="item-icon"><i class="fas fa-paw"></i></div>
                <div class="item-info">
                    <div class="item-name">${((n=i.mascota)==null?void 0:n.nombre)||"Sin nombre"} <small style="color:#94a3b8;font-weight:500">(${((c=i.mascota)==null?void 0:c.especie)||"?"})</small></div>
                    <div class="item-sub">${((m=i.cliente)==null?void 0:m.nombre)||""} ${((b=i.cliente)==null?void 0:b.apellido)||""} · ${i.motivo||""}</div>
                </div>
                <span class="item-date">${p(i.fecha)}</span>
            </div>`}).join("");x(`
            ${E("fas fa-paw","Mascotas atendidas",`${p(t)} — ${p(a)}`,!0)}
            ${C([{label:"Consultas realizadas",value:e.length,cls:"highlight"},...r.map(i=>({label:i,value:s[i]}))])}
            <div class="chart-wrap" style="height:220px;margin-bottom:24px"><canvas id="chart-canvas"></canvas></div>
            <div class="simple-list">${d}</div>
        `),B();const f=document.getElementById("chart-canvas").getContext("2d");y=new Chart(f,{type:"doughnut",data:{labels:r,datasets:[{data:l,backgroundColor:[$.primary,$.secondary,$.warning,"#8b5cf6","#ec4899"],borderWidth:2,borderColor:"#fff"}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"right",labels:{font:{size:12,weight:"700"},padding:16}}}}})}catch(e){console.error(e),S()}}async function U(){k();try{let l=function(n){return Math.ceil((new Date(n)-t)/864e5)<=7?"urgent":"soon"},d=function(n){return Math.ceil((new Date(n)-t)/864e5)};const t=new Date,a=new Date;a.setDate(t.getDate()+30);const e=t.toISOString().slice(0,10),o=a.toISOString().slice(0,10),{data:s,error:r}=await v.from("vaccines").select("id, nombre_vacuna, proxima_dosis, mascota:pets(nombre, especie), cliente:clients(nombre, apellido)").gte("proxima_dosis",e).lte("proxima_dosis",o).order("proxima_dosis",{ascending:!0});if(r)throw r;if(!s||s.length===0){w("No hay vacunas próximas a vencer en los próximos 30 días. ✓");return}const f=s.filter(n=>d(n.proxima_dosis)<=7).length,i=s.map(n=>{var b,u,g,h;const c=d(n.proxima_dosis),m=l(n.proxima_dosis);return`
            <div class="simple-list-item">
                <div class="item-icon" style="background:${m==="urgent"?"#ef4444":"var(--grad-primary)"}">
                    <i class="fas fa-syringe"></i>
                </div>
                <div class="item-info">
                    <div class="item-name">${n.nombre_vacuna}</div>
                    <div class="item-sub">
                        ${((b=n.mascota)==null?void 0:b.nombre)||"?"} (${((u=n.mascota)==null?void 0:u.especie)||"?"}) · ${((g=n.cliente)==null?void 0:g.nombre)||""} ${((h=n.cliente)==null?void 0:h.apellido)||""}
                    </div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                    <span class="vaccine-alert ${m}">
                        ${c===0?"Hoy":`en ${c} día${c!==1?"s":""}`}
                    </span>
                    <div class="item-date" style="margin-top:3px">${p(n.proxima_dosis)}</div>
                </div>
            </div>`}).join("");x(`
            ${E("fas fa-syringe","Vacunas próximas a vencer","Próximos 30 días",!0)}
            ${C([{label:"Vencen esta semana",value:f,cls:f>0?"red":""},{label:"Total próximas",value:s.length,cls:"highlight"}])}
            <div class="simple-list">${i}</div>
        `)}catch(t){console.error(t),S()}}function L(t="$"){return{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{labels:{font:{size:12,weight:"700"},padding:20}},tooltip:{callbacks:{label:a=>t?`${t} ${Number(a.raw).toLocaleString("es-AR",{minimumFractionDigits:0})}`:`${a.raw}`}}},scales:{x:{grid:{color:"#f1f5f9"},ticks:{font:{size:11},color:"#94a3b8"}},y:{grid:{color:"#f1f5f9"},ticks:{font:{size:11},color:"#94a3b8",callback:a=>t?`${t}${Number(a).toLocaleString("es-AR",{minimumFractionDigits:0})}`:a}}}}}function W(t){const a=document.getElementById("report-tabs");a.innerHTML="",V.forEach(e=>{if(!e.tipos.includes(t))return;const o=document.createElement("button");o.className="report-tab-btn",o.dataset.id=e.id,o.innerHTML=`<i class="${e.icon}"></i> ${e.label}${e.onlyVet?'<span class="badge-only-vet">Vet</span>':""}`,o.addEventListener("click",()=>R(e)),a.appendChild(o)})}async function R(t){I=t,document.querySelectorAll(".report-tab-btn").forEach(s=>{s.classList.toggle("active",s.dataset.id===t.id)}),document.getElementById("report-placeholder").style.display="none";const a=document.getElementById("report-content");a.style.display="block",B();const{from:e,to:o}=P();await t.render(e,o)}async function J(){var e;const{from:t,to:a}=O();document.getElementById("date-from").value=t,document.getElementById("date-to").value=a,M=await j()||"veterinaria",W(M),document.getElementById("btn-apply-dates").addEventListener("click",()=>{I&&R(I)}),document.querySelectorAll(".quick-btn").forEach(o=>{o.addEventListener("click",()=>{document.querySelectorAll(".quick-btn").forEach(d=>d.classList.remove("active")),o.classList.add("active");const s=parseInt(o.dataset.range),r=new Date,l=new Date;l.setDate(r.getDate()-s),document.getElementById("date-from").value=l.toISOString().slice(0,10),document.getElementById("date-to").value=r.toISOString().slice(0,10),I&&R(I)})}),(e=document.querySelector('.quick-btn[data-range="30"]'))==null||e.classList.add("active")}document.addEventListener("DOMContentLoaded",J);
