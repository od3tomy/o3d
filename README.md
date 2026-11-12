# O3D · Impresión 3D en Manizales

Sitio web de una página para el taller **O3D**, con cotizador automático, contacto por WhatsApp y una escena animada de impresoras 3D de las que saltan objetos impresos.

**Sitio publicado:** https://od3tomy.github.io/o3d/  
**Repositorio:** https://github.com/od3tomy/o3d

Hecho con **HTML + CSS + JavaScript puro**. Sin frameworks, sin build, sin dependencias.

> La animación de las impresoras y los objetos que saltan está hecha con un `<canvas>` real dentro del hero (`js/scene.js`), no con un video ni con una imagen.

---

## Ver el sitio

Abre `index.html` directamente en el navegador. También puedes servirlo con cualquier servidor estático:

```bash
npx serve .
# o
python -m http.server 8080
```

> Si abres el archivo con doble clic, el cotizador y las animaciones funcionan igual. Solo necesitas internet para cargar las fuentes de Google (Anton + Inter); hay fallback a fuentes del sistema.

---

## Estructura

```
OD3/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── config.js     ← marca, WhatsApp y TODOS los precios
│   ├── quote.js      ← lógica del cotizador y mensaje de WhatsApp
│   ├── scene.js      ← impresoras y objetos 3D animados en canvas
│   └── main.js       ← menú, tabla de materiales, FAQ, animaciones
├── assets/
│   ├── favicon.svg
│   ├── logo.svg
│   ├── qr-o3d.png
│   ├── qr-o3d-plain.png
│   ├── qr-o3d.svg
│   ├── estado-whatsapp-o3d.png
│   └── img/
│       └── taller.webp
└── README.md
```

> `referencia.webp` y `watermarked_img_*.webp` son archivos de trabajo (referencia de diseño y foto original del taller). No se usan en el sitio; puedes borrarlos antes de publicar.

---

## Cambiar el WhatsApp

En `js/config.js`:

```js
whatsapp: "573235816293",        // sin +, sin espacios
phoneDisplay: "+57 323 581 6293", // como se muestra en el sitio
```

El número se usa en todos los botones, en el botón flotante y en el mensaje prellenado del cotizador.

---

## Cambiar precios y materiales

Todo está en `js/config.js`.

Cada material tiene:

| Campo | Qué es |
|---|---|
| `pricePerGram` | Precio en COP por gramo |
| `min` | Mínimo por pieza en COP |
| `density` | Densidad g/cm³ (para calcular por dimensiones) |
| `speed` | Gramos por hora de impresión |
| `machineRate` | COP por hora de máquina |
| `labor` | Mano de obra base por pieza |
| `tech` | `fdm` o `resin` |
| `use` | Texto de la columna «Ideal para» en la tabla |

### Fórmula del cotizador

```
material      = gramos × pricePerGram
máquina       = (gramos / speed) × machineRate
unitario      = max(material + máquina + labor, min)
subtotal      = unitario × cantidad
descuento     = subtotal × descuento por cantidad (5+ = 10%, 10+ = 15%)
acabado       = precio del acabado × cantidad
urgencia      = (subtotal con descuento + acabado) × 35% si es exprés
total         = subtotal + acabado + urgencia + envío
```

El resultado se redondea a los $500 más cercanos y se muestra con un rango de **±10%**. Si el total queda por debajo de `minOrder`, se aplica un ajuste interno de producción.

> La tabla pública de materiales muestra solo el material y su uso recomendado. Los precios por gramo y los mínimos se usan internamente en el cotizador.

### Peso por dimensiones

Si el cliente activa **«Calcular por dimensiones»**, se estima:

- **FDM:** volumen × (0.10 + 0.30 × relleno) × densidad × 1.05
- **Resina:** volumen × 0.85 × densidad

Es una aproximación. Para un precio exacto, lo ideal es revisar el archivo real.

### Acabados, envíos y urgencia

También se editan en `js/config.js`:

```js
finishes: [ { id, label, price, days } ... ]
shipping: [ { id, label, price } ... ]
urgency:  [ { id, label, mult } ... ]
```

---

## Personalizar textos y datos del negocio

- **Testimonios, estadísticas (+250 piezas, 4.9/5), «Est. 2021» y horarios** son contenido de ejemplo. Reemplázalos por datos reales antes de publicar.
- Los enlaces de Instagram y correo no se incluyeron porque no fueron suministrados.
- La foto del taller está en `assets/img/taller.webp`.
- El `README` no modifica el sitio: todo el contenido visible está en `index.html` y `js/config.js`.

---

## La escena animada (objetos saltando de las impresoras)

`js/scene.js` dibuja en un `<canvas>`:

- 3 impresoras 3D en perspectiva isométrica, con base, pórtico, extrusor, carrete girando y cama caliente.
- Objetos generados en 3D (cubo, icosaedro, toro, engranaje, jarrón y soporte en L) que se «imprimen» en la cama, saltan, giran, rebotan y se desvanecen.
- Partículas y un parallax suave con el mouse.

Se pausa automáticamente cuando sale de pantalla y respeta `prefers-reduced-motion` (en ese caso muestra una composición estática).

Para cambiar la cantidad de impresoras o su posición, edita `applyLayout()` y el arreglo `printers`. Para agregar más objetos, añade una malla en `js/scene.js` y súmala a `MESHES`.

---

## Compartir

- **Link directo:** https://od3tomy.github.io/o3d/
- **Link corto:** https://is.gd/o3dco
- **Imagen vertical para estado de WhatsApp:** [`assets/estado-whatsapp-o3d.png`](assets/estado-whatsapp-o3d.png)
- **QR con marca:** [`assets/qr-o3d.png`](assets/qr-o3d.png)
- **QR plano:** [`assets/qr-o3d-plain.png`](assets/qr-o3d-plain.png)
- **QR vectorial (imprimir):** [`assets/qr-o3d.svg`](assets/qr-o3d.svg)

![QR para abrir O3D](assets/qr-o3d.png)

> El QR de la imagen de estado apunta al link corto `is.gd/o3dco`. Para tener un dominio 100 % propio (por ejemplo `o3d.co`) hay que comprarlo y conectarlo a GitHub Pages.

---

## Publicar y actualizar

El sitio está publicado con **GitHub Pages** desde la rama `main`, carpeta raíz. Cada push a `main` reconstruye la página en 1–2 minutos.

Para publicar cambios:

```bash
git add .
git commit -m "Describe el cambio"
git push
```

La URL pública es:

```
https://od3tomy.github.io/o3d/
```

### Otros hostings

También funciona en Netlify (arrastrar la carpeta), Vercel (`npx vercel`) o cualquier servidor estático.

### Dominio propio
Apunta el dominio al hosting y actualiza las etiquetas `og:image` y `og:url` en `index.html` cuando tengas la URL final.

---

## Checklist antes de publicar

- [ ] Reemplazar el número de WhatsApp si cambia.
- [ ] Revisar precios y ajustes internos (`js/config.js`).
- [ ] Cambiar testimonios, estadísticas y año de fundación por datos reales.
- [ ] Revisar horarios, envíos, garantía y formas de pago de las preguntas frecuentes.
- [ ] Probar el cotizador en celular y enviar una cotización de prueba a WhatsApp.
- [ ] Reemplazar la foto del taller si tienes fotos nuevas.
- [ ] Verificar que el dominio y la imagen OG estén actualizados.

---

© O3D · Manizales, Colombia
