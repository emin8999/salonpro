import { renderNav } from './nav.js';
import { db } from './storage.js';
import { ensurePinUnlocked } from './security.js';

export function boot(active){
  renderNav(active);
  const s = db.getSettings();
  const title = document.getElementById('salon-title');
  if(title) title.textContent = s?.salonName || 'Salon';
  document.title = (s?.salonName ? s.salonName+' — ' : '') + document.title;
  ensurePinUnlocked();
}
