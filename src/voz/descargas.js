// Descarga por adelantado el audio de un capítulo, pasaje a pasaje, para
// oírlo luego sin conexión. Una descarga por capítulo; se puede cancelar.
const A_LA_VEZ = 2;

export function crearDescargas({ guardar, alAvanzar }) {
  const activas = new Map();           // grupo → {hechos, total, cancelada}

  return {
    estado: (grupo) => activas.get(grupo) ?? null,

    cancelar(grupo) {
      const d = activas.get(grupo);
      if (d) d.cancelada = true;
    },

    // pedidos: lo que recibe guardar(). Devuelve 'hecha' | 'cancelada'; lanza si falla.
    async descargar(grupo, pedidos) {
      if (activas.has(grupo)) return 'en-curso';
      const d = { hechos: 0, total: pedidos.length, cancelada: false };
      activas.set(grupo, d);
      alAvanzar(grupo, d);
      const cola = [...pedidos];
      let fallo = null;

      const obrero = async () => {
        while (cola.length && !d.cancelada && !fallo) {
          const pedido = cola.shift();
          try {
            await guardar(pedido);
          } catch (err) {
            fallo = err;
            return;
          }
          d.hechos++;
          alAvanzar(grupo, d);
        }
      };

      await Promise.all(Array.from({ length: A_LA_VEZ }, obrero));
      activas.delete(grupo);
      alAvanzar(grupo, null);
      if (fallo) throw fallo;
      return d.cancelada ? 'cancelada' : 'hecha';
    },
  };
}
