/* ============================================================
   O3D · Cotizador automático
   ============================================================ */
(function () {
  "use strict";

  const C = window.OD3;
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  const money = (n) =>
    "$" + Math.round(n).toLocaleString("es-CO", { maximumFractionDigits: 0 });

  const form = $("#quoteForm");
  if (!form) return;

  const els = {
    material:     $("#qMaterial"),
    materialNote: $("#qMaterialNote"),
    useDims:      $("#qUseDims"),
    weightRow:    $("#weightRow"),
    weight:       $("#qWeight"),
    dims:         $("#dimsField"),
    infillField:  $("#infillField"),
    infill:       $("#qInfill"),
    infillOut:    $("#qInfillOut"),
    dimL:         $("#qL"),
    dimW:         $("#qW"),
    dimH:         $("#qH"),
    qty:          $("#qQty"),
    finish:       $("#qFinish"),
    shipping:     $("#qShipping"),
    name:         $("#qName"),
    notes:        $("#qNotes"),
    file:         $("#qFile"),
    fileLabel:    $("#qFileLabel"),
    total:        $("#qTotal"),
    range:        $("#qRange"),
    grams:        $("#qGrams"),
    delivery:     $("#qDelivery"),
    minOrder:     $("#qMinOrder"),
    breakdown:    $("#qBreakdown"),
    weightHint:   $("#qWeightHint"),
    minNote:      $("#qMinNote"),
    wa:           $("#qWa"),
    copy:         $("#qCopy")
  };

  let fileName = "";
  let lastSummary = "";

  const num = (el, fallback) => {
    const v = parseFloat(el && el.value);
    return Number.isFinite(v) ? v : fallback;
  };

  const tech = () =>
    ($('input[name="tech"]:checked') || {}).value || "fdm";

  const urgencyOpt = () =>
    C.urgency.find((u) => u.id === (($('input[name="urgency"]:checked') || {}).value || "normal")) ||
    C.urgency[0];

  const materialOpt = () =>
    C.materials.find((m) => m.id === els.material.value) ||
    C.materials.find((m) => m.tech === tech()) ||
    C.materials[0];

  const finishOpt = () =>
    C.finishes.find((f) => f.id === els.finish.value) || C.finishes[0];

  const shippingOpt = () =>
    C.shipping.find((s) => s.id === els.shipping.value) || C.shipping[0];

  /* ---------- selects dinámicos ---------- */
  function fillMaterials(keepValue) {
    const list = C.materials.filter((m) => m.tech === tech());
    const current = keepValue && list.some((m) => m.id === keepValue) ? keepValue : list[0].id;
    els.material.innerHTML = list
      .map((m) => `<option value="${m.id}">${m.name}</option>`)
      .join("");
    els.material.value = current;
  }

  function fillStatic() {
    els.finish.innerHTML = C.finishes
      .map((f) => `<option value="${f.id}">${f.label}</option>`)
      .join("");
    els.shipping.innerHTML = C.shipping
      .map((s) => `<option value="${s.id}">${s.label}</option>`)
      .join("");
  }

  function syncUI() {
    const useDims = els.useDims.checked;
    els.weightRow.hidden = useDims;
    els.dims.hidden = !useDims;
    els.infillField.hidden = tech() !== "fdm";

    const m = materialOpt();
    els.materialNote.textContent = m.desc;

    if (useDims) {
      els.infillOut.textContent = els.infill.value + "%";
    }
  }

  /* ---------- cálculo ---------- */
  function compute() {
    const m = materialOpt();
    const isResin = m.tech === "resin";
    const qty = Math.max(1, Math.min(500, Math.round(num(els.qty, 1)) || 1));
    const useDims = els.useDims.checked;

    let grams;
    if (useDims) {
      const l = Math.max(0.5, num(els.dimL, 8));
      const w = Math.max(0.5, num(els.dimW, 8));
      const h = Math.max(0.5, num(els.dimH, 8));
      const volume = l * w * h; // cm³
      if (isResin) {
        grams = volume * 0.85 * m.density;
      } else {
        const infill = Math.max(5, Math.min(100, num(els.infill, 20))) / 100;
        grams = volume * (0.10 + 0.30 * infill) * m.density * 1.05;
      }
    } else {
      grams = Math.max(0.5, num(els.weight, 120));
    }
    grams = Math.max(1, grams);

    const materialCost = grams * m.pricePerGram;
    const hours = grams / m.speed;
    const machineCost = hours * m.machineRate;
    const baseUnit = materialCost + machineCost + m.labor;
    const unit = Math.max(baseUnit, m.min);
    const minAdjust = Math.max(0, m.min - baseUnit);

    const discount =
      C.volumeDiscounts.filter((d) => qty >= d.min).sort((a, b) => b.off - a.off)[0] || null;

    const subtotal = unit * qty;
    const discountAmount = discount ? subtotal * discount.off : 0;
    const afterDiscount = subtotal - discountAmount;

    const finish = finishOpt();
    const finishCost = finish.price * qty;

    const urg = urgencyOpt();
    const urgencyCost = (afterDiscount + finishCost) * (urg.mult - 1);

    const shipping = shippingOpt();
    let total = afterDiscount + finishCost + urgencyCost + shipping.price;

    let minNote = "";
    if (total < C.minOrder) {
      total = C.minOrder;
      minNote = "Se aplicó el pedido mínimo de " + money(C.minOrder) + ".";
    }

    total = Math.round(total / 500) * 500;
    const low = Math.round((total * 0.9) / 500) * 500;
    const high = Math.round((total * 1.1) / 500) * 500;

    let days = 2 + finish.days + Math.ceil(qty / 8);
    if (urg.id === "express") days = Math.max(1, Math.ceil(days * 0.55));
    const delivery = days <= 1 ? "24 – 48 horas" : days + " – " + (days + 1) + " días hábiles";

    return {
      m, isResin, qty, grams, materialCost, machineCost, hours, unit, minAdjust,
      discount, discountAmount, afterDiscount, finish, finishCost,
      urg, urgencyCost, shipping, total, low, high, minNote, delivery,
      useDims
    };
  }

  function rowsFor(q) {
    const rows = [];
    rows.push(["Material", money(q.materialCost), money(q.grams.toFixed(0)) + " g × " + money(q.m.pricePerGram) + "/g"]);
    if (q.minAdjust > 0) {
      rows.push(["Mínimo por pieza", money(q.minAdjust), "ajuste al mínimo de " + q.m.name]);
    }
    rows.push(["Tiempo de máquina", money(q.machineCost), q.hours.toFixed(1) + " h de impresión"]);
    rows.push(["Mano de obra", money(q.m.labor), "preparación y control"]);
    if (q.discountAmount > 0) {
      rows.push(["Descuento por cantidad", "−" + money(q.discountAmount), "−" + Math.round(q.discount.off * 100) + "%"]);
    }
    if (q.finishCost > 0) {
      rows.push([q.finish.label, money(q.finishCost), q.qty + " × " + money(q.finish.price)]);
    }
    if (q.urgencyCost > 0) {
      rows.push(["Urgencia exprés", money(q.urgencyCost), "+" + Math.round((q.urg.mult - 1) * 100) + "%"]);
    }
    if (q.shipping.price > 0) {
      rows.push([q.shipping.label, money(q.shipping.price), ""]);
    }
    return rows;
  }

  function waMessage(q) {
    const lines = [
      "Hola O3D 👋 Quiero cotizar una impresión 3D.",
      "",
      "• Tecnología: " + (q.isResin ? "Resina" : "FDM"),
      "• Material: " + q.m.name,
      "• Peso estimado: " + Math.round(q.grams) + " g",
      "• Cantidad: " + q.qty,
      "• Acabado: " + q.finish.label,
      "• Entrega: " + q.shipping.label,
      "• Urgencia: " + q.urg.label
    ];
    const name = (els.name.value || "").trim();
    const notes = (els.notes.value || "").trim();
    if (name) lines.push("• Nombre: " + name);
    if (notes) lines.push("• Detalle: " + notes);
    if (fileName) lines.push("• Archivo: " + fileName);
    lines.push(
      "",
      "Estimado en la web: " + money(q.total) + " COP",
      "Rango orientativo: " + money(q.low) + " – " + money(q.high) + " COP",
      "",
      "¿Me confirmas disponibilidad y tiempo de entrega?"
    );
    return lines.join("\n");
  }

  function render() {
    syncUI();
    const q = compute();

    els.total.textContent = money(q.total);
    els.range.textContent = "Rango orientativo " + money(q.low) + " – " + money(q.high);
    els.grams.textContent = Math.round(q.grams) + " g";
    els.delivery.textContent = q.delivery;
    if (els.minOrder) els.minOrder.textContent = money(C.minOrder);
    els.minNote.textContent = q.minNote;
    els.minNote.hidden = !q.minNote;

    els.breakdown.innerHTML = rowsFor(q)
      .map(
        ([label, value, hint]) =>
          `<div class="bd__row"><dt>${label}${hint ? `<small>${hint}</small>` : ""}</dt><dd>${value}</dd></div>`
      )
      .join("");

    if (q.useDims) {
      const infillText = q.isResin ? "" : ` con ${els.infill.value}% de relleno`;
      els.weightHint.textContent =
        "Peso estimado por dimensiones" + infillText + ": " + Math.round(q.grams) + " g.";
    } else {
      els.weightHint.textContent =
        "Si no sabes el peso, activa «Calcular por dimensiones».";
    }

    lastSummary = waMessage(q);
    els.wa.href = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(lastSummary);
  }

  /* ---------- eventos ---------- */
  fillStatic();
  fillMaterials();

  $$('input[name="tech"]').forEach((input) => {
    input.addEventListener("change", () => {
      fillMaterials();
      render();
    });
  });

  form.addEventListener("submit", (e) => e.preventDefault());

  form.addEventListener("input", (e) => {
    if (e.target.matches('input[name="tech"]')) return;
    render();
  });

  form.addEventListener("change", (e) => {
    if (e.target === els.file) {
      const f = e.target.files && e.target.files[0];
      if (f && f.size > 50 * 1024 * 1024) {
        fileName = "";
        e.target.value = "";
        els.fileLabel.textContent =
          "El archivo supera los 50 MB. Escríbenos por WhatsApp y coordinamos la entrega.";
        render();
        return;
      }
      fileName = f ? f.name : "";
      els.fileLabel.textContent = fileName
        ? "Archivo seleccionado: " + fileName + " · recuerda adjuntarlo en WhatsApp."
        : "STL, OBJ, 3MF, STEP o ZIP · máx. 50 MB. Lo enviarás en el chat de WhatsApp.";
      render();
      return;
    }
    render();
  });

  $$("[data-step]", form).forEach((btn) => {
    btn.addEventListener("click", () => {
      const delta = parseInt(btn.dataset.step, 10) || 0;
      els.qty.value = Math.max(1, Math.min(500, (parseInt(els.qty.value, 10) || 1) + delta));
      render();
    });
  });

  els.qty.addEventListener("blur", () => {
    els.qty.value = Math.max(1, Math.min(500, parseInt(els.qty.value, 10) || 1));
    render();
  });

  if (els.copy) {
    els.copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(lastSummary);
        const original = els.copy.textContent;
        els.copy.textContent = "¡Resumen copiado!";
        setTimeout(() => (els.copy.textContent = original), 1800);
      } catch (err) {
        const temp = document.createElement("textarea");
        temp.value = lastSummary;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        temp.remove();
      }
    });
  }

  render();

  // Permite que otros scripts (por ejemplo, un botón "Cotizar")
  // consulten el estado actual si lo necesitan.
  window.OD3Quote = { render };
})();
