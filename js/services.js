import { db } from './storage.js';
import { uid } from './utils.js';

function render(){
  const list = db.listServices();
  const tbody = document.querySelector('#services tbody');
  const q = (document.getElementById('srv-search').value||'').toLowerCase().trim();
  const rows = list.filter(s=> (s.name||'').toLowerCase().includes(q) || (s.category||'').toLowerCase().includes(q)).map(s=>`
    <tr>
      <td>${s.name}</td>
      <td>${s.category||''}</td>
      <td>${s.durationMin} м</td>
      <td>${s.price}</td>
      <td>${s.isActive? '✓' : '—'}</td>
      <td><button class="btn" data-edit="${s.id}">Ред.</button> <button class="btn danger" data-del="${s.id}">Удал</button></td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="small">Услуги не найдены</td></tr>`;
  tbody.innerHTML = rows;

  tbody.querySelectorAll('button[data-edit]').forEach(b=>{
    const id = b.dataset.edit;
    b.onclick = ()=> openForm(list.find(x=>x.id===id));
  });
  tbody.querySelectorAll('button[data-del]').forEach(b=>{
    b.onclick = ()=>{
      const next = db.listServices().filter(x=>x.id!==b.dataset.del);
      db.saveServices(next); render();
    };
  });
}

function openForm(data){
  const form = document.getElementById('srv-form');
  form.classList.remove('hidden');
  form.dataset.id = data?.id || '';
  document.getElementById('srv-name').value = data?.name||'';
  document.getElementById('srv-cat').value = data?.category||'';
  document.getElementById('srv-dur').value = data?.durationMin||60;
  document.getElementById('srv-price').value = data?.price||0;
  document.getElementById('srv-active').checked = data?.isActive!==false;
}
function closeForm(){ document.getElementById('srv-form').classList.add('hidden') }

export function initServices(){
  document.getElementById('srv-new').onclick = ()=> openForm(null);
  document.getElementById('srv-search').oninput = render;
  document.getElementById('srv-cancel').onclick = closeForm;
  document.getElementById('srv-save').onclick = ()=>{
    const id = document.getElementById('srv-form').dataset.id || uid();
    const obj = {
      id,
      name: document.getElementById('srv-name').value.trim(),
      category: document.getElementById('srv-cat').value.trim(),
      durationMin: Number(document.getElementById('srv-dur').value),
      price: Number(document.getElementById('srv-price').value),
      isActive: document.getElementById('srv-active').checked
    };
    if(!obj.name){ alert('Название обязательно'); return; }
    if(obj.durationMin<=0){ alert('Длительность должна быть > 0'); return; }
    const list = db.listServices();
    const next = list.some(s=>s.id===id) ? list.map(s=> s.id===id? obj : s) : [obj, ...list];
    db.saveServices(next); closeForm(); render();
  };
  render();
}
