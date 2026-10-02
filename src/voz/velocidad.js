/* Reparto de la velocidad entre el motor y el reproductor. Traído de Lyrio.

   A 1,00× el motor va un punto por encima de su velocidad neutra: ahí la
   lectura suena como la de una persona y no como un dictado. Por encima de
   TOPE_MOTOR el motor se come la articulación y las pausas, así que el resto
   se consigue acelerando el audio ya generado, con el tono corregido. */
export const VELOCIDAD_MAXIMA = 2.0;
export const VELOCIDAD_MINIMA = 0.5;
const RITMO_NATURAL = 1.10;
const TOPE_MOTOR = 1.6;

export function repartoVelocidad(v) {
  const objetivo = v <= 1
    ? v * RITMO_NATURAL
    : RITMO_NATURAL + (v - 1) * (VELOCIDAD_MAXIMA - RITMO_NATURAL);
  const motor = Math.round(Math.min(TOPE_MOTOR, objetivo) * 100) / 100;
  return { motor, reproductor: Math.round((objetivo / motor) * 1000) / 1000, total: objetivo };
}
