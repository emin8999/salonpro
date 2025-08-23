import { uid } from "./utils.js";

const KEYS = {
  services: "salon_services",
  clients: "salon_clients",
  staff: "salon_staff",
  appointments: "salon_appointments",
  orders: "salon_orders",
  settings: "salon_settings",
  pin: "salon_pin", // общий PIN (доступ к вкладкам)
  pinSettings: "salon_pin_settings", // отдельный PIN для Settings
};

function get(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback ?? null;
  } catch {
    return fallback ?? null;
  }
}
function set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seed() {
  if (!get(KEYS.settings))
    set(KEYS.settings, {
      salonName: "My Salon",
      currency: "USD",
      taxPercent: 0,
      bookingSlotMin: 30,
      openTime: "09:00",
      closeTime: "20:00",
    });
  if (!get(KEYS.services))
    set(KEYS.services, [
      {
        id: uid(),
        name: "Haircut",
        category: "Hair",
        durationMin: 45,
        price: 30,
        isActive: true,
      },
      {
        id: uid(),
        name: "Coloring",
        category: "Hair",
        durationMin: 120,
        price: 90,
        isActive: true,
      },
      {
        id: uid(),
        name: "Manicure",
        category: "Nails",
        durationMin: 50,
        price: 35,
        isActive: true,
      },
    ]);
  if (!get(KEYS.clients))
    set(KEYS.clients, [
      {
        id: uid(),
        fullName: "Anna Doe",
        phone: "+994...",
        email: "",
        notes: "",
        visitsCount: 1,
        lastVisitAt: null,
        tags: [],
      },
    ]);
  if (!get(KEYS.staff))
    set(KEYS.staff, [
      {
        id: uid(),
        name: "Master A",
        colorTag: "#0a5fff",
        isActive: true,
        workDays: [1, 2, 3, 4, 5, 6],
        start: "09:00",
        end: "20:00",
      },
      {
        id: uid(),
        name: "Master B",
        colorTag: "#7c4dff",
        isActive: true,
        workDays: [2, 3, 4, 5, 6],
        start: "10:00",
        end: "19:00",
      },
    ]);
  if (!get(KEYS.appointments)) set(KEYS.appointments, []);
  if (!get(KEYS.orders)) set(KEYS.orders, []);
}
seed();

export const db = {
  keys: KEYS,
  get,
  set,
  listServices() {
    return get(KEYS.services, []);
  },
  saveServices(items) {
    set(KEYS.services, items);
  },
  listClients() {
    return get(KEYS.clients, []);
  },
  saveClients(items) {
    set(KEYS.clients, items);
  },
  listStaff() {
    return get(KEYS.staff, []);
  },
  saveStaff(items) {
    set(KEYS.staff, items);
  },
  listAppointments() {
    return get(KEYS.appointments, []);
  },
  saveAppointments(items) {
    set(KEYS.appointments, items);
  },
  listOrders() {
    return get(KEYS.orders, []);
  },
  saveOrders(items) {
    set(KEYS.orders, items);
  },
  getSettings() {
    return get(KEYS.settings, null);
  },
  saveSettings(s) {
    set(KEYS.settings, s);
  },

  // PIN (общий)
  getPin() {
    return localStorage.getItem(KEYS.pin) || "";
  },
  setPin(pin) {
    localStorage.setItem(KEYS.pin, pin || "");
  },

  // PIN для Settings
  getSettingsPin() {
    return localStorage.getItem(KEYS.pinSettings) || "";
  },
  setSettingsPin(pin) {
    localStorage.setItem(KEYS.pinSettings, pin || "");
  },

  exportAll() {
    return JSON.stringify(
      {
        settings: get(KEYS.settings, {}),
        services: get(KEYS.services, []),
        clients: get(KEYS.clients, []),
        staff: get(KEYS.staff, []),
        appointments: get(KEYS.appointments, []),
        orders: get(KEYS.orders, []),
      },
      null,
      2
    );
  },
  importAll(json) {
    const data = JSON.parse(json);
    if (data.settings) set(KEYS.settings, data.settings);
    if (data.services) set(KEYS.services, data.services);
    if (data.clients) set(KEYS.clients, data.clients);
    if (data.staff) set(KEYS.staff, data.staff);
    if (data.appointments) set(KEYS.appointments, data.appointments);
    if (data.orders) set(KEYS.orders, data.orders);
  },
};
