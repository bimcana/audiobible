# AudioBible

La Biblia leída en voz alta con voces neuronales y resaltado palabra por
palabra, en español e inglés. App web estática, pública y gratuita, hermana de
[Lyrio](https://github.com/bimcana/Lyrio).

**App:** https://bimcana.github.io/audiobible/

**Estado:** versión 1 completa.

- Diez versiones libres, cinco en español y cinco en inglés.
- Lectura continua en voz alta, sin pronunciar los números de versículo, con
  resaltado palabra por palabra.
- Audio descargable por capítulo para oírlo sin conexión.
- Búsqueda, comparación de versiones, subrayados, notas, marcadores y
  referencias cruzadas.
- Planes de lectura.
- Importador para leer una Biblia propia desde un PDF, guardada solo en el
  dispositivo.

Para verla en local: `python -m http.server 8095` y abrir
`http://localhost:8095`.

## Carpetas

| Carpeta | Qué es |
|---|---|
| `data/` | Los textos: un archivo por libro y versión, el catálogo y las referencias cruzadas. Se genera, no se edita a mano. |
| `herramientas/` | Scripts que descargan, convierten y verifican los textos. |
| `src/` | Código de la app. |
| `pruebas/` | Pruebas automáticas de la lógica. |
| `docs/superpowers/` | Especificación de diseño y planes por fase. |

## Órdenes

Requiere Node 24 o posterior. No hay dependencias que instalar.

```bash
npm test
```

```bash
npm run datos
```

`npm run datos` regenera `data/` entera. Las fuentes se guardan en
`herramientas/.cache/` para no descargarlas de nuevo.

## Versiones incluidas

Español: Reina-Valera 1909, Reina Valera Gómez, Nueva Biblia Viva, Versión
Biblia Libre, Palabra de Dios para ti. Inglés: King James Version, Berean
Standard Bible, World English Bible, American Standard Version, Literal
Standard Version. La licencia y el aviso de cada una están en
`data/versiones.json`.

## Documentación

**[CONTINUIDAD.md](CONTINUIDAD.md)** recoge las decisiones, las reglas que
nacieron de los datos reales y las vías ya descartadas. Empieza por ahí.
