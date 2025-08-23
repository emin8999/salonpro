import { db } from "./storage.js";
import { download, readFileAsText } from "./utils.js";

export function initSettings() {
  const s = db.getSettings();
  const setVal = (id, val) => (document.getElementById(id).value = val ?? "");
  setVal("set-name", s.salonName);
  setVal("set-currency", s.currency);
  setVal("set-tax", s.taxPercent);
  setVal("set-open", s.openTime);
  setVal("set-close", s.closeTime);
  setVal("set-slot", s.bookingSlotMin);

  document.getElementById("set-save").onclick = () => {
    const next = {
      salonName: document.getElementById("set-name").value.trim() || "Salon",
      currency: document.getElementById("set-currency").value || "USD",
      taxPercent: Number(document.getElementById("set-tax").value || 0),
      openTime: document.getElementById("set-open").value || "09:00",
      closeTime: document.getElementById("set-close").value || "20:00",
      bookingSlotMin: Number(document.getElementById("set-slot").value || 30),
    };
    db.saveSettings(next);
    alert("Сохранено");
  };

  // Общий PIN
  const p = db.getPin();
  document.getElementById("pin-current").textContent = p
    ? "PIN установлен"
    : "PIN не установлен";
  document.getElementById("pin-set").onclick = () => {
    const a = prompt("Введите новый общий PIN (4–6 цифр)") || "";
    if (!a) return;
    if (!/^\d{4,6}$/.test(a)) {
      alert("Только 4–6 цифр");
      return;
    }
    db.setPin(a);
    alert("Общий PIN установлен");
    document.getElementById("pin-current").textContent = "PIN установлен";
  };
  document.getElementById("pin-remove").onclick = () => {
    db.setPin("");
    alert("Общий PIN удалён");
    document.getElementById("pin-current").textContent = "PIN не установлен";
  };

  // PIN для Settings
  const ps = db.getSettingsPin();
  document.getElementById("pinS-current").textContent = ps
    ? "PIN Settings установлен"
    : "PIN Settings не установлен";
  document.getElementById("pinS-set").onclick = () => {
    const a = prompt("Введите PIN для Settings (4–6 цифр)") || "";
    if (!a) return;
    if (!/^\d{4,6}$/.test(a)) {
      alert("Только 4–6 цифр");
      return;
    }
    db.setSettingsPin(a);
    alert("PIN Settings установлен");
    document.getElementById("pinS-current").textContent =
      "PIN Settings установлен";
  };
  document.getElementById("pinS-remove").onclick = () => {
    db.setSettingsPin("");
    alert("PIN Settings удалён");
    document.getElementById("pinS-current").textContent =
      "PIN Settings не установлен";
  };

  // Данные
  document.getElementById("export-json").onclick = () => {
    download("salon-data.json", db.exportAll());
  };
  document.getElementById("import-json").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      db.importAll(text);
      alert("Импортировано. Перезагрузите страницу.");
    } catch (e) {
      alert("Ошибка импорта: " + e.message);
    }
  };
}
