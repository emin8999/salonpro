import { db } from "./storage.js";
import { uid } from "./utils.js";
import { exportClientsCSV } from "./csv.js";

/** ───────────────── CSV/XLS импортеры ───────────────── */

function normalizeHeader(h) {
  if (!h) return "";
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ")
    .replace(/[.]/g, "");
}
function pickHeaderIndex(headers, variants) {
  const norm = headers.map(normalizeHeader);
  for (const v of variants) {
    const i = norm.indexOf(normalizeHeader(v));
    if (i >= 0) return i;
  }
  return -1;
}

// Простой CSV-парсер: поддержка ; или , и кавычек
function parseCSV(text) {
  // пробуем определить разделитель по первой строке
  const firstLine = text.split(/\r?\n/)[0] || "";
  const delimiter =
    firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const rows = [];
  let i = 0,
    field = "",
    inQuotes = false,
    row = [];
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        pushField();
      } else if (ch === "\n") {
        pushField();
        pushRow();
      } else if (ch === "\r") {
        /* ignore */
      } else {
        field += ch;
      }
    }
    i++;
  }
  // последний хвост
  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }
  // удалим пустые строки
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

async function importCSVFile(file) {
  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) {
    alert("CSV пустой");
    return;
  }

  const headers = rows[0];
  const body = rows.slice(1);

  const idxName = pickHeaderIndex(headers, [
    "Имя",
    "Name",
    "Full Name",
    "FullName",
  ]);
  const idxPhone = pickHeaderIndex(headers, [
    "Телефон",
    "Phone",
    "Тел",
    "Mobile",
  ]);
  const idxEmail = pickHeaderIndex(headers, ["Email", "E-mail", "Почта"]);
  const idxNotes = pickHeaderIndex(headers, ["Заметки", "Notes", "Note"]);

  let added = 0,
    updated = 0,
    skipped = 0;

  const list = db.listClients();
  const byPhone = new Map(list.filter((c) => c.phone).map((c) => [c.phone, c]));

  for (const r of body) {
    const fullName = (idxName >= 0 ? String(r[idxName]).trim() : "").trim();
    const phone = (idxPhone >= 0 ? String(r[idxPhone]).trim() : "").trim();
    const email = (idxEmail >= 0 ? String(r[idxEmail]).trim() : "").trim();
    const notes = (idxNotes >= 0 ? String(r[idxNotes]).trim() : "").trim();

    if (!fullName && !phone) {
      skipped++;
      continue;
    }

    const existing = phone ? byPhone.get(phone) : null;
    if (existing) {
      existing.fullName = fullName || existing.fullName;
      existing.email = email || existing.email;
      existing.notes = notes || existing.notes;
      updated++;
    } else {
      const obj = {
        id: uid(),
        fullName: fullName || "(без имени)",
        phone,
        email,
        notes,
        visitsCount: 0,
        lastVisitAt: null,
        tags: [],
      };
      list.unshift(obj);
      if (phone) byPhone.set(phone, obj);
      added++;
    }
  }

  db.saveClients(list);
  alert(
    `Готово: добавлено ${added}, обновлено ${updated}, пропущено ${skipped}`
  );
}

async function importXLSFile(file) {
  // Поддерживаем .xls из нашего экспорта (HTML-таблица).
  const html = await file.text();
  // Парсим как DOM и вытягиваем строки таблицы
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) {
    alert("Не удалось найти таблицу в .xls");
    return;
  }
  const rows = Array.from(table.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.cells).map((td) => td.textContent.trim())
  );
  if (rows.length <= 1) {
    alert("Файл пустой");
    return;
  }

  const headers = rows[0];
  const body = rows.slice(1);

  const idxName = pickHeaderIndex(headers, [
    "Имя",
    "Name",
    "Full Name",
    "FullName",
  ]);
  const idxPhone = pickHeaderIndex(headers, [
    "Телефон",
    "Phone",
    "Тел",
    "Mobile",
  ]);
  const idxEmail = pickHeaderIndex(headers, ["Email", "E-mail", "Почта"]);
  const idxNotes = pickHeaderIndex(headers, ["Заметки", "Notes", "Note"]);

  let added = 0,
    updated = 0,
    skipped = 0;

  const list = db.listClients();
  const byPhone = new Map(list.filter((c) => c.phone).map((c) => [c.phone, c]));

  for (const r of body) {
    const fullName = (idxName >= 0 ? String(r[idxName]).trim() : "").trim();
    const phone = (idxPhone >= 0 ? String(r[idxPhone]).trim() : "").trim();
    const email = (idxEmail >= 0 ? String(r[idxEmail]).trim() : "").trim();
    const notes = (idxNotes >= 0 ? String(r[idxNotes]).trim() : "").trim();

    if (!fullName && !phone) {
      skipped++;
      continue;
    }

    const existing = phone ? byPhone.get(phone) : null;
    if (existing) {
      existing.fullName = fullName || existing.fullName;
      existing.email = email || existing.email;
      existing.notes = notes || existing.notes;
      updated++;
    } else {
      const obj = {
        id: uid(),
        fullName: fullName || "(без имени)",
        phone,
        email,
        notes,
        visitsCount: 0,
        lastVisitAt: null,
        tags: [],
      };
      list.unshift(obj);
      if (phone) byPhone.set(phone, obj);
      added++;
    }
  }

  db.saveClients(list);
  alert(
    `Готово: добавлено ${added}, обновлено ${updated}, пропущено ${skipped}`
  );
}

/** ───────────────── Экспорт Excel (HTML .xls) ───────────────── */
function exportClientsExcel() {
  const list = db.listClients();
  const rows = list.map((c) => ({
    fullName: c.fullName || "",
    phone: c.phone || "",
    email: c.email || "",
    visits: c.visitsCount || 0,
    lastVisit: c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleString() : "",
    notes: c.notes || "",
  }));
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"/></head>
    <body><table border="1">
      <tr><th>Имя</th><th>Телефон</th><th>Email</th><th>Визитов</th><th>Последний визит</th><th>Заметки</th></tr>
      ${rows
        .map(
          (r) =>
            `<tr><td>${r.fullName}</td><td>${r.phone}</td><td>${r.email}</td><td>${r.visits}</td><td>${r.lastVisit}</td><td>${r.notes}</td></tr>`
        )
        .join("")}
    </table></body></html>`;
  const blob = new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "clients.xls";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 1000);
}

/** ───────────────── Рендер/CRUD ───────────────── */

function render() {
  const list = db.listClients();
  const tbody = document.querySelector("#clients tbody");
  const q = (document.getElementById("client-search").value || "")
    .toLowerCase()
    .trim();
  const rows =
    list
      .filter(
        (c) =>
          (c.fullName || "").toLowerCase().includes(q) ||
          (c.phone || "").includes(q)
      )
      .map(
        (c) => `
      <tr>
        <td>${c.fullName}</td>
        <td>${c.phone || ""}</td>
        <td>${c.visitsCount || 0}</td>
        <td>${
          c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString() : "—"
        }</td>
        <td><button class="btn" data-edit="${c.id}">Редактировать</button></td>
      </tr>
    `
      )
      .join("") ||
    `<tr><td colspan="5" class="small">Клиенты не найдены</td></tr>`;
  tbody.innerHTML = rows;

  tbody.querySelectorAll("button[data-edit]").forEach((b) => {
    const id = b.dataset.edit;
    b.onclick = () => openForm(list.find((x) => x.id === id));
  });
}

function openForm(data) {
  const form = document.getElementById("client-form");
  form.classList.remove("hidden");
  form.dataset.id = data?.id || "";
  document.getElementById("f-name").value = data?.fullName || "";
  document.getElementById("f-phone").value = data?.phone || "";
  document.getElementById("f-email").value = data?.email || "";
  document.getElementById("f-notes").value = data?.notes || "";
}
function closeForm() {
  document.getElementById("client-form").classList.add("hidden");
}

export function initClients() {
  document.getElementById("new-client").onclick = () => openForm(null);
  document.getElementById("client-search").oninput = render;
  document.getElementById("client-cancel").onclick = closeForm;
  document.getElementById("client-save").onclick = () => {
    const id = document.getElementById("client-form").dataset.id || uid();
    const obj = {
      id,
      fullName: document.getElementById("f-name").value.trim(),
      phone: document.getElementById("f-phone").value.trim(),
      email: document.getElementById("f-email").value.trim(),
      notes: document.getElementById("f-notes").value.trim(),
      visitsCount: 0,
      lastVisitAt: null,
      tags: [],
    };
    const list = db.listClients();
    if (obj.phone) {
      const duplicate = list.find((c) => c.phone === obj.phone && c.id !== id);
      if (duplicate) {
        alert("Клиент с таким телефоном уже существует");
        return;
      }
    }
    const next = list.some((c) => c.id === id)
      ? list.map((c) => (c.id === id ? obj : c))
      : [obj, ...list];
    db.saveClients(next);
    closeForm();
    render();
  };

  // Экспорт
  const btnCsv = document.getElementById("export-csv");
  const btnXls = document.getElementById("export-xls");
  if (btnCsv) btnCsv.onclick = exportClientsCSV;
  if (btnXls) btnXls.onclick = exportClientsExcel;

  // Импорт CSV
  const impCsv = document.getElementById("import-csv");
  if (impCsv) {
    impCsv.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await importCSVFile(file);
        render();
      } catch (err) {
        alert("Ошибка импорта CSV: " + (err?.message || err));
      } finally {
        impCsv.value = "";
      }
    });
  }

  // Импорт XLS (наш .xls HTML)
  const impXls = document.getElementById("import-xls");
  if (impXls) {
    impXls.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await importXLSFile(file);
        render();
      } catch (err) {
        alert("Ошибка импорта XLS: " + (err?.message || err));
      } finally {
        impXls.value = "";
      }
    });
  }

  // Шаблон
  const btnTpl = document.getElementById("download-template");
  if (btnTpl) {
    btnTpl.onclick = () => {
      const csv = [
        "Имя,Телефон,Email,Заметки",
        "Иван Петров,+994...,ivan@example.com,VIP",
        "Anna Doe,+1 202 555 0143,anna@example.com,Предпочитает утро",
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "clients_template.csv";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1000);
    };
  }

  render();
}
