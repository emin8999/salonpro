let lastClose = null;
export function showModal({title, content, actions=[]}){
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop modal show">
      <div class="modal">
        <div class="section-title"><h3>${title||''}</h3><button id="modal-x" class="btn">×</button></div>
        <div class="modal-content"></div>
        <div class="actions"></div>
      </div>
    </div>`;
  root.querySelector('.modal-content').appendChild(content);
  const act = root.querySelector('.actions');
  actions.forEach(a=>{
    const btn = document.createElement('button');
    btn.className = 'btn ' + (a.class||'');
    btn.textContent = a.label;
    btn.onclick = ()=>{ hide(); a.onClick && a.onClick() };
    act.appendChild(btn);
  });
  function hide(){ root.innerHTML=''; lastClose = new Date() }
  document.getElementById('modal-x').onclick = hide;
  root.querySelector('.modal-backdrop').addEventListener('click', (e)=>{
    if(e.target.classList.contains('modal-backdrop')) hide();
  });
}
