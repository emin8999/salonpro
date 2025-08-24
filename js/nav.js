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

  document.getElementById("lock-link").onclick = async () => {
    await requestPin("general"); // или другой режим
    lockNow();
  };

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
  const nav = document.querySelector(".nav");

  nav.addEventListener("wheel", (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      nav.scrollLeft += e.deltaY;
    }
  });

  let isDown = false;
  let startX;
  let scrollLeft;

  nav.addEventListener("mousedown", (e) => {
    isDown = true;
    nav.classList.add("dragging");
    startX = e.pageX - nav.offsetLeft;
    scrollLeft = nav.scrollLeft;
  });

  nav.addEventListener("mouseleave", () => {
    isDown = false;
    nav.classList.remove("dragging");
  });

  nav.addEventListener("mouseup", () => {
    isDown = false;
    nav.classList.remove("dragging");
  });

  nav.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - nav.offsetLeft;
    const walk = (x - startX) * 1;
    nav.scrollLeft = scrollLeft - walk;
  });

  // 🔹 Поддержка тач-свайпа
  let touchStartX = 0;
  let touchScrollLeft = 0;

  nav.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].pageX;
    touchScrollLeft = nav.scrollLeft;
  });

  nav.addEventListener("touchmove", (e) => {
    const x = e.touches[0].pageX;
    const walk = x - touchStartX;
    nav.scrollLeft = touchScrollLeft - walk;
  });
}
