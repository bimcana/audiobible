"""Convierte el PDF de la Reina-Valera 1960 (edición de siguiendosuspisadas.com.ar)
al formato de AudioBible, para cifrarlo después como versión privada.

    python herramientas/convertir-rv1960.py biblia_rv1960.pdf herramientas/.cache/rv1960.json [nvi.json]

El PDF es un documento de Word: todo el texto va en la misma letra, sin
negritas ni colores. La estructura se deduce de cómo están puestas las líneas:

- Las líneas en blanco separan bloques (párrafos, estrofas, títulos).
- «Génesis 10», «SALMO 29», «2 Crónicas 1»: comienzo de capítulo.
- Lo que va justo antes de un comienzo de capítulo es su título; en los
  Salmos, lo que termina en punto es el encabezado del salmo («Salmo de David.»).
- «(1 Cr. 1.5-23)»: pasajes paralelos. Se quitan.
- La prosa va justificada hasta el margen derecho; la poesía, en líneas cortas.
- Los números de versículo van en el texto: se buscan en orden (1, 2, 3…) para
  no confundirlos con otras cifras.

Si se le pasa la NVI ya convertida (JSON con «libros»), copia las palabras de
Jesús: el versículo entero cuando en la NVI lo es entero, y lo que sigue a los
dos puntos cuando en la NVI la cita llega hasta el final del versículo.

El resultado tiene derechos de autor: se escribe en herramientas/.cache/, que
git ignora, y solo se publica cifrado.
"""
import json
import re
import sys
import unicodedata

import pymupdf

LIBROS = {
    'génesis': 'GEN', 'éxodo': 'EXO', 'levítico': 'LEV', 'números': 'NUM', 'deuteronomio': 'DEU',
    'josué': 'JOS', 'jueces': 'JDG', 'rut': 'RUT', '1 samuel': '1SA', '2 samuel': '2SA',
    '1 reyes': '1KI', '2 reyes': '2KI', '1 crónicas': '1CH', '2 crónicas': '2CH', 'esdras': 'EZR',
    'nehemías': 'NEH', 'ester': 'EST', 'job': 'JOB', 'salmo': 'PSA', 'proverbios': 'PRO',
    'eclestiastés': 'ECC', 'eclesiastés': 'ECC', 'cantares': 'SNG', 'isaías': 'ISA', 'jeremías': 'JER',
    'lamentaciones': 'LAM', 'ezequiel': 'EZK', 'daniel': 'DAN', 'oseas': 'HOS', 'joel': 'JOL',
    'amós': 'AMO', 'abdías': 'OBA', 'jonás': 'JON', 'miqueas': 'MIC', 'nahum': 'NAM',
    'habacuc': 'HAB', 'sofonías': 'ZEP', 'hageo': 'HAG', 'zacarías': 'ZEC', 'malaquías': 'MAL',
    'mateo': 'MAT', 'marcos': 'MRK', 'lucas': 'LUK', 'juan': 'JHN', 'hechos': 'ACT',
    'romanos': 'ROM', '1 corintios': '1CO', '2 corintios': '2CO', 'gálatas': 'GAL', 'efesios': 'EPH',
    'filipenses': 'PHP', 'colosenses': 'COL', '1 tesalonicenses': '1TH', '2 tesalonicenses': '2TH',
    '1 timoteo': '1TI', '2 timoteo': '2TI', 'tito': 'TIT', 'filemón': 'PHM', 'hebreos': 'HEB',
    'santiago': 'JAS', '1 pedro': '1PE', '2 pedro': '2PE', '1 juan': '1JN', '2 juan': '2JN',
    '3 juan': '3JN', 'judas': 'JUD', 'apocalipsis': 'REV',
}
ORDEN = list(dict.fromkeys(LIBROS.values()))

# Restos de marcas de Word y números mal puestos en el propio PDF. En Génesis
# 30 falta además un trozo (el v. 7 y el comienzo del 8), que se repone.
ERRATAS = [
    ('Dan.x6* con mi', 'Dan. 7 Concibió otra vez Bilha la sierva de Raquel, y dio a luz un segundo hijo a Jacob. '
                       '8 Y dijo Raquel: Con luchas de Dios he contendido con mi'),
    ('11\\c ', '11 '),
    ('=', '-'),                                   # «Is=boset», «Bet=el»
    ('Onésimo,fb* ', 'Onésimo, '),
    ('redención; 32 para que', 'redención; 31 para que'),
    ('10 Porque de Dios son los escudos', 'Porque de Dios son los escudos'),       # Salmo 47 tiene 9
]

CORTA = 470         # una línea que acaba antes de aquí no llega al margen: no es prosa justificada
MARCA = re.compile(r'^((?:[123] )?[A-Za-zÁÉÍÓÚÑáéíóúñ]+) (\d+)$')
PARALELO = re.compile(r'^\(.*\d+\. ?\d+.*\)$')
# Nombres de libro en minúsculas: «Primera Epístola Universal de», «El Santo Evangelio Según».
NOMBRE_DE_LIBRO = re.compile(r'Epístola|Evangelio|^(Primer|Segundo|Tercer)\w* [Ll]ibro|^Libro \w+ de|^de los Apóstoles$|^De San ')
FINAL = re.compile(r'[.,;:]$')


def lineas_del_pdf(ruta):
    """Líneas de texto en orden de lectura, sin cabecera ni pie. '' = línea en blanco."""
    doc = pymupdf.open(ruta)
    for pagina in doc:
        for bloque in pagina.get_text('dict')['blocks']:
            for linea in bloque.get('lines', []):
                x0, y0, x1, _ = linea['bbox']
                if y0 < 40 or y0 > 750:
                    continue
                texto = re.sub(r'\s+', ' ', ''.join(s['text'] for s in linea['spans'])).strip()
                for malo, bueno in ERRATAS:
                    texto = texto.replace(malo, bueno)
                yield texto, x1


def bloques(lineas):
    actual = []
    for texto, x1 in lineas:
        if not texto or re.fullmatch(r'-{10,}', texto):
            if actual:
                yield actual
            actual = []
            if texto:
                yield [('§', 0)]                 # la raya que separa un libro del siguiente
        elif PARALELO.match(texto):
            continue
        else:
            actual.append((texto, x1))
    if actual:
        yield actual


def unir(lineas):
    """Junta las líneas de un párrafo. «Bet-» al final de una línea y «el» en la
    siguiente son un solo nombre, «Bet-el»."""
    salida = ''
    for t in lineas:
        salida = f'{salida}{t}' if salida.endswith('-') else f'{salida} {t}'
    return salida.strip()


def marca(bloque):
    if len(bloque) != 1:
        return None
    m = MARCA.match(bloque[0][0])
    if not m:
        return None
    libro = LIBROS.get(m.group(1).lower())
    return (libro, int(m.group(2))) if libro else None


def mayusculas(bloque):
    texto = ' '.join(t for t, _ in bloque)
    return not re.search(r'[a-záéíóúñ]', texto) and not re.match(r'^\d', texto)


def es_titulo(bloque):
    texto = bloque[0][0]
    return (len(bloque) == 1 and len(texto) < 90 and not FINAL.search(texto)
            and re.match(r'^[¿¡(«A-ZÁÉÍÓÚÑ]', texto) is not None)


def empieza_con_numero(bloque):
    return re.match(r'^\d+ ', bloque[0][0]) is not None


def es_poesia(bloque):
    """Poesía: alguna línea corta seguida de otra que no empieza versículo. En
    prosa una línea corta solo puede cerrar un versículo (o el párrafo)."""
    for (texto, x1), (sig, _) in zip(bloque, bloque[1:]):
        if x1 < CORTA and not re.match(r'^\d+ ', sig):
            return True
    return False


def convertir(ruta):
    todos = list(bloques(lineas_del_pdf(ruta)))
    libros = {}                 # id → [capítulos]
    cap = None                  # elementos del capítulo en curso
    esperado = 1                # el próximo número de versículo
    verso = None                # el versículo en curso
    libro = None

    def nuevo_verso(n):
        nonlocal verso, esperado
        verso = {'t': 'v', 'n': n, 'x': []}
        cap.append(verso)
        esperado = n + 1

    def poner(texto):
        """Añade texto al versículo en curso, abriendo los que vengan numerados."""
        nonlocal verso
        resto = texto
        while resto:
            m = re.search(rf'(?:^|(?<= )|(?<=[.;:?!])){esperado} (?=\S)', resto)
            antes, despues = (resto[:m.start()], resto[m.end():]) if m else (resto, '')
            antes = antes.strip()
            if antes:
                if verso is None:
                    raise ValueError(f'texto sin versículo en {libro} {len(libros[libro])}: {antes[:60]}')
                x = verso['x']
                if x and isinstance(x[-1], str):
                    x[-1] = f'{x[-1]} {antes}'
                else:
                    x.append(antes)
            if not m:
                break
            nuevo_verso(esperado)
            resto = despues

    def linea_de_poesia(texto):
        """Una línea de poesía: si empieza versículo, nivel 1; si no, sangrada."""
        m = re.match(rf'^{esperado} (?=\S)', texto)
        if m:
            nuevo_verso(esperado)
            verso['x'].append({'l': 1})
            poner(texto[m.end():])
        else:
            ya = any(isinstance(t, dict) for t in verso['x'])
            verso['x'].append({'l': 2 if ya else 1})
            verso['x'].append('')               # el texto de la línea va aparte de lo anterior
            poner(texto)

    def texto(bloque, poesia):
        nonlocal verso
        if empieza_con_numero(bloque) and re.match(rf'^{esperado} ', bloque[0][0]) and cap and cap[-1]['t'] == 'v':
            cap.append({'t': 'p'})
        if poesia:
            for t, _ in bloque:
                linea_de_poesia(t)
        else:
            if verso is not None and any(isinstance(t, dict) for t in verso['x']) and not empieza_con_numero(bloque):
                verso['x'].append({'l': 1})     # prosa tras poesía dentro del mismo versículo
                verso['x'].append('')
            poner(unir(t for t, _ in bloque))

    i = 0
    poesia_previa = False
    while i < len(todos):
        # Lo que no empieza con número se acumula hasta ver qué viene después.
        pendientes = []
        while i < len(todos) and not marca(todos[i]) and not empieza_con_numero(todos[i]):
            pendientes.append(todos[i])
            i += 1
        siguiente = todos[i] if i < len(todos) else None
        m = marca(siguiente) if siguiente else None

        # Los primeros pendientes que parecen texto continúan el versículo anterior.
        while pendientes and not es_titulo(pendientes[0]) and not mayusculas(pendientes[0]) and verso is not None:
            b = pendientes.pop(0)
            texto(b, es_poesia(b) or (len(b) == 1 and poesia_previa))

        if m:
            libro, n = m
            libros.setdefault(libro, [])
            if n != len(libros[libro]) + 1:
                raise ValueError(f'{libro}: capítulo {n} tras el {len(libros[libro])}')
            cap = []
            libros[libro].append(cap)
            verso, esperado = None, 1
            encabezado = []
            if n == 1:
                # Antes del capítulo 1 va el nombre del libro («El Santo Evangelio
                # Según / SAN MATEO», «Primer Libro de / SAMUEL»): solo el último
                # bloque es el título de la primera sección.
                validos = [b for b in pendientes if not mayusculas(b) and not NOMBRE_DE_LIBRO.search(b[0][0])]
                pendientes = validos[-1:]
            for b in pendientes:
                t = ' '.join(x for x, _ in b)
                if mayusculas(b):
                    continue                     # título del libro («LIBRO PRIMERO DE MOISÉS», «SALMOS»)
                if libro == 'PSA' and (FINAL.search(t) or encabezado):
                    encabezado.append(t)
                else:
                    cap.append({'t': 'h', 'x': t})
            if encabezado:
                cap.append({'t': 's', 'x': ' '.join(encabezado)})
            i += 1
            continue

        # A mitad de capítulo: los títulos lo son; el resto es texto que sigue un
        # versículo empezado («Estas cosas habló Jesús…», tras un título).
        for b in pendientes:
            t = ' '.join(x for x, _ in b)
            if mayusculas(b) and libro == 'PSA':
                continue
            if es_titulo(b) or verso is None:
                cap.append({'t': 'h', 'x': t})
            else:
                texto(b, es_poesia(b))
        if siguiente is None:
            break
        poesia = es_poesia(siguiente)
        if len(siguiente) == 1 and not poesia:
            # Una sola línea corta entre estrofas también es poesía.
            sig2 = todos[i + 1] if i + 1 < len(todos) else None
            poesia = poesia_previa and siguiente[0][1] < CORTA and sig2 is not None and es_poesia(sig2)
        texto(siguiente, poesia)
        poesia_previa = poesia
        i += 1

    return libros


def limpiar(libros):
    for caps in libros.values():
        for cap in caps:
            for e in cap:
                if e['t'] != 'v':
                    continue
                x = []
                for t in e['x']:
                    if isinstance(t, str):
                        t = re.sub(r' {2,}', ' ', t).strip()
                        if not t:
                            continue
                        if x and isinstance(x[-1], str):
                            x[-1] = f'{x[-1]} {t}'
                            continue
                    elif x and isinstance(x[-1], dict) and 'l' in x[-1]:
                        x.pop()                  # una línea vacía no sirve
                    x.append(t)
                while x and isinstance(x[-1], dict):
                    x.pop()
                e['x'] = x
            # Sin párrafos al final ni dobles.
            while cap and cap[-1]['t'] == 'p':
                cap.pop()


def vocabulario():
    """Las palabras de la RV1909 y la RVG, que van con la app: sirven para
    reconocer las que el PDF trae pegadas."""
    import collections
    import glob
    import os
    raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
    voc = collections.Counter()
    for version in ('rv1909', 'rvg'):
        for ruta in glob.glob(os.path.join(raiz, version, '*.json')):
            with open(ruta, encoding='utf-8') as f:
                voc.update(re.findall(PALABRA, f.read()))
    return voc


PALABRA = r'[A-Za-zÁÉÍÓÚÑÜáéíóúñü]+'


def despegar(libros):
    """«estáen», «Asíque», «comenzóJesús»: en el PDF falta el espacio tras una
    vocal con tilde. Se separa solo si la palabra entera no existe y las dos
    mitades sí («sépase» no se toca: «sé» queda fuera por corta)."""
    voc = vocabulario()
    cambios = {}

    def arreglar(m):
        w = m.group(0)
        if voc[w] >= 2:
            return w
        for k in range(2, len(w)):
            a, b = w[:k], w[k:]
            if a[-1] not in 'áéíóú' or (len(a) <= 2 and a.lower() not in ('tú', 'mí', 'sí')):
                continue
            if len(b) == 1 and b not in 'yoea':  # «respondióy»: la conjunción suelta también se pega
                continue
            if b == 'a' and a[-1] == 'í':           # «escondía», «esparcía»: imperfectos, no «escondí a»
                continue
            if b in ('os', 'as', 'es', 'mulo'):  # «cubríos», «recibíos», «volvías», «túmulo» son palabras
                continue
            if voc[a] >= 5 and voc[b] >= 5:
                cambios[w] = f'{a} {b}'
                return f'{a} {b}'
        return w

    for caps in libros.values():
        for cap in caps:
            for e in cap:
                if e['t'] != 'v':
                    continue
                for i, t in enumerate(e['x']):
                    if isinstance(t, str):
                        e['x'][i] = re.sub(PALABRA, arreglar, t)
                    elif 'j' in t:
                        t['j'] = re.sub(PALABRA, arreglar, t['j'])
    return cambios


def sin_tildes(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


# Dos puntos que abren una cita: «Jesús le dijo:», «respondió y dijo:», «diciendo:».
VERBO = re.compile(r'\b(dijo|dice|decía|diciendo|respondió|respondiendo|contestó|preguntó|clamó|exclamó|'
                   r'habló|añadió|mandó|ordenó|oró|enseñaba|clamaba|decir)\b[^:]{0,45}$', re.I)


def cortes(x):
    """Dónde empiezan las citas: (tramo, posición tras los dos puntos)."""
    salida = []
    for k, t in enumerate(x):
        if not isinstance(t, str):
            continue
        for m in re.finditer(':', t):
            if VERBO.search(t[max(0, m.start() - 70):m.start()]):
                salida.append((k, m.end()))
    return salida


def marcar(x, desde):
    """Pone como palabras de Jesús todo lo que sigue a «desde» (o el versículo entero si es None)."""
    nuevo = []
    for k, t in enumerate(x):
        if not isinstance(t, str):
            nuevo.append(t)
        elif desde is None or k > desde[0]:
            nuevo.append({'j': t})
        elif k == desde[0]:
            antes, despues = t[:desde[1]], t[desde[1]:]
            if despues.strip():
                nuevo.append(antes + ' ' if despues.startswith(' ') else antes)
                nuevo.append({'j': despues.strip()})
            else:
                nuevo.append(antes)
        else:
            nuevo.append(t)
    return nuevo


def sobra_al_final(tramos):
    """En la NVI, lo que va tras la última cita («—le contestó Jesús.»). Si es
    largo, la cita no llega al final del versículo y no se sabe dónde acaba."""
    ultimo = max(k for k, t in enumerate(tramos) if isinstance(t, dict) and 'j' in t)
    return ''.join(t for t in tramos[ultimo + 1:] if isinstance(t, str)).strip()


def palabras_de_jesus(libros, nvi):
    """Copia las palabras de Jesús de la NVI, solo donde la correspondencia es segura:
    - versículo entero en la NVI: entero también, salvo una entrada al principio
      («Jesús les dijo:»), que queda fuera;
    - la cita llega hasta el final en la NVI: desde los dos puntos de «dijo:»;
    - una sola cita en la NVI y un solo «dijo:» en la RVR: desde ahí.
    Lo demás (dos hablantes en el versículo, citas sin dos puntos) se deja sin marcar."""
    nvi = {l['id']: l['caps'] for l in nvi['libros']}
    puestos = 0
    for libro in ('MAT', 'MRK', 'LUK', 'JHN', 'ACT', '1CO', '2CO', 'REV'):
        for c, cap in enumerate(libros.get(libro, [])):
            caps_nvi = nvi.get(libro, [])
            otros = {e['n']: e for e in (caps_nvi[c] if c < len(caps_nvi) else []) if e['t'] == 'v'}
            for e in cap:
                if e['t'] != 'v' or e['n'] not in otros:
                    continue
                if any(isinstance(t, dict) and 'l' not in t for t in e['x']):
                    continue
                tramos = [t for t in otros[e['n']]['x'] if not (isinstance(t, dict) and 'l' in t)]
                citas = [t for t in tramos if isinstance(t, dict) and 'j' in t]
                if not citas:
                    continue
                donde = cortes(e['x'])
                if len(citas) == len(tramos):
                    primero = donde[0] if donde else None
                    texto = ''.join(t for t in e['x'][:primero[0] + 1] if isinstance(t, str)) if primero else ''
                    e['x'] = marcar(e['x'], primero if primero and primero[1] <= 90 and len(texto) else None)
                elif isinstance(tramos[-1], dict) and 'j' in tramos[-1] and donde:
                    e['x'] = marcar(e['x'], donde[0])
                elif len(citas) == 1 and len(donde) == 1 and len(sobra_al_final(tramos)) < 35:
                    e['x'] = marcar(e['x'], donde[0])
                else:
                    continue
                puestos += 1
    return puestos


if __name__ == '__main__':
    origen, destino = sys.argv[1], sys.argv[2]
    libros = convertir(origen)
    limpiar(libros)
    despegadas = despegar(libros)
    jesus = 0
    if len(sys.argv) > 3:
        with open(sys.argv[3], encoding='utf-8') as f:
            jesus = palabras_de_jesus(libros, json.load(f))
    salida = {
        'version': {'nombre': 'Reina-Valera 1960', 'sigla': 'RVR1960', 'idioma': 'es'},
        'libros': [{'id': l, 'caps': libros[l]} for l in ORDEN if l in libros],
    }
    with open(destino, 'w', encoding='utf-8') as f:
        json.dump(salida, f, ensure_ascii=False, separators=(',', ':'))
    versos = sum(1 for caps in libros.values() for cap in caps for e in cap if e['t'] == 'v')
    print(f'{len(libros)} libros, {sum(len(c) for c in libros.values())} capítulos, {versos} versículos, '
          f'{jesus} con palabras de Jesús, {len(despegadas)} palabras despegadas')
    with open(destino.replace('.json', '-despegadas.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(f'{a} → {b}' for a, b in sorted(despegadas.items())))
