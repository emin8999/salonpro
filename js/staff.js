import { db } from './storage.js';
import { uid } from './utils.js';

function render(){
  const list = db.listStaff();
  const tbody = document.querySelector('#staff tbody');
  const rows = list.map(s=>`
    <tr>
      <td><span class="badge" style="background:${s.colorTag||'#0a5fff'}22;border-color:${s.colorTag||'#0a5fff'}99">${s.name}</span></td>
      <td>${(s.workDays||[]).join(',')}</td>
      <td>${s.start||'-'} — ${s.end||'-'}</td>
      <td>${s.isActive!==false?'✓':'—'}</td>
      <td>
        <button class="btn" data-edit="${s.id}">Ред.</button>
        <button class="btn danger" data-del="${s.id}">Удал</button>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="5" class="small">Сотрудников нет</td></tr>`;
  tbody.innerHTML = rows;

  tbody.querySelectorAll('button[data-edit]').forEach(b=>{
    const id = b.dataset.edit;
    b.onclick = ()=> openForm(list.find(x=>x.id===id));
  });
  tbody.querySelectorAll('button[data-del]').forEach(b=>{
    b.onclick = ()=>{
      const next = db.listStaff().filter(x=>x.id!==b.dataset.del);
      db.saveStaff(next); render();
    };
  });
}

function openForm(data){
  const form = document.getElementById('st-form');
  form.classList.remove('hidden');
  form.dataset.id = data?.id || '';
  document.getElementById('st-name').value = data?.name||'';
  document.getElementById('st-color').value = data?.colorTag||'#0a5fff';
  document.getElementById('st-active').checked = data?.isActive!==false;
  document.getElementById('st-start').value = data?.start||'09:00';
  document.getElementById('st-end').value = data?.end||'20:00';
  const wd = new Set(data?.workDays||[1,2,3,4,5,6]);
  Array.from(document.querySelectorAll('input[name="st-wd"]')).forEach(ch=> ch.checked = wd.has(Number(ch.value)));
}
function closeForm(){ document.getElementById('st-form').classList.add('hidden') }

export function initStaff(){
  document.getElementById('st-new').onclick = ()=> openForm(null);
  document.getElementById('st-cancel').onclick = closeForm;
  document.getElementById('st-save').onclick = ()=>{
    const id = document.getElementById('st-form').dataset.id || uid();
    const workDays = Array.from(document.querySelectorAll('input[name="st-wd"]:checked')).map(ch=>Number(ch.value));
    const obj = {
      id,
      name: document.getElementById('st-name').value.trim(),
      colorTag: document.getElementById('st-color').value,
      isActive: document.getElementById('st-active').checked,
      start: document.getElementById('st-start').value || '09:00',
      end: document.getElementById('st-end').value || '20:00',
      workDays: workDays.length ? workDays : [1,2,3,4,5,6]
    };
    if(!obj.name){ alert('Имя обязательно'); return; }
    const list = db.listStaff();
    const next = list.some(s=>s.id===id) ? list.map(s=> s.id===id? obj : s) : [obj, ...list];
    db.saveStaff(next); closeForm(); render();
  };
  render();
}
