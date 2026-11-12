/* =====================================================================
   comun/plantillas.js — Los 4 estilos de la tienda pública
   ---------------------------------------------------------------------
   Lo usan el editor (tarjetas de recomendación y vista previa) y la
   tienda (paleta de cada estilo). Se incluye en línea al construir.
   En la planilla se guarda en la fila "plantilla" de la pestaña Tienda:
   clasico | artesanal | glass | vitrina25d   (vacío = diseño de siempre)
   ===================================================================== */
(function () {
  var PLANTILLAS = {
    clasico: {
      id: "clasico", nombre: "Clásico", apodo: "Ultra rápido",
      ideal: "Catálogos simples y máxima velocidad",
      texto: "Fondo blanco, letras del teléfono (no se descargan) y cero efectos. Carga al tiro aunque la señal esté mala en la feria.",
      /* Paleta neutra. destacado/acento: se respetan los de la emprendedora
         si se leen bien sobre blanco; si no, se usan estos. */
      paleta: { fondo: "#F7F7F5", tarjetas: "#FFFFFF", texto: "#1E2329", destacado: "#A6402A", acento: "#2F6F62" },
      mantieneAcentos: true
    },
    artesanal: {
      id: "artesanal", nombre: "Realista artesanal", apodo: "Cálido y cercano",
      ideal: "Comida, tejidos y manualidades",
      texto: "Tonos tierra, crema y madera suave. Fotos grandes y directas, como mirar el producto en tu mesa.",
      paleta: { fondo: "#F3EADB", tarjetas: "#FFF9EF", texto: "#3A2A1F", destacado: "#A4532B", acento: "#6C7A3B", fuente: "Fraunces", fuente_texto: "Instrument Sans" }
    },
    glass: {
      id: "glass", nombre: "Minimal moderno", apodo: "Vidrio (glassmorphism)",
      ideal: "Cosmética, accesorios y marcas modernas",
      texto: "Tarjetas de vidrio con transparencias suaves y bordes limpios, sobre los colores de tu marca.",
      paleta: null /* usa los colores que ya elegiste */
    },
    vitrina25d: {
      id: "vitrina25d", nombre: "Vitrina interactiva 2.5D", apodo: "Para tus productos estrella",
      ideal: "Destacar productos estrella",
      texto: "La foto del producto se inclina suave al pasar el dedo o el mouse, con sombra que se mueve. Tu primer producto sale más grande.",
      paleta: null
    }
  };
  var ORDEN = ["clasico", "artesanal", "glass", "vitrina25d"];

  /* Rubros del editor → estilo recomendado */
  var POR_RUBRO = {
    comida: "artesanal", pan: "artesanal", dulces: "artesanal", cafe: "artesanal", bebidas: "artesanal",
    ropa: "artesanal", artesania: "artesanal", plantas: "artesanal",
    cosmetica: "glass", joyas: "glass",
    papeleria: "clasico"
  };

  /* info = { rubro, productos, conFoto, sinFondo }  → { id, porque } */
  function recomendar(info) {
    info = info || {};
    var n = info.productos || 0;
    if (n >= 15) return { id: "clasico", porque: "Tienes " + n + " productos: con el Clásico tu página carga más rápido y se recorre fácil." };
    if ((info.sinFondo || 0) >= 1 && n > 0 && n <= 8) return { id: "vitrina25d", porque: "Tienes fotos sin fondo y pocos productos: la vitrina 2.5D los hace lucir como en un mostrador." };
    var id = POR_RUBRO[info.rubro] || "clasico";
    var por = {
      artesanal: "Para lo que vendes, los tonos cálidos y naturales dan confianza y abren el apetito.",
      glass: "Para cosmética y accesorios, el vidrio suave se ve moderno y deja brillar tus colores.",
      clasico: "Para un catálogo simple, lo más claro y rápido es lo que mejor vende.",
      vitrina25d: ""
    }[id];
    if (id !== "clasico" && (info.conFoto || 0) === 0 && n > 0) por += " Ojo: se luce mucho más con fotos reales de tus productos.";
    return { id: id, porque: por };
  }

  /* Paleta final de un estilo, mezclando con la de la emprendedora.
     propio = colores elegidos a mano (fondo, texto, …) — siempre ganan.
     tema   = colores del tema actual (paper, ink, accent, sea). */
  function paleta(id, propio, tema) {
    var P = PLANTILLAS[id];
    propio = propio || {};
    if (!P || !P.paleta) return propio;
    var out = {}, k;
    for (k in P.paleta) out[k] = P.paleta[k];
    if (P.mantieneAcentos && tema) {
      if (tema.accent && contraste(tema.accent, "#FFFFFF") >= 3) out.destacado = tema.accent;
      if (tema.sea && contraste(tema.sea, "#FFFFFF") >= 3) out.acento = tema.sea;
    }
    for (k in propio) if (propio[k]) out[k] = propio[k];
    return out;
  }
  function lum(h) {
    h = String(h || "").replace("#", ""); if (h.length !== 6) return 1;
    var c = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  function contraste(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
  function normalizar(v) {
    v = String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
    if (/clasic|rapid/.test(v)) return "clasico";
    if (/artesan|realis/.test(v)) return "artesanal";
    if (/glass|vidrio|minimal/.test(v)) return "glass";
    if (/vitrina|25d|interact/.test(v)) return "vitrina25d";
    return "";
  }
  window.HV_PLANTILLAS = { lista: PLANTILLAS, orden: ORDEN, recomendar: recomendar, paleta: paleta, normalizar: normalizar, contraste: contraste };
})();
