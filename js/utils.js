export const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
export const $ = (sel, root=document) => root.querySelector(sel);

export function uid(){ try { return crypto.randomUUID() } catch { return 'id-' + Math.random().toString(36).slice(2) } }
export function todayISO(){ return new Date().toISOString().slice(0,10) }
export function fmtDate(d){ const x=new Date(d); return x.toLocaleDateString()+' '+x.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }
export function fmtMoney(n, cur){ return new Intl.NumberFormat(undefined,{style:'currency',currency:cur||'USD'}).format(n) }
export function minutes(n){ return n*60*1000 }
export function addMinutes(dateISO, min){ const d=new Date(dateISO); d.setMinutes(d.getMinutes()+min); return d.toISOString(); }
export function sum(arr, map = (x)=>x){ return arr.reduce((s,x)=>s+map(x),0) }
export function download(filename, text){ const a=document.createElement('a'); a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(text); a.download=filename; a.click(); }
export function readFileAsText(file){ return new Promise((res, rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsText(file); }) }
