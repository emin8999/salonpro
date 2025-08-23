import { db } from './storage.js';
import { fmtMoney } from './utils.js';

export function initOrders(){
  const tbody = document.querySelector('#orders tbody');
  const cur = db.getSettings()?.currency || 'USD';
  const orders = db.listOrders();
  const q = (document.getElementById('ord-search').value||'').toLowerCase().trim();
  const rows = orders.filter(o=>{
    const s = JSON.stringify(o).toLowerCase();
    return s.includes(q);
  }).map(o=>`
    <tr>
      <td>${o.id}</td>
      <td>${new Date(o.paidAt).toLocaleString()}</td>
      <td>${(db.listClients().find(c=>c.id===o.clientId)?.fullName)||'—'}</td>
      <td>${o.items.map(x=>x.name).join(', ')}</td>
      <td>${fmtMoney(o.total, cur)}</td>
      <td>${o.paymentMethod}</td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="small">Заказы не найдены</td></tr>`;
  tbody.innerHTML = rows;

  document.getElementById('ord-search').oninput = initOrders;
}
