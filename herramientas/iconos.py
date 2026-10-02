"""Genera las opciones de icono de la app en iconos/ y una hoja para compararlas.

    python herramientas/iconos.py

Cada opción es un SVG de 512 × 512 con el dibujo dentro de la zona segura
(el 80 % central), para que Android pueda recortarlo en círculo sin cortarlo.
"""
import os
import pymupdf

PAPEL, TINTA, ROJO, ORO, CUERO = '#F6F5F1', '#1C1B18', '#C8392D', '#D9B45A', '#5B1F1A'

OPCIONES = {
    # Biblia cerrada de cuero, con cruz dorada y cinta.
    'a': ('Cuero y cruz', f'''
  <rect width="512" height="512" fill="{PAPEL}"/>
  <path d="M316 400v74l19-17 19 17v-74z" fill="{ROJO}"/>
  <rect x="140" y="92" width="232" height="318" rx="16" fill="#E7D7AE"/>
  <rect x="132" y="84" width="232" height="318" rx="16" fill="{CUERO}"/>
  <rect x="132" y="84" width="34" height="318" rx="16" fill="#431612"/>
  <rect x="150" y="84" width="16" height="318" fill="#431612"/>
  <rect x="182" y="104" width="164" height="278" rx="8" fill="none" stroke="{ORO}" stroke-width="3" opacity=".7"/>
  <rect x="255" y="160" width="18" height="156" rx="3" fill="{ORO}"/>
  <rect x="213" y="204" width="102" height="18" rx="3" fill="{ORO}"/>
'''),
    # Biblia abierta sobre fondo oscuro, con ondas de voz.
    'b': ('Abierta con voz', f'''
  <rect width="512" height="512" fill="{TINTA}"/>
  <g fill="none" stroke="{ROJO}" stroke-width="15" stroke-linecap="round">
    <path d="M222 150q34-30 68 0"/>
    <path d="M192 118q64-58 128 0"/>
  </g>
  <path d="M256 214c-44-26-104-32-160-18v196c56-14 116-8 160 18z" fill="{PAPEL}"/>
  <path d="M256 214c44-26 104-32 160-18v196c-56-14-116-8-160 18z" fill="#E4E1D8"/>
  <g stroke="{TINTA}" stroke-width="11" stroke-linecap="round">
    <path d="M128 250q46-6 96 8"/>
    <path d="M128 292q46-6 96 8" opacity=".3"/>
    <path d="M128 334q46-6 96 8" opacity=".3"/>
    <path d="M288 258q50-14 96-8" opacity=".3"/>
    <path d="M288 300q50-14 96-8" opacity=".3"/>
    <path d="M288 342q50-14 96-8" opacity=".3"/>
  </g>
  <path d="M249 396v62l7-9 7 9v-62z" fill="{ROJO}"/>
'''),
    # Biblia negra con cantos dorados sobre azul noche.
    'c': ('Negra con cantos dorados', f'''
  <rect width="512" height="512" fill="#1E2A44"/>
  <path d="M306 396v72l18-16 18 16v-72z" fill="{ROJO}"/>
  <path d="M146 100h214l18 14v292l-18-12H146z" fill="{ORO}"/>
  <path d="M362 106l12 9v283l-12-8z" fill="#B8923F"/>
  <rect x="134" y="92" width="228" height="304" rx="14" fill="#15151A"/>
  <rect x="134" y="92" width="30" height="304" rx="14" fill="#0B0B0E"/>
  <rect x="150" y="92" width="14" height="304" fill="#0B0B0E"/>
  <rect x="251" y="156" width="18" height="150" rx="3" fill="{ORO}"/>
  <rect x="210" y="198" width="100" height="18" rx="3" fill="{ORO}"/>
  <g stroke="{ORO}" stroke-width="7" stroke-linecap="round" opacity=".85">
    <path d="M214 348h92"/>
    <path d="M232 366h56"/>
  </g>
'''),
    # Biblia abierta en trazo, con cruz, sobre papel.
    'd': ('Abierta en línea', f'''
  <rect width="512" height="512" fill="{PAPEL}"/>
  <rect x="246" y="92" width="20" height="96" rx="4" fill="{ROJO}"/>
  <rect x="216" y="118" width="80" height="20" rx="4" fill="{ROJO}"/>
  <g fill="none" stroke="{TINTA}" stroke-width="22" stroke-linejoin="round" stroke-linecap="round">
    <path d="M256 240c-42-26-98-32-150-20v176c52-12 108-6 150 20 42-26 98-32 150-20V220c-52-12-108-6-150 20z"/>
    <path d="M256 240v176"/>
  </g>
'''),
    # Biblia cerrada gris oscuro con el título en blanco y cinta roja: la elegida.
    'f': ('Santa Biblia', f'''
  <rect width="512" height="512" fill="#FFFFFF"/>
  <path d="M236 396v62l17-14 17 14v-62z" fill="#E8392E"/>
  <path d="M150 96h214q14 0 20 12l-8 14H150z" fill="#1F1F1F"/>
  <path d="M158 104h210q8 0 12 8l-6 10H158z" fill="#F4F4F2"/>
  <rect x="128" y="112" width="262" height="290" rx="22" fill="#3F3F41"/>
  <path d="M150 112h20v290h-20a22 22 0 0 1-22-22V134a22 22 0 0 1 22-22z" fill="#2A2A2C"/>
  <rect x="170" y="112" width="5" height="290" fill="#555557"/>
  <g font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="50" fill="#FFFFFF" text-anchor="middle">
    <text x="282" y="238">SANTA</text>
    <text x="282" y="290">BIBLIA</text>
  </g>
'''),
    # Biblia abierta sobre rojo de rúbrica, con cinta.
    'e': ('Abierta sobre rojo', f'''
  <rect width="512" height="512" fill="#9C2A20"/>
  <path d="M256 186c-46-28-110-34-168-18v204c58-16 122-10 168 18z" fill="{PAPEL}"/>
  <path d="M256 186c46-28 110-34 168-18v204c-58-16-122-10-168 18z" fill="#EAE6DB"/>
  <path d="M256 186v204" stroke="#9C2A20" stroke-width="6" opacity=".35"/>
  <rect x="158" y="226" width="16" height="92" rx="3" fill="#9C2A20"/>
  <rect x="130" y="250" width="72" height="16" rx="3" fill="#9C2A20"/>
  <g stroke="#9C2A20" stroke-width="11" stroke-linecap="round" opacity=".45">
    <path d="M292 232q46-12 96-6"/>
    <path d="M292 272q46-12 96-6"/>
    <path d="M292 312q46-12 96-6"/>
  </g>
  <path d="M300 384v70l17-15 17 15v-78z" fill="{ORO}"/>
'''),
}


def titulo(lineas, centro, base, tamano, salto):
    """El título como trazos, no como texto: así se ve igual en cualquier
    dispositivo, tenga o no la tipografía."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen

    fuente = TTFont('C:/Windows/Fonts/arialbd.ttf')
    glifos, mapa, avances = fuente.getGlyphSet(), fuente.getBestCmap(), fuente['hmtx']
    escala = tamano / fuente['head'].unitsPerEm
    trazos = []
    for i, linea in enumerate(lineas):
        nombres = [mapa[ord(c)] for c in linea]
        ancho = sum(avances[n][0] for n in nombres) * escala
        x = centro - ancho / 2
        for n in nombres:
            pluma = SVGPathPen(glifos)
            glifos[n].draw(TransformPen(pluma, (escala, 0, 0, -escala, x, base + i * salto)))
            trazos.append(pluma.getCommands())
            x += avances[n][0] * escala
    return f'<path d="{" ".join(trazos)}" fill="#FFFFFF"/>'


# El título de la opción elegida se dibuja con trazos.
_nombre, _cuerpo = OPCIONES['f']
_inicio, _fin = _cuerpo.index('<g font-family'), _cuerpo.index('</g>') + 4
OPCIONES['f'] = (_nombre, _cuerpo[:_inicio] + titulo(['SANTA', 'BIBLIA'], 282, 244, 50, 54) + _cuerpo[_fin:])


def svg(cuerpo, recorte=True):
    clip = '<clipPath id="r"><rect width="512" height="512" rx="112"/></clipPath>' if recorte else ''
    grupo = '<g clip-path="url(#r)">' if recorte else '<g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">{clip}{grupo}{cuerpo}</g></svg>\n'


def png(texto_svg, lado, destino):
    doc = pymupdf.open(stream=texto_svg.encode('utf-8'), filetype='svg')
    pagina = doc[0]
    escala = lado / pagina.rect.width
    pagina.get_pixmap(matrix=pymupdf.Matrix(escala, escala), alpha=False).save(destino)


if __name__ == '__main__':
    os.makedirs('iconos', exist_ok=True)
    for clave, (_, cuerpo) in OPCIONES.items():
        with open(f'iconos/opcion-{clave}.svg', 'w', encoding='utf-8', newline='\n') as f:
            f.write(svg(cuerpo))
    # Hoja de comparación: las opciones en fila, a tamaño de icono de móvil.
    ancho = 40 + len(OPCIONES) * 300
    piezas = [f'<rect width="{ancho}" height="380" fill="#DADDE3"/>']
    for i, (clave, (nombre, cuerpo)) in enumerate(OPCIONES.items()):
        x = 40 + i * 300
        piezas.append(f'<clipPath id="c{i}"><rect width="512" height="512" rx="112"/></clipPath>')
        piezas.append(f'<g transform="translate({x} 40) scale(.5)"><g clip-path="url(#c{i})">{cuerpo}</g></g>')
        piezas.append(f'<text x="{x + 128}" y="340" font-family="Arial" font-size="24" font-weight="bold" text-anchor="middle" fill="#1C1B18">{clave.upper()}</text>')
    hoja = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} 380">{"".join(piezas)}</svg>'
    png(hoja, ancho, 'iconos/opciones.png')
    print('listo:', ', '.join(OPCIONES))

    # La opción elegida pasa a ser el icono de la app.
    elegida = 'f'
    cuerpo = OPCIONES[elegida][1]

    # El dibujo ocupa casi todo el icono: con el tamaño de la hoja de opciones
    # quedaba mucho blanco alrededor. El libro (con su cinta) va de 128 a 390
    # en horizontal y de 96 a 458 en vertical; se amplía alrededor de su centro.
    def ajustado(k):
        fondo, _, dibujo = cuerpo.strip().partition('\n')
        cx, cy = 259, 277
        return f'{fondo}\n<g transform="translate(256 256) scale({k}) translate({-cx} {-cy})">{dibujo}</g>'

    lleno = ajustado(1.3)          # iPhone, favicon: se usa el cuadrado entero
    seguro = ajustado(1.0)         # Android puede recortar en círculo: deja margen
    with open('icon.svg', 'w', encoding='utf-8', newline='\n') as f:
        f.write(svg(lleno))
    # Los PNG van sin recorte: el sistema redondea las esquinas por su cuenta.
    png(svg(lleno, recorte=False), 512, 'icon-512.png')
    png(svg(lleno, recorte=False), 180, 'icon-180.png')
    png(svg(seguro, recorte=False), 512, 'icon-512-maskable.png')
    print('icono de la app:', elegida)
