/* =====================================================================
   comun/metricas.js — Pedidos por WhatsApp y ventas concretadas
   ---------------------------------------------------------------------
   ¿Cómo se cuentan los pedidos sin un servidor?
   1. La tienda pone un código corto en cada mensaje («Pedido #K7Q2»).
   2. Cuando a la emprendedora le llega el WhatsApp, lo copia y lo pega
      en su panel (o lo anota a mano). El panel lee productos y total.
   3. Cuando la venta se cierra, toca «Venta concretada».
   Así se cuentan los pedidos que de verdad llegaron, en su teléfono.
   Los clics que NO terminan en mensaje solo se pueden contar con un
   servidor: para eso está registrarClic() y "metricas_url" en
   config.json (vacío = apagado; no se envía nada a ningún lado).
   Datos guardados (Almacen, clave hv:metricas:<idPlanilla>):
   { v:1, pedidos:[{ id, fecha, cliente, items:[{n,q,p}], total,
                     estado:"pendiente"|"concretada"|"perdida", cerrado }] }
   ===================================================================== */
(function () {
  var LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  function codigo() { var s = ""; for (var i = 0; i < 4; i++) s += LETRAS[Math.floor(Math.random() * LETRAS.length)]; return s; }
  var pesos = function (t) { var d = String(t || "").replace(/[^\d]/g, ""); return d ? parseInt(d, 10) : 0; };

  /* Lee el mensaje que arma la tienda:
     «Pedido #K7Q2» · «• 2 x Mermelada — $7.000» · «Total: $7.000» · «Nombre: Ana» */
  function leerMensaje(texto, productos) {
    var t = String(texto || ""), out = { id: "", cliente: "", items: [], total: 0 };
    var m = t.match(/pedido\s*#\s*([A-Z0-9]{3,8})/i); if (m) out.id = m[1].toUpperCase();
    m = t.match(/^\s*nombre\s*:\s*(.+)$/im); if (m) out.cliente = m[1].trim().slice(0, 60);
    t.split(/\r?\n|(?=•)/).forEach(function (l) {
      var x = l.match(/^\s*[•\-*·]?\s*(\d+)\s*[x×]\s*(.+?)\s*[—–-]\s*\$?\s*([\d.,]+)\s*$/i);
      if (x) { var q = parseInt(x[1], 10), sub = pesos(x[3]); out.items.push({ n: x[2].trim(), q: q, p: q ? Math.round(sub / q) : sub }); }
    });
    m = t.match(/total\s*:\s*\$?\s*([\d.,]+)/i);
    out.total = m ? pesos(m[1]) : out.items.reduce(function (a, x) { return a + x.q * x.p; }, 0);
    /* nombres parecidos a los productos de la planilla → nombre oficial */
    if (productos && productos.length) out.items.forEach(function (it) {
      var k = norm(it.n), hit = productos.find(function (p) { return norm(p.nombre) === k; }) ||
        productos.find(function (p) { var a = norm(p.nombre); return a && (a.indexOf(k) >= 0 || k.indexOf(a) >= 0); });
      if (hit) it.n = hit.nombre;
    });
    return out;
  }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }

  function Libro(idPlanilla) { this.clave = "hv:metricas:" + (idPlanilla || "local"); this.datos = { v: 1, pedidos: [] }; }
  Libro.prototype.cargar = function () {
    var self = this;
    return window.Almacen.leer(this.clave).then(function (d) { if (d && d.pedidos) self.datos = d; return self; });
  };
  Libro.prototype.guardar = function () { return window.Almacen.escribir(this.clave, this.datos); };
  Libro.prototype.agregar = function (p) {
    p = p || {};
    var id = (p.id || codigo()).toUpperCase();
    var ya = this.datos.pedidos.find(function (x) { return x.id === id; });
    if (ya) return { pedido: ya, repetido: true };
    var nuevo = { id: id, fecha: new Date().toISOString(), cliente: p.cliente || "", items: p.items || [], total: p.total || 0, estado: "pendiente", cerrado: "" };
    this.datos.pedidos.unshift(nuevo); this.guardar();
    return { pedido: nuevo, repetido: false };
  };
  Libro.prototype.existe = function (id) { id = String(id || "").toUpperCase(); return !!id && this.datos.pedidos.some(function (x) { return x.id === id; }); };
  Libro.prototype.marcar = function (id, estado) {
    var p = this.datos.pedidos.find(function (x) { return x.id === id; });
    if (!p) return null;
    p.estado = estado; p.cerrado = estado === "pendiente" ? "" : new Date().toISOString();
    this.guardar(); return p;
  };
  Libro.prototype.borrar = function (id) {
    this.datos.pedidos = this.datos.pedidos.filter(function (x) { return x.id !== id; }); this.guardar();
  };
  /* periodo: "hoy" | "7" | "30" | "todo" */
  Libro.prototype.resumen = function (periodo) {
    var desde = 0, ahora = new Date();
    if (periodo === "hoy") desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
    else if (periodo === "7" || periodo === "30") desde = ahora.getTime() - parseInt(periodo, 10) * 864e5;
    var P = this.datos.pedidos.filter(function (x) { return new Date(x.fecha).getTime() >= desde; });
    var ok = P.filter(function (x) { return x.estado === "concretada"; });
    var ingresos = ok.reduce(function (a, x) { return a + (x.total || 0); }, 0);
    var cuenta = {};
    P.forEach(function (x) { (x.items || []).forEach(function (it) { cuenta[it.n] = (cuenta[it.n] || 0) + (it.q || 1); }); });
    var top = Object.keys(cuenta).map(function (n) { return { n: n, q: cuenta[n] }; }).sort(function (a, b) { return b.q - a.q; }).slice(0, 5);
    return {
      pedidos: P.length, concretadas: ok.length,
      pendientes: P.filter(function (x) { return x.estado === "pendiente"; }).length,
      conversion: P.length ? Math.round(ok.length / P.length * 100) : 0,
      ingresos: ingresos, ticket: ok.length ? Math.round(ingresos / ok.length) : 0, top: top
    };
  };

  /* Desde la tienda: avisa de un clic en «Enviar pedido por WhatsApp».
     Solo envía si hay un servidor configurado (metricas_url). */
  function registrarClic(url, datos) {
    if (!url) return false;
    try {
      var cuerpo = JSON.stringify({ tipo: "clic_whatsapp", fecha: new Date().toISOString(), tienda: datos.tienda || "", pedido: datos.pedido || "", total: datos.total || 0, items: datos.items || 0 });
      if (navigator.sendBeacon) return navigator.sendBeacon(url, new Blob([cuerpo], { type: "text/plain" }));
      fetch(url, { method: "POST", body: cuerpo, mode: "no-cors", keepalive: true }); return true;
    } catch (e) { return false; }
  }
  window.HV_METRICAS = { Libro: Libro, leerMensaje: leerMensaje, codigo: codigo, registrarClic: registrarClic };
})();
