# AudioBible

La Biblia leída en voz alta con voces neuronales y resaltado palabra por
palabra, en español e inglés. App web estática, pública y gratuita, hermana de
[Lyrio](https://github.com/bimcana/Lyrio).

**Estado:** fases 1, 2 y 3 de 6 terminadas. La app abre cualquier capítulo de las
diez versiones y lo lee en voz alta con karaoke, y permite añadir una Biblia
propia desde un PDF. Faltan: uso sin conexión, herramientas de estudio y planes.

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
