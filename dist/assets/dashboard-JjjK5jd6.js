import{a as S,s as n}from"./supabase-aFjTYcVQ.js";/* empty css               */import"./layout-F7RC0PEP.js";import{s as m,a as u,h as p}from"./ui-sLR7WWXu.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";async function b(){console.log("Dashboard initializing...");const t=await S();if(!t){console.error("Tenant not found for current user");return}if(!document.getElementById("stats-grid")){console.warn("Dashboard containers not found. Layout might be still wrapping. Retrying..."),setTimeout(b,100);return}const r={statsGrid:document.getElementById("stats-grid"),alertsSection:document.getElementById("alerts-section"),mainGrid:document.getElementById("main-grid"),quickActions:document.getElementById("quick-actions")};t.tipo==="veterinaria"?$(t,r):w(t,r)}async function $(t,o){const{statsGrid:r,alertsSection:c,mainGrid:g,quickActions:l}=o,f=new Date().toISOString().split("T")[0];try{m();const[i,s,d]=await Promise.all([n.from("appointments").select("*, pets(nombre)").eq("tenant_id",t.id).gte("fecha_hora",f).order("fecha_hora",{ascending:!0}),n.from("sales").select("*").eq("tenant_id",t.id).order("created_at",{ascending:!1}).limit(5),n.from("products").select("*").eq("tenant_id",t.id)]);if(i.error)throw i.error;if(s.error)throw s.error;const h=d.data?d.data.filter(a=>a.stock_actual<a.stock_minimo):[],v=i.data?i.data.filter(a=>a.estado==="pendiente").length:0;r.innerHTML=`
        <div class="stat-card">
            <div class="stat-icon bg-blue"><i class="fas fa-calendar-check"></i></div>
            <div class="stat-info">
                <h4>Turnos Pendientes</h4>
                <div class="stat-value">${v}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon bg-orange"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="stat-info">
                <h4>Stock Bajo</h4>
                <div class="stat-value">${h.length}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon bg-green"><i class="fas fa-dollar-sign"></i></div>
            <div class="stat-info">
                <h4>Ventas Hoy</h4>
                <div class="stat-value">$${_(s.data)}</div>
            </div>
        </div>
    `,y(h,c),g.innerHTML=`
        <div class="activity-card">
            <h3><i class="fas fa-clock"></i> Próximos Turnos</h3>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr><th>Hora</th><th>Mascota</th><th>Motivo</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                        ${i.data&&i.data.length>0?i.data.slice(0,5).map(a=>{var e;return`
                                <tr>
                                    <td>${new Date(a.fecha_hora).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</td>
                                    <td>${((e=a.pets)==null?void 0:e.nombre)||"N/A"}</td>
                                    <td>${a.motivo||"-"}</td>
                                    <td><span class="badge-vet">${a.estado}</span></td>
                                </tr>
                            `}).join(""):'<tr><td colspan="4">No hay turnos pendientes para hoy.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="activity-card">
            <h3><i class="fas fa-shopping-bag"></i> Últimas Ventas</h3>
            <div class="table-responsive">
                <table>
                    <tbody>
                        ${s.data&&s.data.length>0?s.data.map(a=>`
                                <tr>
                                    <td>${new Date(a.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</td>
                                    <td><strong>$${a.total}</strong></td>
                                </tr>
                            `).join(""):"<tr><td>Sin ventas registradas hoy.</td></tr>"}
                    </tbody>
                </table>
            </div>
        </div>
    `,l&&(l.innerHTML="")}catch(i){console.error("Dashboard error:",i),u("Error al cargar datos del tablero","error")}finally{p()}}async function w(t,o){const{statsGrid:r,alertsSection:c,mainGrid:g,quickActions:l}=o,f=new Date().toISOString().split("T")[0],i=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString();try{m();const[s,d,h]=await Promise.all([n.from("sales").select("total").eq("tenant_id",t.id).gte("created_at",i),n.from("sales").select("*").eq("tenant_id",t.id).order("created_at",{ascending:!1}).limit(5),n.from("products").select("*").eq("tenant_id",t.id)]);if(s.error)throw s.error;const v=h.data?h.data.filter(e=>e.stock_actual<e.stock_minimo):[],a=s.data?s.data.reduce((e,T)=>e+Number(T.total),0):0;r.innerHTML=`
        <div class="stat-card">
            <div class="stat-icon bg-green"><i class="fas fa-chart-line"></i></div>
            <div class="stat-info">
                <h4>Ingresos del Mes</h4>
                <div class="stat-value">$${a.toLocaleString()}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon bg-orange"><i class="fas fa-box-open"></i></div>
            <div class="stat-info">
                <h4>Stock Bajo</h4>
                <div class="stat-value">${v.length}</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon bg-blue"><i class="fas fa-shopping-basket"></i></div>
            <div class="stat-info">
                <h4>Ventas Hoy</h4>
                <div class="stat-value">${d.data?d.data.filter(e=>e.created_at.startsWith(f)).length:0}</div>
            </div>
        </div>
    `,y(v,c),g.innerHTML=`
        <div class="activity-card" style="grid-column: span 2;">
            <h3><i class="fas fa-history"></i> Últimas Ventas</h3>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr><th>Hora</th><th>Fecha</th><th>Total</th><th>Medio de Pago</th></tr>
                    </thead>
                    <tbody>
                        ${d.data&&d.data.length>0?d.data.map(e=>`
                                <tr>
                                    <td>${new Date(e.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</td>
                                    <td>${new Date(e.created_at).toLocaleDateString()}</td>
                                    <td><strong>$${e.total}</strong></td>
                                    <td><span class="badge-vet">${e.medio_pago||"efectivo"}</span></td>
                                </tr>
                            `).join(""):'<tr><td colspan="4">Sin ventas registradas aún.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `,l&&(l.innerHTML="")}catch(s){console.error("Dashboard error:",s),u("Error al cargar datos del tablero","error")}finally{p()}}function y(t,o){if(t.length===0){o.innerHTML="";return}o.innerHTML=`
        <div class="alert-card">
            <div class="alert-content">
                <i class="fas fa-exclamation-circle fa-lg"></i>
                <div>
                    <strong>Alerta de Inventario:</strong> Tenés ${t.length} productos con stock insuficiente.
                </div>
            </div>
            <a href="products.html" class="btn btn-outline btn-sm">Gestionar Stock</a>
        </div>
    `}function _(t){if(!t)return 0;const o=new Date().toISOString().split("T")[0];return t.filter(r=>r.created_at.startsWith(o)).reduce((r,c)=>r+Number(c.total),0)}window.addEventListener("layoutReady",()=>{b()});
