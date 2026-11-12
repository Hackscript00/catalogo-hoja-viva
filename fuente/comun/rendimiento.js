/* =====================================================================
   comun/rendimiento.js — Modo liviano automático
   ---------------------------------------------------------------------
   Pone la clase "lite" en <html> cuando conviene una página simple:
   - la persona pidió menos movimiento (prefers-reduced-motion)
   - o pidió menos transparencias (prefers-reduced-transparency)
   - el teléfono tiene "ahorro de datos" o la señal es 2G
   - el teléfono es sencillo (poca memoria o pocos núcleos, en pantalla táctil)
   - la batería está bajo 20 % y sin cargar (si el navegador lo informa)
   Con "lite" se apagan el desenfoque (backdrop-filter), la inclinación 2.5D
   y las animaciones; la página se ve igual de ordenada, pero más plana.
   Para probar: agrega ?lite=1 (forzar) o ?lite=0 (nunca) al link.
   Se incluye en línea al construir (build.py), así no suma descargas.
   ===================================================================== */
(function () {
  var html = document.documentElement, motivos = [];
  var mm = function (q) { try { return matchMedia(q).matches; } catch (e) { return false; } };
  var forzar = null;
  try { forzar = new URLSearchParams(location.search).get("lite"); } catch (e) {}

  if (mm("(prefers-reduced-motion: reduce)")) motivos.push("menos movimiento");
  if (mm("(prefers-reduced-transparency: reduce)")) motivos.push("menos transparencias");
  var c = navigator.connection || {};
  if (c.saveData) motivos.push("ahorro de datos");
  if (/(^|-)2g$/.test(String(c.effectiveType || ""))) motivos.push("señal 2G");
  var tactil = mm("(pointer: coarse)");
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) motivos.push("poca memoria");
  if (tactil && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) motivos.push("teléfono sencillo");

  function aplicar() {
    var on = forzar === "1" ? true : forzar === "0" ? false : motivos.length > 0;
    html.classList.toggle("lite", on);
    window.HV_LITE = { activo: on, motivos: motivos.slice() };
    try { document.dispatchEvent(new CustomEvent("hv:lite", { detail: window.HV_LITE })); } catch (e) {}
  }
  aplicar();

  /* Batería: solo algunos navegadores la informan (Chrome en Android). */
  if (navigator.getBattery) {
    navigator.getBattery().then(function (b) {
      function rev() {
        var i = motivos.indexOf("batería baja");
        var baja = !b.charging && b.level <= 0.2;
        if (baja && i < 0) motivos.push("batería baja");
        if (!baja && i >= 0) motivos.splice(i, 1);
        aplicar();
      }
      rev(); b.addEventListener("levelchange", rev); b.addEventListener("chargingchange", rev);
    }).catch(function () {});
  }
  /* Si la persona cambia la preferencia con la página abierta */
  ["(prefers-reduced-motion: reduce)", "(prefers-reduced-transparency: reduce)"].forEach(function (q, n) {
    try {
      matchMedia(q).addEventListener("change", function (e) {
        var m = n ? "menos transparencias" : "menos movimiento", i = motivos.indexOf(m);
        if (e.matches && i < 0) motivos.push(m); if (!e.matches && i >= 0) motivos.splice(i, 1);
        aplicar();
      });
    } catch (e) {}
  });
})();
