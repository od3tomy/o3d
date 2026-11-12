/* ============================================================
   O3D · Configuración
   ------------------------------------------------------------
   Todo lo que necesitas cambiar (WhatsApp, precios, materiales)
   está en este archivo. No toques el resto si no es necesario.
   ============================================================ */

window.OD3 = {
  brand: "O3D",
  city: "Manizales, Colombia",
  whatsapp: "573235816293",
  phoneDisplay: "+57 323 581 6293",
  hours: "Lun a Sáb · 9:00 a 18:00",
  locale: "es-CO",
  currency: "COP",

  // Ajustes internos de precio y recargos (no se muestran en la web)
  minOrder: 15000,
  expressFee: 0.35,

  // Descuentos por cantidad (se aplica el mayor que cumpla)
  volumeDiscounts: [
    { min: 5,  off: 0.10 },
    { min: 10, off: 0.15 }
  ],

  // Acabados
  finishes: [
    { id: "none",     label: "Sin acabado (crudo)", price: 0,     days: 0 },
    { id: "sanded",   label: "Lijado y limpieza",   price: 6000,  days: 1 },
    { id: "painted",  label: "Pintura profesional", price: 15000, days: 2 },
    { id: "assembly", label: "Ensamblaje",          price: 8000,  days: 1 }
  ],

  // Entrega
  shipping: [
    { id: "pickup",   label: "Recoger en Manizales", price: 0 },
    { id: "local",    label: "Domicilio en Manizales", price: 7000 },
    { id: "national", label: "Envío nacional", price: 18000 }
  ],

  // Urgencia
  urgency: [
    { id: "normal",  label: "Normal",  mult: 1 },
    { id: "express", label: "Exprés",  mult: 1.35 }
  ],

  /* ------------------------------------------------------------
     MATERIALES
     pricePerGram : precio en COP por gramo
     min          : mínimo por pieza en COP
     density      : g/cm³ (para calcular por dimensiones)
     speed        : gramos por hora (para tiempo de máquina)
     machineRate  : COP por hora de máquina
     labor        : mano de obra base por pieza (COP)
     ------------------------------------------------------------ */
  materials: [
    {
      id: "pla", tech: "fdm", name: "PLA", use: "Prototipos, decoración y uso general",
      desc: "El más económico y fácil de imprimir.",
      pricePerGram: 120, min: 12000, density: 1.24,
      speed: 12, machineRate: 1500, labor: 4000
    },
    {
      id: "pla-plus", tech: "fdm", name: "PLA+", use: "Piezas resistentes y funcionales",
      desc: "Mayor resistencia al impacto que el PLA.",
      pricePerGram: 140, min: 14000, density: 1.24,
      speed: 12, machineRate: 1500, labor: 4000
    },
    {
      id: "petg", tech: "fdm", name: "PETG", use: "Exterior, agua y químicos suaves",
      desc: "Resistente, flexible y estable.",
      pricePerGram: 150, min: 15000, density: 1.27,
      speed: 11, machineRate: 1600, labor: 4000
    },
    {
      id: "abs", tech: "fdm", name: "ABS", use: "Automotriz y altas temperaturas",
      desc: "Aguanta calor y golpes.",
      pricePerGram: 170, min: 17000, density: 1.04,
      speed: 10, machineRate: 1800, labor: 5000
    },
    {
      id: "tpu", tech: "fdm", name: "TPU flexible", use: "Empaques, agarres y sellos",
      desc: "Flexible, tipo caucho.",
      pricePerGram: 240, min: 24000, density: 1.21,
      speed: 6, machineRate: 2000, labor: 6000
    },
    {
      id: "resin-std", tech: "resin", name: "Resina estándar", use: "Miniaturas y alto detalle",
      desc: "Superficie lisa y detalles finos.",
      pricePerGram: 380, min: 30000, density: 1.10,
      speed: 18, machineRate: 2500, labor: 6000
    },
    {
      id: "resin-abs", tech: "resin", name: "Resina ABS-like", use: "Piezas funcionales de alta resistencia",
      desc: "Tough: resiste caídas y esfuerzo.",
      pricePerGram: 450, min: 35000, density: 1.12,
      speed: 18, machineRate: 2800, labor: 6500
    },
    {
      id: "resin-flex", tech: "resin", name: "Resina flexible", use: "Sellos, prótesis y agarres",
      desc: "Elástica, con memoria de forma.",
      pricePerGram: 520, min: 40000, density: 1.08,
      speed: 16, machineRate: 2800, labor: 7000
    }
  ]
};
