/* =====================================================================
   estilos_tienda/plantillas.js — Aplica el estilo elegido en la tienda
   ---------------------------------------------------------------------
   Orden para saber qué estilo usar:
   1. ?plantilla=… en el link (la dueña lo prueba desde el editor)
   2. lo que dice la planilla (fila "plantilla")
   3. copia guardada en este teléfono de la última visita (evita parpadeo)
   Necesita comun/plantillas.js (HV_PLANTILLAS) y comun/rendimiento.js.
   ===================================================================== */
(function () {
  var html = document.documentElement;
  var qp = new URLSearchParams(location.search);
  var sid = (qp.get("s") || "").replace(/[^\w-]/g, "");
  var CLAVE = "hv:plantilla:tienda:" + (sid || location.pathname);
  var deLink = window.HV_PLANTILLAS ? HV_PLANTILLAS.normalizar(qp.get("plantilla")) : "";

  function poner(id) {
    if (id) html.setAttribute("data-plantilla", id); else html.removeAttribute("data-plantilla");
  }
  /* Llamar con el valor de la planilla. Devuelve el id aplicado. */
  function aplicar(valorPlanilla) {
    var id = deLink || (window.HV_PLANTILLAS ? HV_PLANTILLAS.normalizar(valorPlanilla) : "");
    poner(id);
    if (!deLink) { try { if (id) localStorage.setItem(CLAVE, id); else localStorage.removeItem(CLAVE); } catch (e) {} }
    return id;
  }
  /* Al abrir: link o copia guardada, antes de pintar nada */
  (function () {
    var guardado = ""; try { guardado = localStorage.getItem(CLAVE) || ""; } catch (e) {}
    poner(deLink || guardado);
  })();
  function actual() { return html.getAttribute("data-plantilla") || ""; }
  function animaOK() { return !html.classList.contains("lite") && actual() !== "clasico"; }
  function inclinaOK() { return actual() === "vitrina25d" && !html.classList.contains("lite"); }

  /* ---------- Vitrina 2.5D: inclinación con dedo o mouse ---------- */
  function activarInclinacion(grid) {
    if (!grid || grid.__hvTilt) return; grid.__hvTilt = true;
    var card = null, art = null, px = 0, py = 0, raf = 0;
    function pintar() {
      raf = 0; if (!card || !art) return;
      var r = art.getBoundingClientRect();
      var x = Math.min(1, Math.max(0, (px - r.left) / r.width)) - .5;
      var y = Math.min(1, Math.max(0, (py - r.top) / r.height)) - .5;
      var s = card.style;
      s.setProperty("--ry", (x * 16).toFixed(2) + "deg");
      s.setProperty("--rx", (-y * 13).toFixed(2) + "deg");
      s.setProperty("--sx", (-x * 22).toFixed(1) + "px");
      s.setProperty("--sy", (14 - y * 14).toFixed(1) + "px");
      s.setProperty("--gx", ((x + .5) * 100).toFixed(0) + "%");
      s.setProperty("--gy", ((y + .5) * 100).toFixed(0) + "%");
    }
    function soltar() {
      if (!card) return;
      ["--rx", "--ry", "--sx", "--sy", "--gx", "--gy"].forEach(function (k) { card.style.removeProperty(k); });
      card.classList.remove("tilting"); card = art = null;
    }
    function mover(e) {
      if (!inclinaOK()) return;
      var a = e.target.closest && e.target.closest(".art"), c = a && a.closest(".card");
      if (!c || c.classList.contains("out")) { if (e.pointerType === "mouse") soltar(); return; }
      if (c !== card) { soltar(); card = c; art = a; card.classList.add("tilting"); }
      px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(pintar);
    }
    grid.addEventListener("pointerdown", mover, { passive: true });
    grid.addEventListener("pointermove", mover, { passive: true });
    grid.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") soltar(); }, { passive: true });
    grid.addEventListener("pointercancel", soltar, { passive: true });
    grid.addEventListener("pointerleave", soltar, { passive: true });
    document.addEventListener("scroll", function () { if (card && card.classList.contains("tilting")) soltar(); }, { passive: true });
  }

  /* Marca el producto estrella (el primero de la lista completa) y lo hace saludar una vez */
  var saludo = false;
  function marcarEstrella(grid, mostrandoTodo) {
    if (!grid) return;
    var cards = grid.querySelectorAll(".card");
    cards.forEach(function (c, i) { c.classList.toggle("estrella", actual() === "vitrina25d" && mostrandoTodo && i === 0); });
    var e = grid.querySelector(".card.estrella");
    if (e && !saludo && inclinaOK() && "IntersectionObserver" in window) {
      saludo = true;
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { e.classList.add("saluda"); setTimeout(function () { e.classList.remove("saluda"); }, 1800); io.disconnect(); }
      }, { threshold: .6 });
      io.observe(e);
    }
  }
  window.HV_TIENDA_ESTILO = { aplicar: aplicar, actual: actual, animaOK: animaOK, inclinaOK: inclinaOK, activarInclinacion: activarInclinacion, marcarEstrella: marcarEstrella };
})();
