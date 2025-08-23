import { db } from "./storage.js";

let overlayBuilt = false;
let pendingResolve = null;
let currentKind = "general"; // 'general' | 'settings'

function buildLock() {
  if (overlayBuilt) return;
  overlayBuilt = true;

  const wrap = document.createElement("div");
  wrap.className = "pin-lock";
  wrap.id = "pin-lock";
  wrap.innerHTML = `
    <div class="pin-box">
      <h2 id="pin-title">🔒 Введите PIN</h2>
      <input id="pin-input" class="pin-input" type="password" maxlength="6" inputmode="numeric" placeholder="••••"/>
      <div class="row mt12 center">
        <button id="pin-ok" class="btn primary">Разблокировать</button>
      </div>
      <div id="pin-msg" class="small mt8" style="color:#ffb7b7"></div>
    </div>`;
  document.body.appendChild(wrap);

  const tryUnlock = () => {
    const pin = currentKind === "settings" ? db.getSettingsPin() : db.getPin();
    const val = (document.getElementById("pin-input").value || "").trim();

    // если PIN нужного типа не задан — пропускаем
    if (!pin) {
      if (currentKind === "general") {
        sessionStorage.setItem("pin_ok", "1");
      }
      hide();
      if (pendingResolve) {
        pendingResolve(true);
        pendingResolve = null;
      }
      return;
    }

    if (val === pin) {
      if (currentKind === "general") {
        sessionStorage.setItem("pin_ok", "1");
      }
      hide();
      if (pendingResolve) {
        pendingResolve(true);
        pendingResolve = null;
      }
    } else {
      document.getElementById("pin-msg").textContent = "Неверный PIN";
    }
  };

  document.getElementById("pin-ok").onclick = tryUnlock;
  document.getElementById("pin-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock();
  });
}

function show(kind) {
  buildLock();
  currentKind = kind || "general";
  const title = document.getElementById("pin-title");
  title.textContent =
    currentKind === "settings" ? "🔒 PIN для Settings" : "🔒 Введите PIN";
  const box = document.getElementById("pin-lock");
  const input = document.getElementById("pin-input");
  const msg = document.getElementById("pin-msg");
  if (msg) msg.textContent = "";
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 0);
  }
  box.classList.add("show");
}
function hide() {
  const box = document.getElementById("pin-lock");
  if (box) box.classList.remove("show");
}

/** Проверка при загрузке: общий PIN (если задан) должен быть введён для сессии */
export function ensurePinUnlocked() {
  buildLock();
  if (db.getPin() && sessionStorage.getItem("pin_ok") !== "1") {
    show("general");
  }
}

/** Запросить ввод PIN: kind = 'general' | 'settings' */
export function requestPin(kind = "general") {
  return new Promise((resolve) => {
    pendingResolve = resolve;
    if (kind === "general") {
      // сбрасываем, чтобы запросить общий PIN заново
      sessionStorage.removeItem("pin_ok");
    }
    show(kind);
  });
}

export function lockNow() {
  sessionStorage.removeItem("pin_ok");
  ensurePinUnlocked();
}
