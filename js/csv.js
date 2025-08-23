import { download } from './utils.js';
import { db } from './storage.js';

function toCSV(rows){
  if(!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v)=> {
    if(v==null) return '';
    const s = String(v).replace(/"/g,'""');
    return `"${s}"`;
  };
  return [headers.join(','), ...rows.map(r=> headers.map(h=>escape(r[h])).join(','))].join('\n');
}

export function exportOrdersCSV(){
  const cur = db.getSettings()?.currency || 'USD';
  const clients = db.listClients();
  const rows = db.listOrders().map(o=> ({
    id: o.id,
    paidAt: o.paidAt,
    client: clients.find(c=>c.id===o.clientId)?.fullName || '',
    payment: o.paymentMethod,
    total: o.total,
    items: o.items.map(x=>x.name).join(' | ')
  }));
  download('orders.csv', toCSV(rows));
}
export function exportClientsCSV(){
  const rows = db.listClients().map(c=> ({
    id:c.id, fullName:c.fullName, phone:c.phone||'', email:c.email||'', visits:c.visitsCount||0, lastVisit:c.lastVisitAt||''
  }));
  download('clients.csv', toCSV(rows));
}
export function exportServicesCSV(){
  const rows = db.listServices().map(s=> ({
    id:s.id, name:s.name, category:s.category||'', durationMin:s.durationMin, price:s.price, active:(s.isActive!==false)
  }));
  download('services.csv', toCSV(rows));
}
