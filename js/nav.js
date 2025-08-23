import { lockNow, requestPin } from "./security.js";

export function renderNav(active) {
  const el = document.getElementById("app-header");
  if (!el) return;

  const links = [
    ["index.html", "Dashboard"],
    ["calendar.html", "Календарь"],
    ["pos.html", "Касса"],
    ["services.html", "Услуги"],
    ["clients.html", "Клиенты"],
    ["orders.html", "Заказы"],
    ["reports.html", "Отчёты"],
    ["staff.html", "Сотрудники"],
    ["settings.html", "Настройки"],
  ];

  el.innerHTML = `
  <div class="header">
    <div class="nav">
      <a href="index.html" class="brand">SalonPOS</a>
      ${links
        .map(
          ([href, name]) =>
            `<a class="${
              active === href ? "active" : ""
            }" href="${href}" data-href="${href}">${name}</a>`
        )
        .join("")}
      <a id="lock-link" class="right btn no-print" href="javascript:void(0)">🔒 Lock</a>
    </div>
  </div>`;

  document.getElementById("lock-link").onclick = lockNow;

  // Группы вкладок
  const GENERAL_PROTECTED = new Set([
    "clients.html",
    "orders.html",
    "reports.html",
    "staff.html",
  ]);
  const SETTINGS_ONLY = "settings.html";

  el.querySelectorAll("a[data-href]").forEach((a) => {
    const href = a.getAttribute("data-href");

    // Settings — свой PIN
    if (href === SETTINGS_ONLY) {
      a.addEventListener("click", async (e) => {
        e.preventDefault();
        await requestPin("settings"); // спрашиваем отдельный PIN
        window.location.href = href;
      });
      return;
    }

    // Остальные защищённые — общий PIN
    if (GENERAL_PROTECTED.has(href)) {
      a.addEventListener("click", async (e) => {
        e.preventDefault();
        await requestPin("general"); // заново спросить общий PIN
        window.location.href = href;
      });
    }
  });
}
