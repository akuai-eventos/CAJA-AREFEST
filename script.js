const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzHTqutKTumpQYfdE0GhCz0g2s8gdbWNJf-9GM1PwtOsAIL9trjam4H57c3PTbOQf4G/exec";

let stockSabores = {
  "Dominó": 0,
  "Catira": 0,
  "Pelúa": 0,
  "Reina Pepiada": 0,
  "Rumbera": 0,
  "Akuai": 0,
  "Coordinadores": 0
};

const sabores = ["Dominó", "Catira", "Pelúa", "Reina Pepiada", "Rumbera", "Akuai"];
const coordinadorForm = document.getElementById("coordinadorForm");

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function mostrarModal(texto, titulo = "Coordinadores Arefest") {
  setText("modalTitle", titulo);
  setText("modalText", texto);
  document.getElementById("modal").style.display = "grid";
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
}

function saborToId(sabor) {
  return String(sabor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function renderSaboresCoordinador() {
  const cont = document.getElementById("saboresCoordinador");
  if (!cont) return;

  cont.innerHTML = "";

  sabores.forEach(sabor => {
    const id = `coord-${saborToId(sabor)}`;
    const disponible = Number(stockSabores[sabor] || 0);

    const row = document.createElement("div");
    row.className = "flavor-row";

    row.innerHTML = `
      <div>
        <strong>${sabor}</strong>
        <small id="stock-${id}">Disponible: ${disponible}</small>
      </div>

      <div class="flavor-controls">
        <button type="button" onclick="cambiarSaborCoordinador('${id}', -1)">−</button>
        <input id="${id}" data-sabor-coord="${sabor}" value="0" readonly>
        <button type="button" onclick="cambiarSaborCoordinador('${id}', 1)">+</button>
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

    setText("stock-coordinadores", `${stockSabores["Coordinadores"]} disponibles`);
    renderSaboresCoordinador();
    actualizarResumenCoordinador();

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

function cambiarArepasCoordinador(cambio) {
  const input = document.getElementById("coord-arepas-total");
  let actual = Number(input.value || 1);
  let nuevo = actual + cambio;

  if (nuevo < 1) nuevo = 1;

  if (nuevo > 2) {
    mostrarModal("Solo puedes entregar máximo 2 arepas por coordinador: 1 incluida + 1 adicional.");
    nuevo = 2;
  }

  input.value = nuevo;
  resetSaboresCoordinador();
  actualizarResumenCoordinador();
}

function resetSaboresCoordinador() {
  document.querySelectorAll("[data-sabor-coord]").forEach(input => {
    input.value = 0;
  });
}

function obtenerSeleccionSaboresCoordinador() {
  const inputs = document.querySelectorAll("[data-sabor-coord]");
  let total = 0;
  const detalle = {};
  const lista = [];

  inputs.forEach(input => {
    const sabor = input.dataset.saborCoord;
    const cantidad = Number(input.value || 0);

    detalle[sabor] = cantidad;
    total += cantidad;

    if (cantidad > 0) {
      lista.push({ sabor, cantidad });
    }
  });

  return { total, detalle, lista };
}

function cambiarSaborCoordinador(id, cambio) {
  const input = document.getElementById(id);
  if (!input) return;

  const sabor = input.dataset.saborCoord;
  const totalArepas = Number(document.getElementById("coord-arepas-total").value || 1);
  const seleccion = obtenerSeleccionSaboresCoordinador();

  let actual = Number(input.value || 0);
  const disponible = Number(stockSabores[sabor] || 0);

  if (cambio > 0) {
    if (seleccion.total >= totalArepas) {
      mostrarModal(`Ya seleccionaste las ${totalArepas} arepa(s) necesarias.`);
      return;
    }

    if (actual >= disponible) {
      mostrarModal(`No hay más stock de ${sabor}. Disponible: ${disponible}.`);
      return;
    }

    input.value = actual + 1;
  } else {
    if (actual > 0) input.value = actual - 1;
  }

  actualizarResumenCoordinador();
}

function actualizarResumenCoordinador() {
  const totalArepas = Number(document.getElementById("coord-arepas-total")?.value || 1);
  const seleccion = obtenerSeleccionSaboresCoordinador();

  setText("saboresCoordResumen", `Has seleccionado ${seleccion.total} de ${totalArepas} arepa(s).`);

  const resumen = seleccion.lista.length
    ? seleccion.lista.map(item => `${item.sabor} x${item.cantidad}`).join(", ")
    : "arepa a elección";

  const adicional = totalArepas === 2 ? " + 1 arepa adicional" : "";
  setText("beneficioTexto", `${totalArepas} arepa(s): ${resumen}${adicional} + Café x1 + Papelón con Limón x1`);

  const resumenEl = document.getElementById("saboresCoordResumen");
  if (resumenEl) {
    resumenEl.style.color = seleccion.total === totalArepas ? "#1f9d55" : "#777";
  }
}

coordinadorForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  const submit = document.querySelector("#coordinadorForm .submit");
  const nombre = document.getElementById("coordinadorNombre").value.trim();
  const acreditadoPor = document.getElementById("acreditadoPor").value.trim();
  const totalArepas = Number(document.getElementById("coord-arepas-total").value || 1);
  const seleccion = obtenerSeleccionSaboresCoordinador();

  if (!nombre) return mostrarModal("Selecciona un coordinador.");
  if (!acreditadoPor) return mostrarModal("Falta el nombre de quien acredita.");

  if (Number(stockSabores["Coordinadores"] || 0) <= 0) {
    return mostrarModal("Ya no quedan beneficios para coordinadores.");
  }

  if (seleccion.total !== totalArepas) {
    return mostrarModal(`Debes seleccionar ${totalArepas} arepa(s). Actualmente seleccionaste ${seleccion.total}.`);
  }

  for (const item of seleccion.lista) {
    const disponible = Number(stockSabores[item.sabor] || 0);
    if (item.cantidad > disponible) {
      return mostrarModal(`No hay suficiente stock de ${item.sabor}. Disponible: ${disponible}.`);
    }
  }

  try {
    submit.disabled = true;
    submit.textContent = "Acreditando...";

    const resumenSabores = seleccion.lista
      .map(item => `${item.sabor} x${item.cantidad}`)
      .join(", ");

    const datos = new URLSearchParams();
    datos.append("action", "acreditar_coordinador");
    datos.append("nombre", nombre);
    datos.append("acreditado_por", acreditadoPor);
    datos.append("cantidad_arepas", totalArepas);
    datos.append("sabor", seleccion.lista[0]?.sabor || "");
    datos.append("sabores", resumenSabores);
    datos.append("catira", seleccion.detalle["Catira"] || 0);
    datos.append("pelua", seleccion.detalle["Pelúa"] || 0);
    datos.append("reina", seleccion.detalle["Reina Pepiada"] || 0);
    datos.append("rumbera", seleccion.detalle["Rumbera"] || 0);
    datos.append("akuai", seleccion.detalle["Akuai"] || 0);

    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      body: datos
    });

    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "No se pudo acreditar.");

    mostrarModal(`${nombre} acreditado correctamente.\nArepas: ${resumenSabores}`, "Acreditación lista");

    document.getElementById("coordinadorNombre").value = "";
    document.getElementById("coord-arepas-total").value = 1;
    resetSaboresCoordinador();

    await cargarStock();
    await cargarCoordinadoresDisponibles();
    actualizarResumenCoordinador();

  } catch (error) {
    mostrarModal(error.message, "No se pudo acreditar");
  } finally {
    submit.disabled = false;
    submit.textContent = "Acreditar y entregar";
  }
});

window.addEventListener("load", async () => {
  renderSaboresCoordinador();
  await cargarStock();
  await cargarCoordinadoresDisponibles();

  setInterval(cargarStock, 15000);
});
