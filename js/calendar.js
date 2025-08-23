import { db } from "./storage.js";
import { addMinutes, uid } from "./utils.js";
import { showModal } from "./modals.js";

/*
  Поведение:
  - Сетка ПО ЧАСАМ (каждый час — одна строка), + конечная строка с меткой закрытия (endcap).
  - Карточки записей лежат в соответствующем часовом слоте (HH:00).
  - Слот растягивается по содержимому; высота часа синхронизируется между всеми колонками.
  - Часовой пояс записи (tz) — бейдж, не влияет на позиционирование.
  - Клик по карточке открывает её модалку (останавливаем всплытие),
    клик по пустому месту слота — модалка «Новая запись».
  - Есть кнопка «Удалить» в карточке.
  - Шапка с именем сотрудника имеет небольшой отступ вниз (margin-bottom).
*/

let currentDateStr = null; // YYYY-MM-DD
const pad = (n) => String(n).padStart(2, "0");
const browserTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function localDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function makeLocalISO(dateStr /*YYYY-MM-DD*/, timeStr /*HH:MM*/) {
  return new Date(`${dateStr}T${timeStr || "00:00"}:00`).toISOString();
}

function staffWorkingHour(staff, hour /*0..23*/, weekdayLocal /*1..7*/) {
  const on = (staff.workDays || [1, 2, 3, 4, 5, 6, 7]).includes(weekdayLocal);
  if (!on) return false;
  const [sh, sm] = (staff.start || "09:00").split(":").map(Number);
  const [eh, em] = (staff.end || "20:00").split(":").map(Number);
  // час считается рабочим, если пересекается с [start;end]
  return hour * 60 <= eh * 60 + em && (hour + 1) * 60 > sh * 60 + sm;
}

function renderGrid(dateStr /*YYYY-MM-DD*/) {
  currentDateStr = dateStr;

  const staffAll = db.listStaff().filter((s) => s.isActive !== false);
  const staffFilter = document.getElementById("staff-filter")?.value || "";
  const staff = staffFilter
    ? staffAll.filter((s) => s.id === staffFilter)
    : staffAll;

  const settings = db.getSettings();
  const cont = document.getElementById("calendar-grid");

  const [openH, openM] = (settings.openTime || "09:00").split(":").map(Number);
  const [closeH, closeM] = (settings.closeTime || "20:00")
    .split(":")
    .map(Number);

  // границы дня (локально)
  const start = new Date(`${dateStr}T${pad(openH)}:${pad(openM)}:00`);
  const end = new Date(`${dateStr}T${pad(closeH)}:${pad(closeM)}:00`);
  const weekdayLocal = new Date(`${dateStr}T00:00:00`).getDay() || 7;

  // массив ЧАСОВ (каждый час — один слот) + финальная метка закрытия
  const hours = [];
  {
    let h = start.getHours();
    // прим.: раньше последняя видимая была 19 при close=20:00. Теперь добавим endcap-строку "20:00".
    const endHour = end.getHours(); // 20 при 20:00
    const needExtraEndcap = true;
    for (; h <= endHour - 1; h++) {
      hours.push(h);
    }
    // endcap: визуальная метка закрытия (20:00), не интерактивная
    var closingLabelHour = endHour; // используем ниже
    var hoursWithEnd = [...hours, closingLabelHour];
  }

  // шапка
  cont.innerHTML =
    `<div class="timecol"></div>` +
    staff
      .map(
        (s) => `
    <div class="col" data-staff="${s.id}">
      <div class="slot small center" style="background:${
        s.colorTag || "#0a5fff"
      }22;border-bottom:1px solid ${
          s.colorTag || "#0a5fff"
        }55;margin-bottom:6px">— ${s.name} —</div>
    </div>`
      )
      .join("");

  // колонка времени: все рабочие часы + финальная строка "20:00"
  const timecol = cont.querySelector(".timecol");
  timecol.innerHTML =
    hours
      .map(
        (h) =>
          `<div class="slot" data-hour="${h}">${String(h).padStart(
            2,
            "0"
          )}:00</div>`
      )
      .join("") +
    `<div class="slot endcap" data-hour="${closingLabelHour}">${String(
      closingLabelHour
    ).padStart(2, "0")}:00</div>`;

  // по сотрудникам — часовые слоты + endcap-строка (off)
  staff.forEach((s) => {
    const col = cont.querySelector(`.col[data-staff="${s.id}"]`);
    col.innerHTML +=
      hours
        .map((h) => {
          const off = staffWorkingHour(s, h, weekdayLocal) ? "" : "off";
          const label = `${String(h).padStart(2, "0")}:00`;
          return `<div class="slot ${off}" data-hour="${h}" data-staff="${s.id}" data-time="${label}"></div>`;
        })
        .join("") +
      // финальная "закрывающая" строка — всегда off, служит визуальной меткой конца дня
      `<div class="slot off endcap" data-hour="${closingLabelHour}" data-staff="${
        s.id
      }" data-time="${String(closingLabelHour).padStart(2, "0")}:00"></div>`;
  });

  // берём записи этого ЛОКАЛЬНОГО дня
  const appts = db
    .listAppointments()
    .filter((a) => localDateStr(a.start) === dateStr);

  // раскладываем по часам (10:xx => час 10)
  appts.forEach((a) => {
    const h = new Date(a.start).getHours();
    const staffCol = cont.querySelector(`.col[data-staff="${a.staffId}"]`);
    if (!staffCol) return;
    const slotEl =
      staffCol.querySelector(`.slot[data-hour="${h}"]`) || staffCol;

    const staffDef = db.listStaff().find((x) => x.id === a.staffId) || {};
    const staffColor = staffDef.colorTag || "#0a5fff";
    const client = db.listClients().find((c) => c.id === a.clientId);
    const services = db.listServices();
    const names = (a.serviceIds || [])
      .map((id) => services.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
    const t1 = new Date(a.start).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const t2 = new Date(a.end).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const tz = a.tz || browserTZ;

    const el = document.createElement("div");
    el.className =
      "appt " +
      (a.status === "completed"
        ? "completed"
        : a.status === "cancelled"
        ? "cancelled"
        : "");
    el.style.borderLeftColor = staffColor;
    el.innerHTML = `
      <b>${t1}–${t2}</b> <span class="badge" title="Часовой пояс записи">${tz}</span><br>
      ${client?.fullName || "—"}<div class="small">${names || ""}</div>
      <div class="small">[${a.status}]</div>
    `;
    // ВАЖНО: останавливаем всплытие, чтобы клик по карточке не срабатывал как клик по слоту
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      openAppt(a, staffDef);
    });
    slotEl.appendChild(el);
  });

  // синхронизация высот строк (включая конечную endcap-строку)
  syncRowHeights(hoursWithEnd);

  // клик по свободному часовому слоту → новая запись
  cont.querySelectorAll(".col .slot").forEach((slot) => {
    if (slot.classList.contains("off")) return; // endcap и нерабочие — игнор
    const hourAttr = slot.getAttribute("data-hour");
    if (hourAttr == null) return; // пропустить шапку
    slot.addEventListener("click", (ev) => {
      // если клик был по карточке — слот не обрабатываем
      if (ev.target.closest(".appt")) return;
      const hour = Number(hourAttr);
      const timeStr = `${String(hour).padStart(2, "0")}:00`;
      openNewAppt(dateStr, slot.dataset.staff, timeStr);
    });
  });
}

function syncRowHeights(hoursList) {
  const grid = document.getElementById("calendar-grid");
  const timeSlots = Array.from(
    grid.querySelectorAll(".timecol .slot[data-hour]")
  );

  hoursList.forEach((h) => {
    // соберём все .slot с этим часом: timecol + все сотрудники
    const rowSlots = [
      ...timeSlots.filter((s) => Number(s.getAttribute("data-hour")) === h),
      ...Array.from(grid.querySelectorAll(`.col .slot[data-hour="${h}"]`)),
    ];
    if (!rowSlots.length) return;
    // сброс высот -> авто
    rowSlots.forEach((s) => (s.style.height = "auto"));
    // измерим максимальную высоту
    const maxH = Math.max(...rowSlots.map((s) => s.scrollHeight));
    // выставим одинаковую высоту всем
    rowSlots.forEach((s) => (s.style.height = `${maxH}px`));
  });
}

// ─── создание ─────────────────────────────────────────────────────────
function openNewAppt(dateStr, staffId, timeStr) {
  const clients = db.listClients();
  const services = db.listServices().filter((s) => s.isActive !== false);
  const startISO = makeLocalISO(dateStr, timeStr || "10:00");

  const tzOptions = [
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    "Europe/Moscow",
    "Asia/Baku",
    "Asia/Tbilisi",
    "Asia/Yerevan",
    "Europe/Kyiv",
    "Europe/Warsaw",
    "Europe/Berlin",
    "Asia/Dubai",
    "Asia/Almaty",
    "UTC",
  ].filter((v, i, a) => a.indexOf(v) === i);

  let chosen = [];
  const content = document.createElement("div");
  content.innerHTML = `
    <div class="row">
      <div style="flex:1">
        <label>Клиент</label>
        <select id="ap-client" class="input">
          ${clients
            .map(
              (c) =>
                `<option value="${c.id}">${c.fullName} ${
                  c.phone ? "(" + c.phone + ")" : ""
                }</option>`
            )
            .join("")}
        </select>
      </div>
      <div style="width:220px">
        <label>Сотрудник</label>
        <select id="ap-staff" class="input">
          ${db
            .listStaff()
            .map(
              (s) =>
                `<option value="${s.id}" ${
                  s.id === staffId ? "selected" : ""
                }>${s.name}</option>`
            )
            .join("")}
        </select>
      </div>
      <div style="width:240px">
        <label>Часовой пояс</label>
        <select id="ap-tz" class="input">
          ${tzOptions
            .map((tz) => `<option value="${tz}">${tz}</option>`)
            .join("")}
        </select>
      </div>
    </div>
    <div class="mt12">
      <label>Услуги</label>
      <div class="chips" id="ap-services">
        ${services
          .map(
            (s) =>
              `<div class="chip" data-id="${s.id}">${s.name} · ${s.durationMin}m · ${s.price}</div>`
          )
          .join("")}
      </div>
    </div>
    <div class="row mt12">
      <div style="width:200px">
        <label>Начало</label>
        <input id="ap-start" class="input" type="datetime-local">
      </div>
      <div style="width:200px">
        <label>Конец</label>
        <input id="ap-end" class="input" type="datetime-local">
      </div>
      <div style="flex:1"></div>
    </div>
    <div class="mt8 small" id="ap-summary"></div>
  `;

  const start = new Date(startISO);
  const toLoc = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  const startInput = content.querySelector("#ap-start");
  startInput.value = toLoc(start);
  const endInput = content.querySelector("#ap-end");

  const recomputeEnd = () => {
    const dur =
      chosen
        .map((id) => services.find((s) => s.id === id)?.durationMin || 0)
        .reduce((a, b) => a + b, 0) || 30;
    const endISO = addMinutes(new Date(startInput.value).toISOString(), dur);
    endInput.value = toLoc(new Date(endISO));
    const price = chosen
      .map((id) => services.find((s) => s.id === id)?.price || 0)
      .reduce((a, b) => a + b, 0);
    content.querySelector(
      "#ap-summary"
    ).textContent = `Длительность: ${dur} мин · Сумма: ${price}`;
  };
  content.querySelectorAll("#ap-services .chip").forEach((ch) => {
    ch.addEventListener("click", () => {
      const id = ch.dataset.id;
      if (chosen.includes(id)) {
        chosen = chosen.filter((x) => x !== id);
        ch.classList.remove("active");
      } else {
        chosen.push(id);
        ch.classList.add("active");
      }
      recomputeEnd();
    });
  });
  recomputeEnd();

  showModal({
    title: "Новая запись",
    content,
    actions: [
      { label: "Отмена" },
      {
        label: "Сохранить",
        class: "primary",
        onClick: () => {
          const tz = content.querySelector("#ap-tz").value || browserTZ;
          const data = {
            id: uid(),
            clientId: content.querySelector("#ap-client").value,
            staffId: content.querySelector("#ap-staff").value,
            serviceIds: chosen.slice(),
            start: new Date(startInput.value).toISOString(),
            end: new Date(endInput.value).toISOString(),
            status: "booked",
            notes: "",
            tz,
          };
          const items = db.listAppointments();
          items.push(data);
          db.saveAppointments(items);
          renderGrid(currentDateStr);
        },
      },
      {
        label: "Сохранить и пробить",
        class: "ok",
        onClick: () => {
          const tz = content.querySelector("#ap-tz").value || browserTZ;
          const apptId = uid();
          const data = {
            id: apptId,
            clientId: content.querySelector("#ap-client").value,
            staffId: content.querySelector("#ap-staff").value,
            serviceIds: chosen.slice(),
            start: new Date(startInput.value).toISOString(),
            end: new Date(endInput.value).toISOString(),
            status: "booked",
            notes: "",
            tz,
          };
          const items = db.listAppointments();
          items.push(data);
          db.saveAppointments(items);
          window.location.href = `pos.html?appointmentId=${apptId}`;
        },
      },
    ],
  });
}

// ─── просмотр/редактирование ─────────────────────────────────────────
function openAppt(a, staff) {
  const services = db.listServices();
  const client = db.listClients().find((c) => c.id === a.clientId);
  const names = (a.serviceIds || [])
    .map((id) => services.find((s) => s.id === id)?.name)
    .filter(Boolean)
    .join(", ");
  const tz = a.tz || browserTZ;
  const t1 = new Date(a.start).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const t2 = new Date(a.end).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const content = document.createElement("div");
  content.innerHTML = `
    <div><b>${client?.fullName || "—"}</b> • <span style="color:${
    staff.colorTag || "#0a5fff"
  }">${staff.name}</span></div>
    <div class="small">${localDateStr(
      a.start
    )} ${t1} — ${t2} <span class="badge">${tz}</span></div>
    <div class="mt8">Услуги: ${names || "—"}</div>
    <div class="mt12">Статус: ${a.status}</div>
  `;
  showModal({
    title: "Запись",
    content,
    actions: [
      { label: "Отмена" },
      {
        label: "Пришёл",
        class: "primary",
        onClick: () => {
          a.status = "arrived";
          saveAppt(a);
        },
      },
      {
        label: "Пробить",
        class: "ok",
        onClick: () => {
          window.location.href = `pos.html?appointmentId=${a.id}`;
        },
      },
      {
        label: "Удалить",
        class: "danger",
        onClick: () => {
          deleteAppt(a.id);
        },
      },
      {
        label: "Отменить",
        class: "danger",
        onClick: () => {
          a.status = "cancelled";
          saveAppt(a);
        },
      },
    ],
  });
}

function saveAppt(a) {
  const arr = db.listAppointments().map((x) => (x.id === a.id ? a : x));
  db.saveAppointments(arr);
  renderGrid(currentDateStr);
}
function deleteAppt(id) {
  const next = db.listAppointments().filter((x) => x.id !== id);
  db.saveAppointments(next);
  renderGrid(currentDateStr);
}

// ─── init ────────────────────────────────────────────────────────────
export function initCalendar() {
  const dateInput = document.getElementById("cal-date");
  const today = new Date();
  dateInput.value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(
    today.getDate()
  )}`;

  // staff filter
  const staffSel = document.getElementById("staff-filter");
  const staff = db.listStaff().filter((s) => s.isActive !== false);
  staffSel.innerHTML =
    `<option value="">Все сотрудники</option>` +
    staff.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  staffSel.onchange = () => renderGrid(dateInput.value);

  document.getElementById("prev-day").onclick = () => {
    const d = new Date(dateInput.value);
    d.setDate(d.getDate() - 1);
    dateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}`;
    renderGrid(dateInput.value);
  };
  document.getElementById("next-day").onclick = () => {
    const d = new Date(dateInput.value);
    d.setDate(d.getDate() + 1);
    dateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}`;
    renderGrid(dateInput.value);
  };
  dateInput.onchange = () => renderGrid(dateInput.value);

  renderGrid(dateInput.value);
}
