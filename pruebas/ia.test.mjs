import test from 'node:test';
import assert from 'node:assert/strict';
import { elegirModelos, instruccion, extraerImagen, PROPORCION } from '../src/ia/google.js';

const m = (name, extra = {}) => ({ name: `models/${name}`, displayName: name, supportedGenerationMethods: ['generateContent'], ...extra });

test('de toda la lista de Google quedan solo los modelos que crean imágenes', () => {
  const lista = [m('gemini-3.8-flash'), m('gemini-embedding-001'), m('gemini-2.5-flash-image'), m('text-embedding-004'), m('gemini-3-pro')];
  assert.deepEqual(elegirModelos(lista).map((x) => x.id), ['gemini-2.5-flash-image']);
});

test('ofrece los tres más recientes y capaces: generación nueva primero, luego el más capaz', () => {
  const lista = [
    m('gemini-2.5-flash-image'), m('gemini-3-pro-image'), m('gemini-3.1-flash-lite-image'), m('gemini-3.1-flash-image'),
  ];
  assert.deepEqual(elegirModelos(lista).map((x) => x.id), ['gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image', 'gemini-3-pro-image']);
});

test('un modelo que salga mañana aparece solo, sin tocar la app', () => {
  const lista = [m('gemini-3.1-flash-image'), m('gemini-3-pro-image'), m('gemini-2.5-flash-image'), m('gemini-4-pro-image'), m('gemini-4-flash-image')];
  assert.deepEqual(elegirModelos(lista).map((x) => x.id), ['gemini-4-pro-image', 'gemini-4-flash-image', 'gemini-3.1-flash-image']);
});

test('el provisional sobra si ya existe el estable, y va detrás si no', () => {
  const lista = [m('gemini-4-pro-image-preview'), m('gemini-4-pro-image'), m('gemini-5-flash-image-preview')];
  assert.deepEqual(elegirModelos(lista).map((x) => x.id), ['gemini-5-flash-image-preview', 'gemini-4-pro-image']);
});

test('una lista vacía o ausente no rompe nada', () => {
  assert.deepEqual(elegirModelos([]), []);
  assert.deepEqual(elegirModelos(undefined), []);
});

test('la instrucción lleva el versículo, el formato, dónde dejar sitio y la prohibición de texto', () => {
  const p = instruccion({ texto: 'Jehová es mi pastor;\n nada me faltará.', estilo: 'acuarela', posicion: 'abajo', formato: 'historia' });
  assert.ok(p.includes('"Jehová es mi pastor; nada me faltará."'));
  assert.ok(p.includes('watercolour'));
  assert.ok(p.includes('9:16'));
  assert.ok(p.includes('the lower third'));
  assert.ok(/no text, no letters/.test(p));
  assert.equal(PROPORCION.vertical, '4:5');
});

const base64 = 'A'.repeat(400);

test('lee la imagen de la respuesta clásica (generateContent)', () => {
  const r = { candidates: [{ content: { parts: [{ text: 'Aquí está' }, { inlineData: { mimeType: 'image/png', data: base64 } }] } }] };
  assert.equal(extraerImagen(r), `data:image/png;base64,${base64}`);
});

test('lee la imagen de la respuesta nueva (interactions)', () => {
  const r = { id: 'x', status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'ok' }, { type: 'image', mime_type: 'image/jpeg', data: base64 }] }] };
  assert.equal(extraerImagen(r), `data:image/jpeg;base64,${base64}`);
});

test('lee la imagen de una respuesta de tipo predict', () => {
  assert.equal(extraerImagen({ predictions: [{ bytesBase64Encoded: base64, mimeType: 'image/png' }] }), `data:image/png;base64,${base64}`);
});

test('sin imagen devuelve null, y no confunde un audio ni un texto corto con una', () => {
  assert.equal(extraerImagen({ candidates: [{ content: { parts: [{ text: 'No puedo crear eso.' }] } }] }), null);
  assert.equal(extraerImagen({ steps: [{ content: [{ type: 'audio', mime_type: 'audio/wav', data: base64 }] }] }), null);
  assert.equal(extraerImagen({ id: { data: 'corto' } }), null);
  assert.equal(extraerImagen(null), null);
});
