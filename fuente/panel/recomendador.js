/* =====================================================================
   panel/recomendador.js — «¿Cómo verán tu tienda tus clientas?»
   ---------------------------------------------------------------------
   Muestra los 4 estilos (comun/plantillas.js) con una mini tienda hecha
   con los productos y colores reales de la emprendedora, marca el
   recomendado según lo que vende y guarda la elección:
   - en la planilla (fila "plantilla"): es lo que ven las clientas
   - en este teléfono (Almacen, hv:plantilla:<idPlanilla>): copia local
   El editor le pasa sus funciones con HVRecomendador.iniciar(api):
     api.datos(), api.marcar(), api.idPlanilla(), api.rubro(),
     api.colores()  → {fondo,tarjetas,texto,destacado,acento} actuales
     api.foto(p)    → miniatura del producto ("" si no tiene)
     api.colorProd(p) → color de respaldo del producto
     api.urlTienda()  → link de la tienda publicada ("" si no hay)
   ===================================================================== */
(function () {
  var api = null, raiz = null;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var clp = function (n) { return "$" + Number(n || 0).toLocaleString("es-CL"); };
  var PL = function () { return window.HV_PLANTILLAS; };

  function infoNegocio() {
    var P = api.datos().prods.filter(function (p) { return String(p.nombre || "").trim(); });
    return {
      rubro: api.rubro(), productos: P.length,
      conFoto: P.filter(function (p) { return String(p.foto || "").trim(); }).length,
      sinFondo: P.filter(function (p) { return /#sinfondo/i.test(String(p.foto || "")); }).length
    };
  }
  function actual() { return PL().normalizar(api.datos().biz.plantilla); }

  /* colores de la mini tienda para cada estilo */
  function colores(id) {
    var c = api.colores(), p = PL().paleta(id, {}, { accent: c.destacado, sea: c.acento });
    var propio = api.datos().est || {};
    var f = function (k) { return propio[k] || p[k] || c[k]; };
    var acc = f("destacado"), on = PL().contraste(acc, "#14161A") >= PL().contraste(acc, "#FFFFFF") ? "#14161A" : "#FFFFFF";
    return "--m-paper:" + f("fondo") + ";--m-sheet:" + f("tarjetas") + ";--m-ink:" + f("texto") + ";--m-acc:" + acc + ";--m-onacc:" + on + ";--m-sea:" + f("acento");
  }
  function mini(id) {
    var S = api.datos(), b = S.biz;
    var P = S.prods.filter(function (p) { return String(p.nombre || "").trim(); }).slice(0, 2);
    while (P.length < 2) P.push({ nombre: P.length ? "Otro producto" : "Tu producto", precio: "3500", color: "verde" });
    return '<div class="pl-mini pl-' + id + '" style="' + colores(id) + '" aria-hidden="true">' +
      '<div class="m-top"><i></i><span>' + esc(b.nombre || "Tu negocio") + '</span></div><div class="m-grid">' +
      P.map(function (p) {
        var f = api.foto(p), pr = String(p.precio || "").replace(/[^\d]/g, "");
        return '<div class="m-card"><div class="m-art">' + (f ? '<img src="' + esc(f) + '" alt="" loading="lazy">' : '<span class="m-color" style="--c:' + esc(api.colorProd(p)) + '"></span>') + '</div>' +
          '<div class="m-b"><b>' + esc(p.nombre) + '</b><span class="m-tag">' + clp(pr) + '</span></div></div>';
      }).join("") + '</div>' + (id === "vitrina25d" ? '<span class="m-hint">Pasa el dedo por la foto</span>' : "") + '</div>';
  }

  function pintar() {
    if (!api || !raiz) return;
    var L = PL().lista, rec = PL().recomendar(infoNegocio()), sel = actual(), url = api.urlTienda();
    var lite = document.documentElement.classList.contains("lite");
    raiz.innerHTML =
      '<h3 id="plT">¿Cómo verán tu tienda tus clientas?</h3>' +
      '<p class="muted small" style="margin:0">Cuatro estilos. Te marcamos el que mejor va con lo que vendes. Toca «Usar este» y después «Guardar».</p>' +
      '<p class="pl-porque"><b>Recomendado: ' + esc(L[rec.id].nombre) + '.</b> ' + esc(rec.porque) + '</p>' +
      '<div class="pl-grid" role="radiogroup" aria-labelledby="plT">' +
      PL().orden.map(function (id) {
        var p = L[id], on = sel === id;
        return '<div class="pl-card' + (on ? " sel" : "") + '">' + mini(id) +
          '<div class="pl-txt">' + (on ? '<span class="pl-sel">Tu estilo actual</span>' : id === rec.id ? '<span class="pl-badge">Recomendado para ti</span>' : "") +
          '<b>' + esc(p.nombre) + '</b><small>' + esc(p.apodo) + '</small>' +
          '<p class="pl-ideal">Ideal para: ' + esc(p.ideal.toLowerCase()) + '</p><p>' + esc(p.texto) + '</p>' +
          (p.paleta ? '<p>Trae sus propios colores. Si cambias colores más abajo, mandan los tuyos.</p>' : "") + '</div>' +
          '<div class="pl-acc"><button type="button" class="btn sm' + (on ? " sec" : "") + '" role="radio" aria-checked="' + on + '" data-pl="' + id + '">' + (on ? "✓ En uso" : "Usar este") + '</button>' +
          (url ? '<a class="btn quiet sm" target="_blank" rel="noopener" href="' + esc(url + "&plantilla=" + id) + '">Probar en mi página</a>' : "") + '</div></div>';
      }).join("") + '</div>' +
      (sel ? '<button type="button" class="btn quiet sm" data-pl="" style="justify-self:start">Volver al diseño de siempre</button>' : "") +
      (lite ? '<p class="small muted" style="margin:0">Este teléfono está en modo liviano (ahorro de batería, de datos o menos movimiento): aquí y en tu página los efectos se ven más simples para que todo ande rápido.</p>' : "") +
      (url ? "" : '<p class="small muted" style="margin:0">Cuando publiques tu página vas a poder probar cada estilo en ella antes de elegir.</p>');
  }

  function elegir(id) {
    var b = api.datos().biz;
    b.plantilla = id;
    window.Almacen.escribir("hv:plantilla:" + api.idPlanilla(), id);
    api.marcar(); pintar();
    var btn = raiz.querySelector('[data-pl="' + id + '"]') || raiz.querySelector("[data-pl]"); if (btn) btn.focus();
  }

  /* inclinación de la mini vitrina 2.5D */
  var actualCard = null;
  function soltar() {
    if (!actualCard) return;
    actualCard.classList.remove("tilting");
    ["--rx", "--ry", "--sx", "--sy"].forEach(function (k) { actualCard.style.removeProperty(k); });
    actualCard = null;
  }
  function inclinar(e) {
    var art = !document.documentElement.classList.contains("lite") && e.target.closest && e.target.closest(".pl-vitrina25d .m-art");
    if (!art) return soltar();
    var card = art.parentNode, r = art.getBoundingClientRect();
    if (card !== actualCard) { soltar(); actualCard = card; card.classList.add("tilting"); }
    var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    card.style.setProperty("--ry", (x * 18).toFixed(1) + "deg"); card.style.setProperty("--rx", (-y * 14).toFixed(1) + "deg");
    card.style.setProperty("--sx", (-x * 14).toFixed(1) + "px"); card.style.setProperty("--sy", (10 - y * 8).toFixed(1) + "px");
  }

  window.HVRecomendador = {
    iniciar: function (a) {
      api = a; raiz = document.getElementById("plantRaiz"); if (!raiz) return;
      raiz.addEventListener("click", function (e) { var t = e.target.closest("[data-pl]"); if (t) elegir(t.dataset.pl); });
      raiz.addEventListener("pointermove", inclinar, { passive: true });
      raiz.addEventListener("pointerdown", inclinar, { passive: true });
      raiz.addEventListener("pointerleave", soltar, { passive: true });
      raiz.addEventListener("pointercancel", soltar, { passive: true });
      raiz.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") soltar(); }, { passive: true });
      document.addEventListener("hv:lite", pintar);
    },
    mostrar: pintar
  };
})();
