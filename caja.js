const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzHTqutKTumpQYfdE0GhCz0g2s8gdbWNJf-9GM1PwtOsAIL9trjam4H57c3PTbOQf4G/exec";

const PRECIO_COMBO_USD = 5;

let TASA_BCV = 0;

let stockSabores = {
  "Dominó": 0,
  "Catira": 0,
  "Pelúa": 0,
  "Reina Pepiada": 0,
  "Rumbera": 0,
  "Akuai": 0,
  "Coordinadores": 0
};

const sabores = ["Catira", "Pelúa", "Reina Pepiada", "Rumbera", "Akuai"];

const form = document.getElementById("cajaForm");
const coordinadorForm = document.getElementById("coordinadorForm");

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function mostrarModal(texto, titulo = "Caja Arefest") {
  setText("modalTitle", titulo);
  setText("modalText", texto);
  document.getElementById("modal").style.display = "grid";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}

function formatoUsd(n) {
  return Number(n || 0).toFixed(2);
}

function formatoBs(n) {
  return Number(n || 0).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function cambiarVista(vista) {
  const vistaVenta = document.getElementById("vistaVenta");
  const vistaCoordinadores = document.getElementById("vistaCoordinadores");
  const tabVenta = document.getElementById("tabVenta");
  const tabCoordinadores = document.getElementById("tabCoordinadores");

  if (vista === "coordinadores") {
    vistaVenta.classList.add("hidden");
    vistaCoordinadores.classList.remove("hidden");
    tabVenta.classList.remove("active");
    tabCoordinadores.classList.add("active");
    cargarCoordinadoresDisponibles();
    return;
  }

  vistaCoordinadores.classList.add("hidden");
  vistaVenta.classList.remove("hidden");
  tabCoordinadores.classList.remove("active");
  tabVenta.classList.add("active");
}

function renderSabores() {
  const cont = document.getElementById("sabores");
  cont.innerHTML = "";

  sabores.forEach(sabor => {
    const id = sabor
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-");

    const row = document.createElement("div");
    row.className = "flavor-row";

    row.innerHTML = `
      <div>
        <strong>${sabor}</strong>
        <small id="stock-${id}">Disponible: ${stockSabores[sabor] || 0}</small>
      </div>

      <div class="flavor-controls">
        <button type="button" onclick="cambiarSabor('${id}', -1)">−</button>
        <input id="${id}" data-sabor="${sabor}" value="0" readonly>
        <button type="button" onclick="cambiarSabor('${id}', 1)">+</button>
      </div>
    `;

    cont.appendChild(row);
  });
}

async function cargarStock() {
  try {
    const res = await fetch(`${WEB_APP_URL}?action=stock`);
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "No se pudo cargar stock.");

    stockSabores = {
      "Dominó": Number(data.stock["Dominó"] || 0),
      "Catira": Number(data.stock["Catira"] || 0),
      "Pelúa": Number(data.stock["Pelúa"] || 0),
      "Reina Pepiada": Number(data.stock["Reina Pepiada"] || 0),
      "Rumbera": Number(data.stock["Rumbera"] || 0),
      "Akuai": Number(data.stock["Akuai"] || 0),
      "Coordinadores": Number(data.stock["Coordinadores"] || 0)
    };

    setText("stock-domino", `${stockSabores["Dominó"]} disponibles`);
    setText("stock-coordinadores", `${stockSabores["Coordinadores"]} disponibles`);

    renderSabores();
    actualizarResumen();

  } catch (error) {
    mostrarModal("No se pudo cargar el stock: " + error.message, "Error");
  }
}

async function cargarCoordinadoresDisponibles() {
  const select = document.getElementById("coordinadorNombre");
  if (!select) return;

  try {
    select.innerHTML = `<option value="">Cargando coordinadores...</option>`;

    const res = await fetch(`${WEB_APP_URL}?action=coordinadores_disponibles`);
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "No se pudieron cargar coordinadores.");

    const coordinadores = data.coordinadores || [];

    select.innerHTML = `<option value="">Selecciona un coordinador</option>`;

    if (!coordinadores.length) {
      select.innerHTML = `<option value="">No quedan coordinadores por acreditar</option>`;
      return;
    }

    coordinadores.forEach(nombre => {
      const option = document.createElement("option");
      option.value = nombre;
      option.textContent = nombre;
      select.appendChild(option);
    });

  } catch (error) {
    select.innerHTML = `<option value="">Error cargando lista</option>`;
    mostrarModal("No se pudieron cargar los coordinadores: " + error.message, "Error");
  }
}

async function cargarTasa() {
  try {
    const res = await fetch(`${WEB_APP_URL}?action=bcv`);
    const data = await res.json();

    if (data.ok && Number(data.tasa) > 0) {
      TASA_BCV = Number(data.tasa);
    }

    actualizarResumen();

  } catch {
    TASA_BCV = 0;
    actualizarResumen();
  }
}

function cambiarCombos(cambio) {
  const input = document.getElementById("combos");

  let actual = Number(input.value || 1);
  let nuevo = actual + cambio;

  if (nuevo < 1) nuevo = 1;

  if (nuevo > stockSabores["Dominó"]) {
    mostrarModal(`Solo quedan ${stockSabores["Dominó"]} combo(s) disponibles.`);
    nuevo = stockSabores["Dominó"];
  }

  input.value = nuevo;

  resetSabores();
  actualizarResumen();
}

function resetSabores() {
  document.querySelectorAll("[data-sabor]").forEach(input => {
    input.value = 0;
  });
}

function obtenerSeleccionSabores() {
  const inputs = document.querySelectorAll("[data-sabor]");
  let total = 0;
  const detalle = {};

  inputs.forEach(input => {
    const sabor = input.dataset.sabor;
    const cantidad = Number(input.value || 0);

    detalle[sabor] = cantidad;
    total += cantidad;
  });

  return { total, detalle };
}

function cambiarSabor(id, cambio) {
  const input = document.getElementById(id);
  const sabor = input.dataset.sabor;
  const combos = Number(document.getElementById("combos").value || 1);
  const seleccion = obtenerSeleccionSabores();

  let actual = Number(input.value || 0);

  if (cambio > 0) {
    if (seleccion.total >= combos) {
      mostrarModal(`Ya elegiste los ${combos} sabor(es) necesarios.`);
      return;
    }

    if (actual >= Number(stockSabores[sabor] || 0)) {
      mostrarModal(`No hay más stock de ${sabor}.`);
      return;
    }

    input.value = actual + 1;
  } else {
    if (actual > 0) input.value = actual - 1;
  }

  actualizarResumen();
}

function actualizarResumen() {
  const combos = Number(document.getElementById("combos").value || 1);
  const seleccion = obtenerSeleccionSabores();

  setText("saboresResumen", `Has seleccionado ${seleccion.total} de ${combos} sabor(es).`);

  const totalUsd = combos * PRECIO_COMBO_USD;
  const totalBs = totalUsd * TASA_BCV;

  setText("totalUsd", formatoUsd(totalUsd));
  setText("tasaBcv", TASA_BCV > 0 ? formatoBs(TASA_BCV) : "--");
  setText("totalBs", TASA_BCV > 0 ? formatoBs(totalBs) : "--");
}

function archivoABase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");

    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

form.addEventListener("submit", async function(e) {
  e.preventDefault();

  const submit = document.querySelector("#cajaForm .submit");

  const combos = Number(document.getElementById("combos").value || 1);
  const seleccion = obtenerSeleccionSabores();

  const nombre = document.getElementById("nombre").value.trim();
  const cedula = document.getElementById("cedula").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const email = document.getElementById("email").value.trim();
  const cajero = document.getElementById("cajero").value.trim();
  const metodo = document.getElementById("metodo").value;
  const referencia = document.getElementById("referencia").value.trim();
  const capture = document.getElementById("capture").files[0];

  if (!nombre) return mostrarModal("Falta el nombre del comprador.");
  if (!cedula) return mostrarModal("Falta la cédula.");
  if (!whatsapp) return mostrarModal("Falta el WhatsApp.");
  if (!email) return mostrarModal("Falta el correo electrónico.");
  if (!cajero) return mostrarModal("Falta el nombre del cajero.");
  if (!metodo) return mostrarModal("Selecciona el método de pago.");

  if (metodo !== "Efectivo $" && !referencia) {
    return mostrarModal("Coloca la referencia del pago.");
  }

  if (seleccion.total !== combos) {
    return mostrarModal(`Debes seleccionar ${combos} sabor(es). Actualmente seleccionaste ${seleccion.total}.`);
  }

  if (combos > stockSabores["Dominó"]) {
    return mostrarModal(`No hay suficientes combos. Disponible: ${stockSabores["Dominó"]}.`);
  }

  try {
    submit.disabled = true;
    submit.textContent = "Registrando...";

    const captureBase64 = await archivoABase64(capture);

    const datos = new URLSearchParams();

    datos.append("action", "venta_dia");
    datos.append("nombre", nombre);
    datos.append("cedula", cedula);
    datos.append("whatsapp", whatsapp);
    datos.append("email", email);
    datos.append("cajero", cajero);
    datos.append("combos", combos);

    datos.append("catira", seleccion.detalle["Catira"] || 0);
    datos.append("pelua", seleccion.detalle["Pelúa"] || 0);
    datos.append("reina", seleccion.detalle["Reina Pepiada"] || 0);
    datos.append("rumbera", seleccion.detalle["Rumbera"] || 0);
    datos.append("akuai", seleccion.detalle["Akuai"] || 0);

    datos.append("bebida", `Café x${combos}, Papelón con Limón x${combos}`);
    datos.append("metodo", metodo);
    datos.append("referencia", referencia);
    datos.append("capture_base64", captureBase64);

    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: datos
    });

    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "No se pudo registrar.");

    mostrarModal(
      `Venta registrada correctamente.\nTotal: $${formatoUsd(data.total_usd)} / Bs ${formatoBs(data.total_bs)}`,
      "Venta lista"
    );

    form.reset();
    document.getElementById("combos").value = 1;
    resetSabores();

    await cargarStock();
    actualizarResumen();

  } catch (error) {
    mostrarModal(error.message, "No se pudo registrar");
  } finally {
    submit.disabled = false;
    submit.textContent = "Registrar venta y entregar";
  }
});

coordinadorForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  const submit = document.querySelector("#coordinadorForm .submit");
  const nombre = document.getElementById("coordinadorNombre").value.trim();
  const acreditadoPor = document.getElementById("acreditadoPor").value.trim();

  if (!nombre) return mostrarModal("Selecciona un coordinador.");
  if (!acreditadoPor) return mostrarModal("Falta el nombre de quien acredita.");

  try {
    submit.disabled = true;
    submit.textContent = "Acreditando...";

    const datos = new URLSearchParams();
    datos.append("action", "acreditar_coordinador");
    datos.append("nombre", nombre);
    datos.append("acreditado_por", acreditadoPor);

    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: datos
    });

    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "No se pudo acreditar.");

    mostrarModal(`${nombre} acreditado correctamente.`, "Acreditación lista");

    document.getElementById("coordinadorNombre").value = "";
    await cargarStock();
    await cargarCoordinadoresDisponibles();

  } catch (error) {
    mostrarModal(error.message, "No se pudo acreditar");
  } finally {
    submit.disabled = false;
    submit.textContent = "Acreditar y entregar";
  }
});

window.addEventListener("load", async () => {
  renderSabores();
  await cargarStock();
  await cargarTasa();
  await cargarCoordinadoresDisponibles();

  setInterval(cargarStock, 15000);
});