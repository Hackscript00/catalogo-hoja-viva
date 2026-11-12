/* =====================================================================
   panel/panel.js — Panel de la emprendedora (pestaña «Hoy» del editor)
   ---------------------------------------------------------------------
   Tres bloques, pensados para usar en la feria con una mano:
   1. ¿Dónde estás hoy?  → En el muelle/feria · Desde casa · Cerrado
   2. Productos          → interruptor Disponible / Agotado en un toque
   3. Ventas             → pedidos por WhatsApp, ventas concretadas,
                           ingresos y lo más pedido (comun/metricas.js)
   Los cambios de 1 y 2 se guardan solos en la planilla (la tienda los
   muestra en unos minutos). Las ventas quedan en este teléfono.
   El editor le pasa sus funciones con HVPanel.iniciar(api):
     api.datos()      → objeto S del editor ({biz, prods, est})
     api.guardar()    → guarda la planilla (promesa true/false)
     api.marcar()     → avisa que hay cambios sin guardar
     api.refrescar()  → vuelve a dibujar las otras pestañas
     api.idPlanilla() → id de la planilla (para separar los datos)
     api.publicada()  → true si la página ya tiene link
     api.irA(tab)     → cambia de pestaña
     api.foto(p)      → miniatura de un producto ("" si no tiene)
     api.disponible(v)→ true si el valor de "disponible" significa sí
   ===================================================================== */
(function () {
  var api = null, libro = null, raiz = null, periodo = "7", timer = 0, modo = "pegar", mano = {};
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var clp = function (n) { return "$" + Number(n || 0).toLocaleString("es-CL"); };
  var precio = function (p) { var d = String(p.precio || "").replace(/[^\d]/g, ""); return d ? parseInt(d, 10) : 0; };
  var $ = function (id) { return document.getElementById(id); };

  var TEMAS = [["claro", "Claro", "#FFFFFF"], ["oscuro", "Oscuro", "#172027"], ["vidrio", "Vidrio", "linear-gradient(135deg,#B9E4DA,#D8C9F2)"]];
  var ICON = {
    feria: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h18M4 10l1.5-5h13L20 10"/><path d="M5 10v9h14v-9"/><path d="M9 19v-5h6v5"/><path d="M4 10a2 2 0 0 0 4 0a2 2 0 0 0 4 0a2 2 0 0 0 4 0a2 2 0 0 0 4 0"/></svg>',
    casa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    cerrado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
    mas: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };
  var ESTADOS = [["feria", "En el muelle / feria"], ["casa", "Atendiendo desde casa"], ["cerrado", "Cerrado"]];

  /* ---------- estado del día ---------- */
  function estadoActual() {
    var b = api.datos().biz, e = String(b.estado || "").toLowerCase();
    if (/^cerr/.test(e)) return "cerrado"; if (/^casa/.test(e)) return "casa";
    if (/^feria|^muelle/.test(e) || String(b.hoy || "").trim()) return "feria";
    return "";
  }
  function ponerEstado(v) {
    var b = api.datos().biz;
    b.estado = v;
    if (v === "feria" && !String(b.hoy || "").trim()) b.hoy = b.lugar || "";
    if (v === "cerrado") b.hoy = "";
    cambio("Avisando en tu página…");
    pintarEstado();
  }

  /* ---------- guardado automático (con pausa para juntar varios toques) ---------- */
  function cambio(txt) {
    api.marcar(); estadoSync("", txt || "Guardando…");
    clearTimeout(timer);
    timer = setTimeout(function () {
      estadoSync("", '<span class="spin" aria-hidden="true"></span> Guardando…', true);
      api.guardar().then(function (ok) {
        if (!ok) return estadoSync("err", "No se pudo guardar. Revisa tu internet; lo intentamos de nuevo al próximo cambio.");
        if (api.publicada()) estadoSync("ok", "Listo. Tus clientas lo verán en tu página en unos minutos.");
        else estadoSync("", 'Guardado. Tu página aún no está publicada. <button type="button" class="d-go" data-go="publicar">Publicarla</button>', true);
        api.refrescar();
      });
    }, 1200);
  }
  function estadoSync(cls, html, esHtml, id) {
    var el = $(id || "dSync"); if (!el) return;
    el.className = "d-sync" + (cls ? " " + cls : "");
    if (esHtml) el.innerHTML = html; else el.textContent = html;
  }

  /* ---------- dibujo ---------- */
  function esqueleto() {
    raiz.innerHTML =
      '<div class="dash" id="dash">' +
      '<div class="d-head"><div><p>Tu panel de hoy</p><h2 id="dNom"></h2></div>' +
      '<div class="d-temas" role="radiogroup" aria-label="Aspecto del panel">' +
      TEMAS.map(function (t) { return '<button type="button" role="radio" data-tema="' + t[0] + '" aria-checked="false"><i style="background:' + t[2] + '"></i>' + t[1] + '</button>'; }).join("") +
      '</div></div>' +
      '<section class="d-card" aria-labelledby="dEstT"><h3 id="dEstT">¿Dónde estás hoy?</h3>' +
      '<div class="d-estado" role="radiogroup" aria-labelledby="dEstT">' +
      ESTADOS.map(function (e) { return '<button type="button" role="radio" data-v="' + e[0] + '" aria-checked="false">' + ICON[e[0]] + '<span>' + e[1] + '</span></button>'; }).join("") +
      '</div>' +
      '<label class="d-lugar" id="dLugarW">Lugar exacto <input type="text" id="dLugar" maxlength="80" placeholder="Ej: Muelle de Angelmó, hasta las 18:00"></label>' +
      '<div class="d-chips" id="dChips"></div>' +
      '<p class="d-sync" id="dSync" role="status" aria-live="polite"></p></section>' +
      '<section class="d-card" aria-labelledby="dProT"><div class="d-row"><h3 id="dProT">Productos</h3><p class="d-mut" id="dStock"></p></div>' +
      '<ul class="d-prods" id="dProds"></ul></section>' +
      '<section class="d-card d-full" aria-labelledby="dVenT"><div class="d-row"><h3 id="dVenT">Ventas por WhatsApp</h3>' +
      '<div class="d-per" role="group" aria-label="Periodo">' +
      [["hoy", "Hoy"], ["7", "7 días"], ["30", "30 días"], ["todo", "Todo"]].map(function (p) { return '<button type="button" data-per="' + p[0] + '" aria-pressed="false">' + p[1] + '</button>'; }).join("") +
      '</div></div>' +
      '<div class="d-kpis" id="dKpis"></div>' +
      '<button type="button" class="d-btn" id="dNuevo">' + ICON.mas + 'Llegó un pedido por WhatsApp</button>' +
      '<p class="d-sync" id="dSyncV" role="status" aria-live="polite"></p><div id="dPendW"></div>' +
      '<div><h4 style="margin:4px 0 10px">Lo más pedido</h4><ol class="d-top" id="dTop"></ol></div>' +
      '<details class="d-hist" id="dHist"><summary>Ver todos los pedidos</summary><ul id="dHistL"></ul></details>' +
      '<p class="d-mut">Las ventas se guardan solo en este teléfono. Tus clientas no las ven.</p></section>' +
      '</div>' + dialogo();
    eventos();
  }
  function dialogo() {
    return '<dialog class="d-dlg" id="dDlg" aria-labelledby="dDlgT"><form method="dialog" id="dForm">' +
      '<h3 id="dDlgT">Llegó un pedido</h3>' +
      '<div class="d-modo" role="tablist" aria-label="Cómo anotarlo"><button type="button" role="tab" data-modo="pegar" aria-selected="true">Pegar el mensaje</button><button type="button" role="tab" data-modo="mano" aria-selected="false">Anotar a mano</button></div>' +
      '<div id="dModoPegar"><label>Copia el mensaje de WhatsApp y pégalo aquí<textarea id="dTexto" placeholder="Hola! Quiero hacer este pedido (Pedido #K7Q2): • 2 x Mermelada — $7.000 …"></textarea></label><div class="d-leido" id="dLeido" role="status"></div></div>' +
      '<div id="dModoMano" hidden><ul class="d-mano" id="dMano"></ul><label>Nombre de la clienta (opcional)<input type="text" id="dCliente" maxlength="60"></label></div>' +
      '<label class="d-check"><input type="checkbox" id="dYa"> Ya está pagado: contarlo como venta concretada</label>' +
      '<p class="d-tot">Total: <b id="dTot">$0</b></p><p class="err" id="dErr" role="alert" hidden></p>' +
      '<div class="d-acc"><button type="button" class="btn sec" id="dCan">Cancelar</button><button type="button" class="btn" id="dOk">Guardar pedido</button></div>' +
      '</form></dialog>';
  }
  function pintarTema(t) {
    $("dash").setAttribute("data-tema", t);
    raiz.querySelectorAll("[data-tema]").forEach(function (b) { if (b.tagName === "BUTTON") b.setAttribute("aria-checked", String(b.dataset.tema === t)); });
  }
  function pintarEstado() {
    var S = api.datos(), b = S.biz, e = estadoActual();
    $("dNom").textContent = b.nombre || "Tu negocio";
    raiz.querySelectorAll(".d-estado button").forEach(function (x) { x.setAttribute("aria-checked", String(x.dataset.v === e)); });
    $("dLugarW").hidden = e === "cerrado" || !e;
    $("dLugarW").firstChild.textContent = e === "casa" ? "Comuna o sector (opcional) " : "Lugar exacto ";
    if (document.activeElement !== $("dLugar")) $("dLugar").value = b.hoy || "";
    var ops = [b.lugar].concat(String(b.lugar || "").split(/[,;·]/)).map(function (x) { return String(x || "").trim(); })
      .filter(function (x, i, a) { return x && a.indexOf(x) === i && x !== b.hoy; }).slice(0, 3);
    $("dChips").innerHTML = e === "feria" ? ops.map(function (o) { return '<button type="button" data-lugar="' + esc(o) + '">' + esc(o) + '</button>'; }).join("") : "";
  }
  function pintarProductos() {
    var S = api.datos(), P = S.prods.filter(function (p) { return String(p.nombre || "").trim(); });
    var agot = P.filter(function (p) { return !api.disponible(p.disponible); }).length;
    $("dStock").textContent = P.length ? (P.length - agot) + " disponibles · " + agot + " agotado" + (agot === 1 ? "" : "s") : "";
    $("dProds").innerHTML = P.length ? P.map(function (p) {
      var i = S.prods.indexOf(p), on = api.disponible(p.disponible), f = api.foto(p);
      return '<li class="' + (on ? "" : "agotado") + '"><span class="d-th"' + (f ? ' style="background-image:url(\'' + esc(f) + '\')"' : "") + '></span>' +
        '<span class="d-pn"><b>' + esc(p.nombre) + '</b><span>' + (precio(p) ? clp(precio(p)) : "Sin precio") + '</span></span>' +
        '<button type="button" class="d-sw" role="switch" aria-checked="' + on + '" data-i="' + i + '" aria-label="' + esc(p.nombre) + ' disponible"><span>' + (on ? "Disponible" : "Agotado") + '</span><i></i></button></li>';
    }).join("") : '<li style="display:block"><div class="d-vacio">Aún no tienes productos. <button type="button" class="d-go" data-go="productos">Agregar productos</button></div></li>';
  }
  function pintarVentas() {
    var r = libro.resumen(periodo);
    raiz.querySelectorAll("[data-per]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.per === periodo)); });
    $("dKpis").innerHTML =
      kpi("big", "Ingresos (ventas concretadas)", clp(r.ingresos), r.concretadas ? "Promedio por venta: " + clp(r.ticket) : "Aún sin ventas cerradas") +
      kpi("", "Pedidos por WhatsApp", r.pedidos, r.pendientes ? r.pendientes + " por confirmar" : "mensajes que te llegaron") +
      kpi("", "Ventas concretadas", r.concretadas, r.pedidos ? r.conversion + "% de los pedidos" : "—");
    var pend = libro.datos.pedidos.filter(function (x) { return x.estado === "pendiente"; });
    $("dPendW").innerHTML = pend.length ? '<h4 style="margin:4px 0 10px">Por confirmar</h4><ul class="d-pend">' + pend.slice(0, 8).map(function (x) {
      return '<li><div class="d-pt"><span>#' + esc(x.id) + (x.cliente ? " · " + esc(x.cliente) : "") + '</span><span>' + clp(x.total) + '</span></div>' +
        '<p class="d-pi">' + esc(resumenItems(x)) + ' · ' + hace(x.fecha) + '</p>' +
        '<div class="d-pa"><button type="button" class="ok" data-ok="' + esc(x.id) + '">✓ Venta concretada</button><button type="button" data-no="' + esc(x.id) + '">No se concretó</button></div></li>';
    }).join("") + '</ul>' : "";
    var max = r.top.length ? r.top[0].q : 1;
    $("dTop").innerHTML = r.top.length ? r.top.map(function (t) {
      return '<li><div class="d-tl"><span>' + esc(t.n) + '</span><b>' + t.q + ' u.</b></div><div class="d-bar" aria-hidden="true"><i style="width:' + Math.max(6, Math.round(t.q / max * 100)) + '%"></i></div></li>';
    }).join("") : '<li class="d-vacio">Cuando anotes pedidos, aquí verás qué es lo que más te piden.</li>';
    var todos = libro.datos.pedidos;
    $("dHist").hidden = !todos.length;
    $("dHistL").innerHTML = todos.slice(0, 60).map(function (x) {
      var t = x.estado === "concretada" ? "✓ " + clp(x.total) : x.estado === "perdida" ? "<s>" + clp(x.total) + "</s>" : "… " + clp(x.total);
      return '<li><span>#' + esc(x.id) + ' · ' + fecha(x.fecha) + (x.cliente ? " · " + esc(x.cliente) : "") + '</span><span>' + t + ' <button type="button" data-del="' + esc(x.id) + '" aria-label="Borrar pedido ' + esc(x.id) + '">borrar</button></span></li>';
    }).join("");
  }
  function kpi(c, t, v, s) { return '<div class="d-kpi ' + c + '"><small>' + t + '</small><b>' + v + '</b><em>' + s + '</em></div>'; }
  function resumenItems(x) { return (x.items || []).map(function (i) { return i.q + "× " + i.n; }).join(", ") || "Sin detalle"; }
  function fecha(iso) { var d = new Date(iso); return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }); }
  function hace(iso) {
    var m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    return m < 1 ? "recién" : m < 60 ? "hace " + m + " min" : m < 1440 ? "hace " + Math.round(m / 60) + " h" : fecha(iso);
  }

  /* ---------- ventana de pedido ---------- */
  function abrirPedido() {
    mano = {}; $("dTexto").value = ""; $("dLeido").textContent = ""; $("dCliente").value = ""; $("dYa").checked = false; $("dErr").hidden = true;
    var P = api.datos().prods.filter(function (p) { return String(p.nombre || "").trim(); });
    $("dMano").innerHTML = P.map(function (p, k) {
      return '<li><span>' + esc(p.nombre) + ' · ' + clp(precio(p)) + '</span><span class="d-step"><button type="button" data-m="-" data-k="' + k + '" aria-label="Quitar ' + esc(p.nombre) + '">−</button><output id="dQ' + k + '">0</output><button type="button" data-m="+" data-k="' + k + '" aria-label="Sumar ' + esc(p.nombre) + '">+</button></span></li>';
    }).join("") || '<li>Primero agrega productos.</li>';
    elegirModo("pegar"); totalDlg();
    var d = $("dDlg"); if (d.showModal) d.showModal(); else d.setAttribute("open", "");
    setTimeout(function () { $("dTexto").focus(); }, 30);
  }
  function elegirModo(m) {
    modo = m;
    raiz.querySelectorAll("[data-modo]").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.modo === m)); });
    $("dModoPegar").hidden = m !== "pegar"; $("dModoMano").hidden = m !== "mano"; totalDlg();
  }
  function pedidoDlg() {
    var P = api.datos().prods.filter(function (p) { return String(p.nombre || "").trim(); });
    if (modo === "pegar") return window.HV_METRICAS.leerMensaje($("dTexto").value, P);
    var items = Object.keys(mano).filter(function (k) { return mano[k] > 0; }).map(function (k) { return { n: P[k].nombre, q: mano[k], p: precio(P[k]) }; });
    return { id: "", cliente: $("dCliente").value.trim(), items: items, total: items.reduce(function (a, i) { return a + i.q * i.p; }, 0) };
  }
  function totalDlg() {
    var p = pedidoDlg(); $("dTot").textContent = clp(p.total);
    if (modo === "pegar") $("dLeido").innerHTML = $("dTexto").value.trim() ? (p.items.length
      ? "Leí " + p.items.length + " producto" + (p.items.length > 1 ? "s" : "") + (p.id ? " · pedido #" + esc(p.id) : "") + (p.cliente ? " · " + esc(p.cliente) : "") + ":<br>" + esc(resumenItems(p))
      : "No encontré productos en el mensaje. Revisa que sea el mensaje de tu página, o usa «Anotar a mano».") : "";
  }
  function guardarPedido() {
    var p = pedidoDlg();
    if (p.id && libro.existe(p.id)) {
      $("dDlg").close ? $("dDlg").close() : $("dDlg").removeAttribute("open");
      return estadoSync("", "Ese pedido (#" + p.id + ") ya estaba anotado.", false, "dSyncV");
    }
    if (!p.items.length && !p.total) { $("dErr").textContent = modo === "pegar" ? "Pega el mensaje del pedido, o anótalo a mano." : "Suma al menos un producto."; $("dErr").hidden = false; return; }
    var r = libro.agregar(p);
    if ($("dYa").checked) libro.marcar(r.pedido.id, "concretada");
    $("dDlg").close ? $("dDlg").close() : $("dDlg").removeAttribute("open");
    estadoSync(r.repetido ? "" : "ok", r.repetido ? "Ese pedido (#" + r.pedido.id + ") ya estaba anotado." : "Pedido #" + r.pedido.id + " anotado.", false, "dSyncV");
    pintarVentas();
  }

  /* ---------- eventos (delegados, así sirven después de redibujar) ---------- */
  function eventos() {
    raiz.addEventListener("click", function (e) {
      var t = e.target.closest("button"); if (!t || !raiz.contains(t)) return;
      if (t.dataset.tema && t.getAttribute("role") === "radio") { pintarTema(t.dataset.tema); window.Almacen.escribir("hv:dash:tema", t.dataset.tema); return; }
      if (t.closest(".d-estado")) return ponerEstado(t.dataset.v);
      if (t.dataset.lugar) { api.datos().biz.hoy = t.dataset.lugar; pintarEstado(); return cambio(); }
      if (t.classList.contains("d-sw")) {
        var p = api.datos().prods[+t.dataset.i], on = !api.disponible(p.disponible);
        p.disponible = on ? "Sí" : "No"; pintarProductos(); pintarVentas();
        var nb = raiz.querySelector('.d-sw[data-i="' + t.dataset.i + '"]'); if (nb) nb.focus();
        return cambio(on ? p.nombre + " vuelve a estar disponible…" : p.nombre + " queda agotado…");
      }
      if (t.dataset.go) return api.irA(t.dataset.go);
      if (t.dataset.per) { periodo = t.dataset.per; window.Almacen.escribir("hv:dash:periodo", periodo); return pintarVentas(); }
      if (t.id === "dNuevo") return abrirPedido();
      if (t.dataset.ok) { libro.marcar(t.dataset.ok, "concretada"); return pintarVentas(); }
      if (t.dataset.no) { libro.marcar(t.dataset.no, "perdida"); return pintarVentas(); }
      if (t.dataset.del) { if (confirm("¿Borrar el pedido #" + t.dataset.del + "? No se puede deshacer.")) { libro.borrar(t.dataset.del); pintarVentas(); } return; }
      if (t.dataset.modo) return elegirModo(t.dataset.modo);
      if (t.dataset.m) { var k = t.dataset.k; mano[k] = Math.max(0, (mano[k] || 0) + (t.dataset.m === "+" ? 1 : -1)); $("dQ" + k).textContent = mano[k]; return totalDlg(); }
      if (t.id === "dCan") return $("dDlg").close ? $("dDlg").close() : $("dDlg").removeAttribute("open");
      if (t.id === "dOk") return guardarPedido();
    });
    raiz.addEventListener("input", function (e) {
      if (e.target.id === "dLugar") { api.datos().biz.hoy = e.target.value; if (!estadoActual()) api.datos().biz.estado = "feria"; cambio(); }
      if (e.target.id === "dTexto" || e.target.id === "dCliente") totalDlg();
    });
  }

  window.HVPanel = {
    iniciar: function (a) {
      api = a; raiz = $("panelRaiz"); if (!raiz) return;
      esqueleto();
      var t = window.Almacen.leerYa("hv:dash:tema");
      if (!t) t = matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
      pintarTema(t);
      periodo = window.Almacen.leerYa("hv:dash:periodo") || "7";
    },
    /* se llama cada vez que se abre la pestaña o cambia la planilla */
    mostrar: function () {
      if (!api) return;
      var id = api.idPlanilla();
      var listo = function () { pintarEstado(); pintarProductos(); pintarVentas(); };
      if (!libro || libro.id !== id) { libro = new window.HV_METRICAS.Libro(id); libro.id = id; libro.cargar().then(listo); listo(); }
      else listo();
    }
  };
})();
