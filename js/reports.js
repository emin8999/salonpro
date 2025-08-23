import { db } from './storage.js';
import { sum, fmtMoney } from './utils.js';
import { exportOrdersCSV, exportClientsCSV, exportServicesCSV } from './csv.js';

export function initReports(){
  const cur = db.getSettings()?.currency || 'USD';
  const orders = db.listOrders();
  const sel = document.getElementById('rep-period');
  const period = sel.value;
  const now = new Date();
  const from = new Date(now);
  if(period==='month') from.setMonth(from.getMonth()-1);
  if(period==='week') from.setDate(from.getDate()-7);
  const filtered = period==='all' ? orders : orders.filter(o => new Date(o.paidAt) >= from);

  const revenue = sum(filtered, o=>o.total);
  const avg = filtered.length ? revenue/filtered.length : 0;
  const visits = filtered.length;
  document.getElementById('rep-revenue').textContent = fmtMoney(revenue, cur);
  document.getElementById('rep-avg').textContent = fmtMoney(avg, cur);
  document.getElementById('rep-visits').textContent = visits;

  const byPay = filtered.reduce((acc,o)=> (acc[o.paymentMethod]=(acc[o.paymentMethod]||0)+o.total, acc), {});
  document.getElementById('rep-split').innerHTML = Object.entries(byPay).map(([k,v])=>`<span class="badge">${k}: ${fmtMoney(v, cur)}</span>`).join(' ') || '<span class="small">Нет данных</span>';

  document.getElementById('exp-orders').onclick = exportOrdersCSV;
  document.getElementById('exp-clients').onclick = exportClientsCSV;
  document.getElementById('exp-services').onclick = exportServicesCSV;
}
