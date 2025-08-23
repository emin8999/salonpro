import { db } from './storage.js';
import { fmtMoney } from './utils.js';

export function initDashboard(){
  const services = db.listServices();
  const orders = db.listOrders();
  const appts = db.listAppointments();
  const settings = db.getSettings();
  const cur = settings.currency || 'USD';

  const today = new Date(); const dayKey = today.toISOString().slice(0,10);
  const todaysAppts = appts.filter(a => a.start.slice(0,10)===dayKey);
  const todaysOrders = orders.filter(o => (o.paidAt||'').slice(0,10)===dayKey);
  const visits = todaysAppts.filter(a=>a.status==='completed').length;
  const revenue = todaysOrders.reduce((s,o)=>s+o.total,0);
  const avg = todaysOrders.length? (revenue/todaysOrders.length):0;

  document.getElementById('kpi-visits').textContent = visits;
  document.getElementById('kpi-revenue').textContent = fmtMoney(revenue, cur);
  document.getElementById('kpi-avg').textContent = fmtMoney(avg, cur);

  const list = document.getElementById('upcoming');
  list.innerHTML = todaysAppts.slice(0,5).map(a=>{
    const c = db.listClients().find(c=>c.id===a.clientId);
    const names = (a.serviceIds||[]).map(id=>services.find(s=>s.id===id)?.name).filter(Boolean).join(', ');
    const time = new Date(a.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    return `<div class="card"><div><b>${time}</b> — ${c?.fullName||'—'} <span class="small">(${names})</span></div><div class="small">Статус: ${a.status}</div></div>`;
  }).join('') || `<div class="small">Сегодня записей нет</div>`;
}
