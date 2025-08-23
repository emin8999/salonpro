import { db } from './storage.js';
import { uid, fmtMoney } from './utils.js';

let current = { id: uid(), clientId: null, items: [], discount:0, taxes:0 };

function getCurrency(){ return db.getSettings()?.currency || 'USD' }

function render(){
  const cur = getCurrency();
  const tbody = document.querySelector('#pos-items tbody');
  tbody.innerHTML = current.items.map((it, idx)=>`
    <tr>
      <td>${idx+1}</td>
      <td>${it.name}</td>
      <td>1</td>
      <td>${fmtMoney(it.price, cur)}</td>
      <td><button class="btn danger" data-del="${idx}">×</button></td>
    </tr>
  `).join('') || `<tr><td colspan="5" class="small">Пока пусто. Добавьте услуги справа.</td></tr>`;

  tbody.querySelectorAll('button[data-del]').forEach(b=>{
    b.onclick = ()=>{ current.items.splice(Number(b.dataset.del),1); render() };
  });

  const subtotal = current.items.reduce((s,it)=>s+it.price,0);
  const taxPercent = Number(db.getSettings()?.taxPercent||0);
  const taxes = subtotal * (taxPercent/100);
  const total = subtotal - current.discount + taxes;

  document.getElementById('pos-subtotal').textContent = fmtMoney(subtotal, cur);
  document.getElementById('pos-taxes').textContent = fmtMoney(taxes, cur);
  document.getElementById('pos-total').textContent = fmtMoney(total, cur);
}

function loadFromAppointment(){
  const url = new URL(location.href);
  const apptId = url.searchParams.get('appointmentId');
  if(!apptId) return;
  const appt = db.listAppointments().find(a=>a.id===apptId);
  if(!appt) return;
  current.clientId = appt.clientId;
  current.items = (appt.serviceIds||[]).map(id=>{
    const s = db.listServices().find(x=>x.id===id);
    return {serviceId:id, name:s?.name||'Service', price: s?.price||0};
  });
}

function printReceipt(order, mode='80'){
  const cur = getCurrency();
  const w = window.open('', 'PRINT', 'height=800,width=520');
  const salon = db.getSettings()?.salonName || 'My Salon';
  const rows = order.items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.name}</td><td style="text-align:right">${fmtMoney(it.price, cur)}</td></tr>`).join('');
  const cls = mode==='58' ? 'print58' : (mode==='pad' ? 'printpad' : 'print80');
  const note = mode==='pad' ? '<div style="margin-top:10px">Подпись: ________  Печать: ________</div>' : '';
  w.document.write(`
    <html><head><title>Receipt</title><link rel="stylesheet" href="../css/base.css"/></head>
    <body>
      <div class="${cls} receipt">
        <h3>${salon}</h3>
        <div>#${order.id}</div>
        <div>${new Date(order.paidAt).toLocaleString()}</div>
        <hr/>
        <table>
          <thead><tr><th>#</th><th>Item</th><th style="text-align:right">Price</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">Total: ${fmtMoney(order.total, cur)}</div>
        <div>Pay: ${order.paymentMethod}</div>
        ${note}
        <p style="margin-top:8px;text-align:center">Спасибо!</p>
      </div>
      <script>window.print(); setTimeout(()=>window.close(), 400);<\/script>
    </body></html>
  `);
  w.document.close(); w.focus();
}

export function initPOS(){
  loadFromAppointment();
  // services list
  const list = document.getElementById('pos-services');
  list.innerHTML = db.listServices().filter(s=>s.isActive!==false).map(s=>`
    <div class="card">
      <div><b>${s.name}</b></div>
      <div class="small">${s.durationMin} мин</div>
      <div class="row mt8">
        <button class="btn primary" data-add="${s.id}">+ Добавить (${s.price})</button>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('button[data-add]').forEach(btn=>{
    btn.onclick = ()=>{
      const s = db.listServices().find(x=>x.id===btn.dataset.add);
      current.items.push({serviceId:s.id, name:s.name, price:s.price});
      render();
    };
  });

  // clients select
  const sel = document.getElementById('pos-client');
  sel.innerHTML = `<option value="">— без клиента —</option>` + db.listClients().map(c=>`<option value="${c.id}" ${current.clientId===c.id?'selected':''}>${c.fullName}</option>`).join('');
  sel.onchange = ()=>{ current.clientId = sel.value || null };

  // payment buttons
  document.querySelectorAll('[data-pay]').forEach(btn=>{
    btn.onclick = ()=>{
      const method = btn.dataset.pay;
      const subtotal = current.items.reduce((s,it)=>s+it.price,0);
      const taxPercent = Number(db.getSettings()?.taxPercent||0);
      const taxes = subtotal * (taxPercent/100);
      const total = subtotal - current.discount + taxes;
      const order = {
        id: uid().slice(-8),
        clientId: current.clientId || null,
        items: current.items.slice(),
        total,
        paymentMethod: method,
        paidAt: new Date().toISOString()
      };
      const orders = db.listOrders(); orders.unshift(order); db.saveOrders(orders);
      // update appointment if coming from it
      const apptId = new URL(location.href).searchParams.get('appointmentId');
      if(apptId){
        const appts = db.listAppointments().map(a=> a.id===apptId ? {...a, status:'completed'} : a );
        db.saveAppointments(appts);
      }
      // print options
      const mode = document.querySelector('input[name="print-mode"]:checked')?.value || '80';
      printReceipt(order, mode);
      current = { id: uid(), clientId: null, items: [], discount:0, taxes:0 };
      render();
    };
  });

  render();
}
