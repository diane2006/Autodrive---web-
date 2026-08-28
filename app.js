/* =========================================================
   AutoDrive Panamá — capa de datos local
   Hoy: localStorage. Mañana: reemplazar DB.* por fetch() a
   un backend real sin tocar el resto de la app.
   ========================================================= */
const DB = {
  KEYS: { cars: "autodrive_cars", sales: "autodrive_sales" },

  getCars() {
    return JSON.parse(localStorage.getItem(this.KEYS.cars) || "[]");
  },
  saveCars(cars) {
    localStorage.setItem(this.KEYS.cars, JSON.stringify(cars));
  },
  getSales() {
    return JSON.parse(localStorage.getItem(this.KEYS.sales) || "[]");
  },
  saveSales(sales) {
    localStorage.setItem(this.KEYS.sales, JSON.stringify(sales));
  },

  addCar(car) {
    const cars = this.getCars();
    car.id = "car_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    car.createdAt = new Date().toISOString();
    cars.unshift(car);
    this.saveCars(cars);
    return car;
  },
  updateCar(id, patch) {
    const cars = this.getCars();
    const idx = cars.findIndex(c => c.id === id);
    if (idx === -1) return null;
    cars[idx] = { ...cars[idx], ...patch };
    this.saveCars(cars);
    return cars[idx];
  },
  deleteCar(id) {
    this.saveCars(this.getCars().filter(c => c.id !== id));
  },

  addSale(sale) {
    const sales = this.getSales();
    sale.id = "sale_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    sales.unshift(sale);
    this.saveSales(sales);
    return sale;
  },
  deleteSale(id) {
    this.saveSales(this.getSales().filter(s => s.id !== id));
  },

  seedIfEmpty() {
    if (this.getCars().length > 0) return;
    const seed = [
      { brand: "Toyota", model: "Corolla", year: 2022, plate: "AB-1234", price: 18500, mileage: 12000, color: "Gris plata", status: "disponible", notes: "Único dueño, mantenimiento al día." },
      { brand: "Hyundai", model: "Tucson", year: 2021, plate: "CD-5678", price: 24900, mileage: 30500, color: "Blanco", status: "reservado", notes: "Reservado con depósito, pendiente de firma." },
      { brand: "Honda", model: "Civic", year: 2020, plate: "EF-9012", price: 16800, mileage: 45200, color: "Azul", status: "disponible", notes: "" },
      { brand: "Kia", model: "Sportage", year: 2023, plate: "GH-3456", price: 27500, mileage: 5400, color: "Rojo", status: "disponible", notes: "Casi nuevo, garantía de fábrica vigente." },
    ];
    seed.forEach(c => this.addCar(c));
  }
};

/* =========================================================
   Utilidades
   ========================================================= */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const money = n => "$" + Number(n || 0).toLocaleString("en-US");
const escapeHtml = str => String(str ?? "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("show"), 2200);
}

function animateOdometer(el, target) {
  const start = Number(el.dataset.current || 0);
  const dur = 500;
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - t0) / dur);
    const val = Math.round(start + (target - start) * p);
    el.textContent = val;
    if (p < 1) requestAnimationFrame(tick);
    else el.dataset.current = target;
  }
  requestAnimationFrame(tick);
}

/* =========================================================
   Navegación entre vistas
   ========================================================= */
function setView(view) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $(`#view-${view}`).classList.add("active");
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
}
$("#tabs").addEventListener("click", e => {
  const btn = e.target.closest(".tab");
  if (btn) setView(btn.dataset.view);
});

/* =========================================================
   Render: Dashboard
   ========================================================= */
function renderDashboard() {
  const cars = DB.getCars();
  const sales = DB.getSales();
  const available = cars.filter(c => c.status === "disponible").length;
  const totalValue = cars.filter(c => c.status !== "vendido").reduce((sum, c) => sum + Number(c.price || 0), 0);

  animateOdometer($("#stat-total"), cars.length);
  animateOdometer($("#stat-available"), available);
  animateOdometer($("#stat-sold"), sales.length);
  $("#stat-value").textContent = money(totalValue);

  const activityList = $("#activity-list");
  const events = [
    ...cars.map(c => ({ ts: c.createdAt, html: `Vehículo agregado: <b>${escapeHtml(c.brand)} ${escapeHtml(c.model)}</b> (${c.year})` })),
    ...sales.map(s => ({ ts: s.date, html: `Venta registrada: <b>${escapeHtml(s.carLabel)}</b> a ${escapeHtml(s.buyer)} por ${money(s.price)}` })),
  ].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6);

  activityList.innerHTML = events.length
    ? events.map(e => `<li>${e.html}</li>`).join("")
    : `<li class="empty">Aún no hay actividad. Agrega un vehículo o registra una venta.</li>`;

  const miniCars = $("#mini-cars");
  const latest = cars.slice(0, 3);
  miniCars.innerHTML = latest.length
    ? latest.map(c => `
        <div class="mini-car">
          <span class="name">${escapeHtml(c.brand)} ${escapeHtml(c.model)} · ${c.year}</span>
          <span class="price">${money(c.price)}</span>
        </div>`).join("")
    : `<p class="empty-state" style="padding:12px 0;">Sin vehículos todavía.</p>`;
}

/* =========================================================
   Render: Inventario
   ========================================================= */
let currentStatusFilter = "todos";

function carCardHtml(car) {
  return `
    <article class="car-card" data-id="${car.id}">
      <div class="top-row">
        <div>
          <h3>${escapeHtml(car.brand)} ${escapeHtml(car.model)}</h3>
          <span class="year">${car.year} · ${escapeHtml(car.color || "—")}</span>
        </div>
        <span class="plate">${escapeHtml(car.plate)}</span>
      </div>
      <span class="status-badge status-${car.status}">${car.status}</span>
      <div class="meta-row">
        <span>${Number(car.mileage || 0).toLocaleString("en-US")} km</span>
      </div>
      <div class="price-row">${money(car.price)}</div>
      ${car.notes ? `<p class="notes">${escapeHtml(car.notes)}</p>` : ""}
      <div class="card-actions">
        <button data-action="edit">Editar</button>
        <button data-action="delete" class="danger">Eliminar</button>
      </div>
    </article>`;
}

function renderInventory() {
  const cars = DB.getCars();
  const q = $("#search-input").value.trim().toLowerCase();
  const filtered = cars.filter(c => {
    const matchesStatus = currentStatusFilter === "todos" || c.status === currentStatusFilter;
    const haystack = `${c.brand} ${c.model} ${c.plate}`.toLowerCase();
    const matchesQuery = !q || haystack.includes(q);
    return matchesStatus && matchesQuery;
  });

  $("#car-grid").innerHTML = filtered.map(carCardHtml).join("");
  $("#inventory-empty").hidden = filtered.length > 0;
}

$("#search-input").addEventListener("input", renderInventory);
$("#status-filter").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  $$(".chip", $("#status-filter")).forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  currentStatusFilter = chip.dataset.status;
  renderInventory();
});

$("#car-grid").addEventListener("click", e => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.closest(".car-card").dataset.id;
  if (btn.dataset.action === "edit") openCarModal(DB.getCars().find(c => c.id === id));
  if (btn.dataset.action === "delete") {
    if (confirm("¿Eliminar este vehículo del inventario?")) {
      DB.deleteCar(id);
      renderAll();
      showToast("Vehículo eliminado");
    }
  }
});

/* ---- Modal: agregar / editar vehículo ---- */
function openCarModal(car) {
  const isEdit = Boolean(car);
  $("#car-modal-title").textContent = isEdit ? "Editar vehículo" : "Agregar vehículo";
  $("#car-id").value = isEdit ? car.id : "";
  $("#car-brand").value = isEdit ? car.brand : "";
  $("#car-model").value = isEdit ? car.model : "";
  $("#car-year").value = isEdit ? car.year : "";
  $("#car-plate").value = isEdit ? car.plate : "";
  $("#car-price").value = isEdit ? car.price : "";
  $("#car-mileage").value = isEdit ? car.mileage : "";
  $("#car-color").value = isEdit ? car.color : "";
  $("#car-status").value = isEdit ? car.status : "disponible";
  $("#car-notes").value = isEdit ? car.notes || "" : "";
  $("#car-modal-backdrop").classList.add("open");
  $("#car-brand").focus();
}
function closeCarModal() { $("#car-modal-backdrop").classList.remove("open"); }

$("#btn-new-car").addEventListener("click", () => openCarModal(null));
$("#car-form").addEventListener("submit", e => {
  e.preventDefault();
  const id = $("#car-id").value;
  const payload = {
    brand: $("#car-brand").value.trim(),
    model: $("#car-model").value.trim(),
    year: Number($("#car-year").value),
    plate: $("#car-plate").value.trim().toUpperCase(),
    price: Number($("#car-price").value),
    mileage: Number($("#car-mileage").value || 0),
    color: $("#car-color").value.trim(),
    status: $("#car-status").value,
    notes: $("#car-notes").value.trim(),
  };
  if (id) {
    DB.updateCar(id, payload);
    showToast("Vehículo actualizado");
  } else {
    DB.addCar(payload);
    showToast("Vehículo agregado al inventario");
  }
  closeCarModal();
  renderAll();
});

/* =========================================================
   Render: Ventas
   ========================================================= */
function renderSales() {
  const sales = DB.getSales();
  $("#sales-body").innerHTML = sales.map(s => `
    <tr data-id="${s.id}">
      <td>${new Date(s.date).toLocaleDateString("es-PA")}</td>
      <td>${escapeHtml(s.carLabel)}</td>
      <td>${escapeHtml(s.plate)}</td>
      <td>${escapeHtml(s.buyer)}</td>
      <td class="price-cell">${money(s.price)}</td>
      <td><button data-action="delete-sale">Eliminar</button></td>
    </tr>`).join("");
  $("#sales-empty").hidden = sales.length > 0;
}

$("#sales-body").addEventListener("click", e => {
  const btn = e.target.closest("button[data-action='delete-sale']");
  if (!btn) return;
  const id = btn.closest("tr").dataset.id;
  if (confirm("¿Eliminar este registro de venta? (el vehículo no cambiará de estado)")) {
    DB.deleteSale(id);
    renderAll();
    showToast("Venta eliminada");
  }
});

/* ---- Modal: nueva venta ---- */
function openSaleModal() {
  const cars = DB.getCars().filter(c => c.status !== "vendido");
  const select = $("#sale-car");
  select.innerHTML = cars.length
    ? cars.map(c => `<option value="${c.id}">${escapeHtml(c.brand)} ${escapeHtml(c.model)} ${c.year} — ${escapeHtml(c.plate)}</option>`).join("")
    : `<option value="">No hay vehículos disponibles</option>`;
  $("#sale-buyer").value = "";
  $("#sale-price").value = "";
  $("#sale-date").value = new Date().toISOString().slice(0, 10);
  $("#sale-modal-backdrop").classList.add("open");
}
function closeSaleModal() { $("#sale-modal-backdrop").classList.remove("open"); }

$("#btn-new-sale").addEventListener("click", openSaleModal);
$("#sale-form").addEventListener("submit", e => {
  e.preventDefault();
  const carId = $("#sale-car").value;
  const car = DB.getCars().find(c => c.id === carId);
  if (!car) { showToast("Selecciona un vehículo válido"); return; }

  DB.addSale({
    carId: car.id,
    carLabel: `${car.brand} ${car.model} ${car.year}`,
    plate: car.plate,
    buyer: $("#sale-buyer").value.trim(),
    date: $("#sale-date").value,
    price: Number($("#sale-price").value),
  });
  DB.updateCar(car.id, { status: "vendido" });
  closeSaleModal();
  renderAll();
  showToast("Venta registrada");
});

/* =========================================================
   Modales: cierre genérico
   ========================================================= */
$$("[data-close]").forEach(btn => btn.addEventListener("click", () => {
  closeCarModal();
  closeSaleModal();
}));
$$(".modal-backdrop").forEach(bg => bg.addEventListener("click", e => {
  if (e.target === bg) { closeCarModal(); closeSaleModal(); }
}));
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeCarModal(); closeSaleModal(); }
});

/* =========================================================
   Arranque
   ========================================================= */
function renderAll() {
  renderDashboard();
  renderInventory();
  renderSales();
}

DB.seedIfEmpty();
renderAll();
