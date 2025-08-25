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
    <a href="index.html" class="brand">SalonPOS</a>
    <div class="nav">
      ${links
        .map(
          ([href, name]) => `
        <a class="${
          active === href ? "active" : ""
        }" href="${href}" data-href="${href}">
          ${name}
        </a>
      `
        )
        .join("")}
      <a id="lock-link-main" class="right btn no-print" href="javascript:void(0)">🔒 Lock</a>
    </div>
  </div>
`;

  // Бургер меню
  const burgerNav = document.getElementById("burger-nav");
  burgerNav.innerHTML =
    links
      .map(
        ([href, name]) => `
    <a class="${
      active === href ? "active" : ""
    }" href="${href}" data-href="${href}">
      ${name}
    </a>
  `
      )
      .join("") +
    `
  <a id="lock-link-burger" class="right btn no-print" href="javascript:void(0)">🔒 Lock</a>
`;

  // Общий обработчик
  function setupLockHandler(id) {
    const el = document.getElementById(id);
    if (el) {
      el.onclick = async () => {
        await requestPin("general");
        lockNow();
      };
    }
  }

  // Вешаем на оба
  setupLockHandler("lock-link-main");
  setupLockHandler("lock-link-burger");
  // PIN-защита для всех ссылок (nav + burger)
  const GENERAL_PROTECTED = new Set([
    "clients.html",
    "orders.html",
    "reports.html",
    "staff.html",
  ]);
  const SETTINGS_ONLY = "settings.html";

  // Навешиваем обработчики после вставки ссылок
  const allLinks = el.querySelectorAll("a[data-href]");
  const burgerLinks = burgerNav.querySelectorAll("a[data-href]");

  [...allLinks, ...burgerLinks].forEach((a) => {
    const href = a.getAttribute("data-href");

    a.addEventListener("click", async (e) => {
      if (href === SETTINGS_ONLY) {
        e.preventDefault();
        await requestPin("settings");
        window.location.href = href;
        return;
      }
      if (GENERAL_PROTECTED.has(href)) {
        e.preventDefault();
        await requestPin("general");
        window.location.href = href;
      }
    });
  });

  // Бургер логика
  const burgerBtn = document.getElementById("burger-btn");
  const overlay = document.getElementById("burger-overlay");
  const closeBtn = document.getElementById("close-burger");

  function openBurger() {
    overlay.classList.add("show");
    burgerBtn.style.display = "none";
    closeBtn.style.display = "block";
  }

  function closeBurger() {
    overlay.classList.remove("show");
    burgerBtn.style.display = "block";
    closeBtn.style.display = "none";
  }

  burgerBtn.onclick = openBurger;
  closeBtn.onclick = closeBurger;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeBurger();
  };

  function checkWidth() {
    if (window.innerWidth > 900) {
      burgerBtn.style.display = "none";
      closeBtn.style.display = "none";
      overlay.classList.remove("show");
    } else {
      if (!overlay.classList.contains("show")) {
        burgerBtn.style.display = "block";
      }
    }
  }

  window.addEventListener("resize", checkWidth);
  window.addEventListener("load", checkWidth);
}
