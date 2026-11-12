/* ============================================================
   O3D · Interacciones generales
   ============================================================ */
(function () {
  "use strict";

  const C = window.OD3;
  const $ = (s, ctx) => (ctx || document).querySelector(s);
  const $$ = (s, ctx) => Array.from((ctx || document).querySelectorAll(s));

  /* ---------- WhatsApp ---------- */
  const defaultMsg = "Hola O3D 👋 Quiero cotizar una impresión 3D. ¿Me ayudan?";
  $$("[data-wa]").forEach((a) => {
    const msg = a.dataset.waMsg || defaultMsg;
    a.href = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(msg);
    a.target = "_blank";
    a.rel = "noopener";
  });

  /* ---------- Header ---------- */
  const header = $(".site-header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 30);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Menú móvil ---------- */
  const menuBtn = $("#menuBtn");
  const mobileMenu = $("#mobileMenu");

  function setMenu(open) {
    if (!menuBtn || !mobileMenu) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    if (open) mobileMenu.removeAttribute("inert");
    else mobileMenu.setAttribute("inert", "");
    document.body.classList.toggle("is-locked", open);
  }

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", () => {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    $$("a", mobileMenu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });
    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth > 1040 && menuBtn.getAttribute("aria-expanded") === "true") {
          setMenu(false);
        }
      },
      { passive: true }
    );
  }

  /* ---------- Tabla de materiales ---------- */
  const priceBody = $("#priceBody");
  const tabs = $$(".tab");
  const techLabels = {
    fdm: "FDM · Filamento",
    resin: "Resina · Alta definición"
  };

  function renderTable(tech) {
    if (!priceBody) return;
    const list = C.materials.filter((m) => m.tech === tech);
    priceBody.innerHTML = list
      .map(
        (m) => `<tr>
          <td><strong>${m.name}</strong><small>${m.desc}</small></td>
          <td>${m.use}</td>
        </tr>`
      )
      .join("");
    const note = $("#tableNote");
    if (note) note.textContent = techLabels[tech] + " · Materiales disponibles.";
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
      });
      renderTable(tab.dataset.tech);
    });
  });

  renderTable("fdm");

  /* ---------- FAQ ---------- */
  const faqButtons = $$(".faq__q");
  faqButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq__item");
      const open = btn.getAttribute("aria-expanded") === "true";
      faqButtons.forEach((b) => {
        b.setAttribute("aria-expanded", "false");
        const it = b.closest(".faq__item");
        if (it) it.classList.remove("is-open");
      });
      if (!open) {
        btn.setAttribute("aria-expanded", "true");
        if (item) item.classList.add("is-open");
      }
    });
  });

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Contadores ---------- */
  const counters = $$("[data-count]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    if (reduce) {
      el.textContent = prefix + target.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      return;
    }
    const start = performance.now();
    const dur = 1300;
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = target * eased;
      el.textContent =
        prefix +
        value.toLocaleString("es-CO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) +
        suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateCounter(e.target);
            cio.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  } else {
    counters.forEach(animateCounter);
  }

  /* ---------- Año ---------- */
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- CTA de la escena ---------- */
  const sceneBtn = $("#sceneBtn");
  if (sceneBtn) {
    sceneBtn.addEventListener("click", () => {
      const target = $("#cotizar");
      if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }
})();
