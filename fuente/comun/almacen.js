/* =====================================================================
   comun/almacen.js — Guardado local con forma de base de datos
   ---------------------------------------------------------------------
   Hoy guarda en localStorage del teléfono. Todas las funciones devuelven
   promesas (async) para que mañana se pueda cambiar por una base de datos
   (Firebase, Supabase, una API propia…) sin tocar el resto del código:
   basta con escribir otro "motor" con los mismos 3 métodos y llamar
   Almacen.usar(nuevoMotor).
   Claves que usa el proyecto:
     hv:dash:tema                 → aspecto del panel (claro | oscuro | vidrio)
     hv:plantilla:<idPlanilla>    → estilo elegido para la tienda (copia local)
     hv:metricas:<idPlanilla>     → pedidos y ventas registrados en el panel
   ===================================================================== */
(function () {
  var motorLocal = {
    leer: function (k) {
      return new Promise(function (ok) {
        try { var v = localStorage.getItem(k); ok(v == null ? null : JSON.parse(v)); } catch (e) { ok(null); }
      });
    },
    escribir: function (k, v) {
      return new Promise(function (ok) {
        try { localStorage.setItem(k, JSON.stringify(v)); ok(true); } catch (e) { ok(false); }
      });
    },
    borrar: function (k) {
      return new Promise(function (ok) { try { localStorage.removeItem(k); } catch (e) {} ok(true); });
    }
  };
  /* Ejemplo de motor remoto (no activo). Se deja para conectar una API:
     var motorApi = {
       leer:     function (k)    { return fetch(API + "/kv/" + encodeURIComponent(k)).then(r => r.ok ? r.json() : null); },
       escribir: function (k, v) { return fetch(API + "/kv/" + encodeURIComponent(k), {method:"PUT", body:JSON.stringify(v)}).then(r => r.ok); },
       borrar:   function (k)    { return fetch(API + "/kv/" + encodeURIComponent(k), {method:"DELETE"}).then(() => true); }
     };  */
  var motor = motorLocal;
  /* Lectura sincrónica solo para cosas de apariencia (evita parpadeos al cargar). */
  function leerYa(k) { try { var v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } }
  window.Almacen = {
    leer: function (k) { return motor.leer(k); },
    escribir: function (k, v) { return motor.escribir(k, v); },
    borrar: function (k) { return motor.borrar(k); },
    leerYa: leerYa,
    usar: function (m) { motor = m || motorLocal; }
  };
})();
