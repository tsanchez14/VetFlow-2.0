import{g as l,s as d}from"./supabase-aFjTYcVQ.js";/* empty css               */import"./layout-F7RC0PEP.js";import{s as w,a as p,h}from"./ui-sLR7WWXu.js";import"https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";let c=[],y=[];async function b(){if(console.log("Sales module initializing..."),!document.getElementById("cart-items")){setTimeout(b,100);return}const t=await l(),{data:a}=await d.from("tenants").select("*").eq("id",t).single();a.tipo!=="veterinaria"?document.getElementById("client-container").style.display="none":_(),v(),document.getElementById("pos-search-input").oninput=T,document.getElementById("hist-date-from").onchange=m,document.getElementById("hist-date-to").onchange=m,document.getElementById("hist-status").onchange=m;const n=new Date().toISOString().split("T")[0];document.getElementById("hist-date-from").value=n,document.getElementById("hist-date-to").value=n,m()}async function _(){const e=await l(),{data:t}=await d.from("clients").select("id, nombre, apellido").eq("tenant_id",e);if(t){const a=document.getElementById("sale-client");t.forEach(n=>{const o=document.createElement("option");o.value=n.id,o.textContent=`${n.nombre} ${n.apellido}`,a.appendChild(o)})}}async function v(){const e=await l(),{data:t}=await d.from("products").select("*").eq("tenant_id",e);y=t||[]}function T(e){const t=e.target.value.toLowerCase(),a=document.getElementById("pos-search-results");if(t.length<2){a.innerHTML="";return}const n=y.filter(o=>o.nombre.toLowerCase().includes(t)||o.codigo&&o.codigo.toLowerCase().includes(t));a.innerHTML=n.map(o=>`
        <div class="search-item" onclick="window.addToCart('${o.id}')">
            <div>
                <div class="name">${o.nombre}</div>
                <div class="stock">Stock: ${o.stock_actual} | Código: ${o.codigo||"-"}</div>
            </div>
            <div class="price">$${o.precio_venta}</div>
        </div>
    `).join("")}window.addToCart=e=>{const t=y.find(n=>n.id===e);if(!t)return;const a=c.find(n=>n.productId===e);a?a.qty++:c.push({productId:t.id,name:t.nombre,price:t.precio_venta,qty:1,isService:!1}),document.getElementById("pos-search-input").value="",document.getElementById("pos-search-results").innerHTML="",g()};window.addManualItem=()=>{const e=document.getElementById("manual-desc").value,t=parseFloat(document.getElementById("manual-price").value);!e||isNaN(t)||(c.push({productId:null,name:e,price:t,qty:1,isService:!0}),document.getElementById("manual-desc").value="",document.getElementById("manual-price").value="",g())};function g(){const e=document.getElementById("cart-items"),t=document.getElementById("empty-cart-msg");if(c.length===0){e.innerHTML="",t.style.display="block",I();return}t.style.display="none",e.innerHTML=c.map((a,n)=>`
        <tr>
            <td style="font-weight: 700;">${a.name}</td>
            <td>
                <input type="number" class="cart-qty-input" value="${a.qty}" onchange="window.updateCartQty(${n}, this.value)">
            </td>
            <td>
                <input type="number" class="cart-price-input" value="${a.price}" onchange="window.updateCartPrice(${n}, this.value)">
            </td>
            <td style="font-weight: 800;">$${(a.qty*a.price).toLocaleString()}</td>
            <td>
                <button class="btn-remove-item" onclick="window.removeFromCart(${n})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join(""),I()}window.updateCartQty=(e,t)=>{c[e].qty=parseFloat(t)||0,g()};window.updateCartPrice=(e,t)=>{c[e].price=parseFloat(t)||0,g()};window.removeFromCart=e=>{c.splice(e,1),g()};function I(){const e=c.reduce((t,a)=>t+a.qty*a.price,0);document.getElementById("total-display").innerText=`$${e.toLocaleString()}`}window.confirmSale=async()=>{var t;if(c.length===0)return;const e=document.getElementById("btn-confirm-sale");e.disabled=!0,e.innerHTML='<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';try{w();const a=await l(),n=((t=document.getElementById("sale-client"))==null?void 0:t.value)||null,o=c.reduce((s,f)=>s+f.qty*f.price,0),r=document.getElementById("sale-payment-method").value,{data:i,error:u}=await d.from("sales").insert({tenant_id:a,client_id:n,total:o,medio_pago:r,estado:"pagado"}).select().single();if(u)throw u;for(const s of c)if(await d.from("sale_items").insert({tenant_id:a,sale_id:i.id,product_id:s.productId,descripcion:s.name,cantidad:s.qty,precio_unitario:s.price,subtotal:s.qty*s.price}),s.productId){const E=(y.find($=>$.id===s.productId).stock_actual||0)-s.qty;await d.from("products").update({stock_actual:E}).eq("id",s.productId),await d.from("stock_movimientos").insert({tenant_id:a,product_id:s.productId,tipo:"venta",cantidad:-s.qty,observacion:`Venta #${i.id.substring(0,8)}`})}p("Venta confirmada exitosamente!","success"),c=[],g(),v(),m()}catch(a){console.error(a),p("Error al procesar venta: "+a.message,"error")}finally{e.disabled=!1,e.innerHTML='<i class="fas fa-check-circle"></i> CONFIRMAR VENTA',h()}};async function m(){try{w();const e=await l(),t=document.getElementById("hist-date-from").value,a=document.getElementById("hist-date-to").value+"T23:59:59",n=document.getElementById("hist-status").value;let o=d.from("sales").select("*, clients(nombre, apellido)").eq("tenant_id",e).gte("fecha",t).lte("fecha",a).order("fecha",{ascending:!1});n&&(o=o.eq("estado",n));const{data:r,error:i}=await o;if(i)throw i;const u=document.getElementById("history-list");if(!r||r.length===0){u.innerHTML='<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay ventas en este período.</td></tr>';return}u.innerHTML=r.map(s=>`
            <tr onclick="window.viewSaleDetail('${s.id}')">
                <td>
                    <span class="history-date">${new Date(s.fecha).toLocaleDateString()}</span><br>
                    <small style="color: #cbd5e1;">${new Date(s.fecha).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} hs</small>
                </td>
                <td>
                    <span class="history-client">${s.clients?s.clients.nombre+" "+s.clients.apellido:"Consumidor Final"}</span>
                    <small style="color: #94a3b8;">${s.id.substring(0,8).toUpperCase()}</small>
                </td>
                <td><span class="history-total">$${s.total.toLocaleString()}</span></td>
                <td><span class="badge-method">${s.medio_pago}</span></td>
                <td><span class="badge-status ${s.estado}">${s.estado}</span></td>
                <td style="text-align: right;"><button class="btn btn-outline btn-sm"><i class="fas fa-eye"></i></button></td>
            </tr>
        `).join("")}catch(e){console.error(e),p("Error al cargar historial","error")}finally{h()}}window.viewSaleDetail=async e=>{const t=await l(),{data:a}=await d.from("sales").select("*, sale_items(*)").eq("id",e).eq("tenant_id",t).single();if(!a)return;const n=document.getElementById("modal-sale-detail"),o=document.getElementById("sale-detail-content"),r=document.getElementById("modal-sale-footer");o.innerHTML=`
        <div style="margin-bottom: 20px;">
            <p><strong>Fecha:</strong> ${new Date(a.fecha).toLocaleString()}</p>
            <p><strong>Medio de Pago:</strong> ${a.medio_pago.toUpperCase()}</p>
            <p><strong>Estado:</strong> ${a.estado.toUpperCase()}</p>
        </div>
        <table class="cart-table">
            <thead>
                <tr><th>Item</th><th>Cant.</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
                ${a.sale_items.map(i=>`
                    <tr>
                        <td>${i.descripcion}</td>
                        <td>${i.cantidad}</td>
                        <td>$${i.subtotal.toLocaleString()}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
        <h3 style="text-align: right; margin-top: 20px;">TOTAL: $${a.total.toLocaleString()}</h3>
    `,r.innerHTML=a.estado==="pagado"?`
        <button class="btn btn-outline" style="color: #ef4444; border-color: #ef4444; width: 100%; margin-top: 20px;" onclick="window.annulSale('${a.id}')">
            <i class="fas fa-ban"></i> ANULAR VENTA Y RESTAURAR STOCK
        </button>
    `:"",n.style.display="flex"};window.annulSale=async e=>{if(confirm("¿Seguro que deseás anular esta venta? El stock se restaurará."))try{w();const t=await l(),{data:a,error:n}=await d.from("sales").select("*, sale_items(*)").eq("id",e).eq("tenant_id",t).single();if(n)throw n;if(!a)throw new Error("Venta no encontrada o sin autorización");const{error:o}=await d.from("sales").update({estado:"anulado"}).eq("id",e).eq("tenant_id",t);if(o)throw o;for(const r of a.sale_items)if(r.product_id){const{data:i}=await d.from("products").select("stock_actual").eq("id",r.product_id).single(),u=(i.stock_actual||0)+r.cantidad;await d.from("products").update({stock_actual:u}).eq("id",r.product_id),await d.from("stock_movimientos").insert({tenant_id:t,product_id:r.product_id,tipo:"ajuste",cantidad:r.cantidad,observacion:`Anulación Venta #${e.substring(0,8)}`})}p("Venta anulada y stock restaurado.","success"),window.closeModal("modal-sale-detail"),m(),v()}catch(t){console.error(t),p("Error al anular: "+t.message,"error")}finally{h()}};window.loadClosure=async()=>{try{const e=await l(),t=new Date().toISOString().split("T")[0],{data:a,error:n}=await d.from("sales").select("total, medio_pago").eq("tenant_id",e).eq("estado","pagado").gte("fecha",t);if(n)throw n;const o={efectivo:0,tarjeta:0,transferencia:0};let r=0;a&&a.forEach(i=>{o[i.medio_pago]!==void 0&&(o[i.medio_pago]+=i.total),r+=i.total}),document.getElementById("closure-date").innerText=new Date().toLocaleDateString(),document.getElementById("closure-grand-total").innerText=`$${r.toLocaleString()}`,document.getElementById("closure-results").innerHTML=Object.keys(o).map(i=>`
            <div class="closure-card">
                <span class="method">${i}</span>
                <span class="amount">$${o[i].toLocaleString()}</span>
            </div>
        `).join("")}catch(e){console.error(e),p("Error al cargar cierre","error")}};window.addEventListener("layoutReady",()=>{b(),window.loadClosure()});
