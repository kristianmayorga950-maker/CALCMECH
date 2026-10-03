# -*- coding: utf-8 -*-
"""
Generador de los PDFs profesionales de CALCMECH.
Produce:
  - docs/Manual_de_Usuario_CALCMECH.pdf
  - docs/Capacidades_CALCMECH.pdf
Requiere: reportlab, pillow
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    NextPageTemplate, PageBreak, Image, ListFlowable, ListItem, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas as canvaslib

HERE = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.join(HERE, "..", "public", "uis-logo.png")
OUTDIR = os.path.join(HERE, "..", "public")   # los PDF se sirven desde /public

# ── Paleta de marca ─────────────────────────────────────────────────────────
TEAL      = HexColor("#0d9488")
TEAL_DARK = HexColor("#0f766e")
ORANGE    = HexColor("#ea580c")
INK       = HexColor("#1e293b")
SLATE     = HexColor("#475569")
DIM       = HexColor("#64748b")
LIGHT     = HexColor("#f1f5f9")
TEALBG    = HexColor("#e6f5f3")
ORANGEBG  = HexColor("#fff3ea")
BORDER    = HexColor("#cbd5e1")
NAVY      = HexColor("#0b1220")

PAGE_W, PAGE_H = A4
MX = 20 * mm   # margen lateral

# ── Estilos ─────────────────────────────────────────────────────────────────
ss = getSampleStyleSheet()

def style(name, **kw):
    base = kw.pop("parent", ss["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

H1   = style("H1", fontName="Helvetica-Bold", fontSize=17, textColor=TEAL_DARK,
             spaceBefore=6, spaceAfter=8, leading=21)
H2   = style("H2", fontName="Helvetica-Bold", fontSize=12.5, textColor=INK,
             spaceBefore=12, spaceAfter=4, leading=16)
H3   = style("H3", fontName="Helvetica-Bold", fontSize=10.5, textColor=ORANGE,
             spaceBefore=8, spaceAfter=2, leading=14)
BODY = style("Body", fontName="Helvetica", fontSize=9.7, textColor=SLATE,
             leading=14.5, alignment=TA_JUSTIFY, spaceAfter=4)
BODYC= style("Bodyc", parent=BODY, alignment=TA_LEFT)
SMALL= style("Small", fontName="Helvetica", fontSize=8.3, textColor=DIM, leading=11)
CELL_K = style("CellK", fontName="Helvetica-Bold", fontSize=8.6, textColor=INK, leading=11.5)
CELL_V = style("CellV", fontName="Helvetica", fontSize=8.7, textColor=SLATE, leading=12)
LEDE = style("Lede", fontName="Helvetica", fontSize=10.5, textColor=INK, leading=15.5, alignment=TA_JUSTIFY)

# Portada
COVER_KICKER = style("CK", fontName="Helvetica-Bold", fontSize=11, textColor=ORANGE,
                     alignment=TA_CENTER, leading=14)
COVER_TITLE  = style("CT", fontName="Helvetica-Bold", fontSize=34, textColor=white,
                     alignment=TA_CENTER, leading=38)
COVER_SUB    = style("CS", fontName="Helvetica", fontSize=12.5, textColor=HexColor("#cbd5e1"),
                     alignment=TA_CENTER, leading=18)
COVER_META   = style("CM", fontName="Helvetica", fontSize=9.5, textColor=HexColor("#94a3b8"),
                     alignment=TA_CENTER, leading=14)


# ── Plantillas de página ────────────────────────────────────────────────────
def _footer(c, doc):
    c.saveState()
    c.setStrokeColor(BORDER); c.setLineWidth(0.5)
    c.line(MX, 14 * mm, PAGE_W - MX, 14 * mm)
    c.setFont("Helvetica", 7.5); c.setFillColor(DIM)
    c.drawString(MX, 9.5 * mm, "CALCMECH  |  Diseño de Máquinas II  |  UIS")
    c.drawRightString(PAGE_W - MX, 9.5 * mm, "Pág. %d" % doc.page)
    # banda superior tenue
    c.setFillColor(TEAL); c.rect(0, PAGE_H - 4 * mm, PAGE_W, 4 * mm, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, PAGE_H - 4 * mm, 45 * mm, 4 * mm, fill=1, stroke=0)
    c.restoreState()

def _cover_bg(c, doc):
    c.saveState()
    c.setFillColor(NAVY); c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # bandas decorativas
    c.setFillColor(TEAL);   c.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(0, PAGE_H - 12 * mm, 60 * mm, 12 * mm, fill=1, stroke=0)
    c.setFillColor(TEAL);   c.rect(0, 0, PAGE_W, 8 * mm, fill=1, stroke=0)
    c.setFillColor(ORANGE); c.rect(PAGE_W - 60 * mm, 0, 60 * mm, 8 * mm, fill=1, stroke=0)
    c.restoreState()

def build_doc(path, title):
    doc = BaseDocTemplate(path, pagesize=A4,
                          leftMargin=MX, rightMargin=MX,
                          topMargin=20 * mm, bottomMargin=20 * mm,
                          title=title, author="CALCMECH · UIS")
    cover_frame = Frame(MX, 40 * mm, PAGE_W - 2 * MX, PAGE_H - 90 * mm, id="cover")
    body_frame  = Frame(MX, 18 * mm, PAGE_W - 2 * MX, PAGE_H - 38 * mm, id="body")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=_cover_bg),
        PageTemplate(id="body",  frames=[body_frame],  onPage=_footer),
    ])
    return doc

# ── Componentes de contenido ────────────────────────────────────────────────
def cover(title_lines, subtitle, meta_lines):
    story = []
    story.append(Spacer(1, 18 * mm))
    if os.path.exists(LOGO):
        img = Image(LOGO, width=42 * mm, height=42 * mm, kind="proportional")
        img.hAlign = "CENTER"
        story.append(img)
    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph("CALC<font color='#ea580c'>MECH</font>",
                 style("Brand", fontName="Helvetica-Bold", fontSize=20,
                       textColor=white, alignment=TA_CENTER, leading=22)))
    story.append(Spacer(1, 4 * mm))
    story.append(Paragraph("INGENIERÍA MECÁNICA &middot; DISEÑO DE MÁQUINAS", COVER_KICKER))
    story.append(Spacer(1, 10 * mm))
    for ln in title_lines:
        story.append(Paragraph(ln, COVER_TITLE))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph(subtitle, COVER_SUB))
    story.append(Spacer(1, 16 * mm))
    for m in meta_lines:
        story.append(Paragraph(m, COVER_META))
    story.append(NextPageTemplate("body"))
    story.append(PageBreak())
    return story

def h1(text):
    return [Spacer(1, 2), Paragraph(text, H1),
            HRFlowable(width="100%", thickness=1.4, color=TEAL, spaceAfter=8,
                       lineCap="round")]

def h2(text):
    return [Paragraph(text, H2),
            HRFlowable(width=36 * mm, thickness=2, color=ORANGE, spaceAfter=4)]

def body(text):
    return Paragraph(text, BODY)

def bullets(items, color=TEAL):
    lis = [ListItem(Paragraph(t, BODYC), bulletColor=color, value="square") for t in items]
    return ListFlowable(lis, bulletType="bullet", start="square",
                        leftIndent=12, bulletFontSize=6, spaceBefore=2, spaceAfter=6)

def info_table(rows):
    """rows: list of (icon_label, value). Tabla de 2 columnas estilizada."""
    data = []
    for k, v in rows:
        data.append([Paragraph(k, CELL_K), Paragraph(v, CELL_V)])
    t = Table(data, colWidths=[34 * mm, None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), TEALBG),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t

def apartado(num_title, que, res, consejo):
    """Bloque por apartado: titulo + tabla (Que meter / Resultados / Consejo)."""
    blk = [Paragraph(num_title, H3)]
    blk.append(info_table([
        ("Qué meter", que),
        ("Resultados", res),
        ("Consejo", consejo),
    ]))
    blk.append(Spacer(1, 5))
    return KeepTogether(blk)

def feature_table(title, items, head=TEAL):
    data = [[Paragraph(f"<font color='white'><b>{title}</b></font>", BODY)]]
    for it in items:
        data.append([Paragraph(it, CELL_V)])
    t = Table(data, colWidths=[None])
    sty = [
        ("BACKGROUND", (0, 0), (0, 0), head),
        ("BOX", (0, 0), (-1, -1), 0.6, BORDER),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, head),
        ("INNERGRID", (0, 1), (-1, -1), 0.4, BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    for r in range(1, len(data)):
        if r % 2 == 0:
            sty.append(("BACKGROUND", (0, r), (-1, r), LIGHT))
    t.setStyle(TableStyle(sty))
    return KeepTogether([t, Spacer(1, 8)])

def references():
    refs = [
        "Budynas, R. G. y Nisbett, J. K. <i>Diseño en Ingeniería Mecánica de Shigley</i>, 9.ª ed. McGraw-Hill, 2012. Capítulo 8: tornillos, sujetadores y diseño de uniones no permanentes.",
        "Norton, R. L. <i>Diseño de Máquinas: Un Enfoque Integrado</i>, 4.ª ed. Pearson, 2011. Capítulo 11: tornillos y sujetadores.",
        "Mott, R. L. <i>Diseño de Elementos de Máquinas</i>, 4.ª ed. Pearson. Convenciones de unidades y esfuerzos admisibles.",
    ]
    out = h1("Referencias")
    lis = [ListItem(Paragraph(r, BODYC), value=i + 1) for i, r in enumerate(refs)]
    out.append(ListFlowable(lis, bulletType="1", leftIndent=14, spaceBefore=2, spaceAfter=4))
    out.append(Spacer(1, 6))
    out.append(Paragraph("Diseño de Máquinas II &middot; Escuela de Ingeniería Mecánica &middot; Universidad Industrial de Santander &middot; 2026-1.", SMALL))
    return out


# ════════════════════════════════════════════════════════════════════════════
#  PDF 1 — MANUAL DE USUARIO
# ════════════════════════════════════════════════════════════════════════════
def build_manual():
    out = "Manual_de_Usuario_CALCMECH.pdf"
    doc = build_doc(os.path.join(OUTDIR, out), "Manual de Usuario - CALCMECH")
    s = []
    s += cover(
        ["Manual de", "Usuario"],
        "Calculadoras de elementos roscados",
        ["Basada en Shigley, <i>Diseño en Ingeniería Mecánica</i>, 9.ª edición",
         "Diseño de Máquinas II &middot; Escuela de Ingeniería Mecánica &middot; UIS &middot; 2026-1",
         "kristianmayorga950-maker.github.io/CALCMECH &middot; Versión 2.0"],
    )

    # 1. Introducción
    s += h1("1. Introducción")
    s.append(Paragraph(
        "CALCMECH reúne tres calculadoras de elementos roscados que muestran el procedimiento "
        "completo de cada cálculo: <b>ecuación, sustitución y resultado</b>. Todo se calcula en tu "
        "navegador; no se envía ningún dato a un servidor. Este manual explica qué datos ingresar, "
        "qué resultados obtienes y un consejo práctico para cada parte.", LEDE))
    s.append(Spacer(1, 6))
    s.append(feature_table("Las tres calculadoras (piezas del plano)", [
        "<b>1 &middot; Tornillo de potencia</b>: pares, eficiencia, autobloqueo, esfuerzos, pandeo, desgaste, velocidad y potencia; también dimensiona.",
        "<b>2 &middot; Pernos a tensión</b>: rigideces, precarga, factores de seguridad, fatiga, par de apriete y empaques.",
        "<b>3 &middot; Pernos a cortante</b>: carga directa y excéntrica, aplastamiento y área neta, con diseño automático.",
    ]))

    # 2. Portada y controles
    s += h1("2. Portada y controles")
    s += h2("2.1  La portada: plano de conjunto")
    s.append(body(
        "La portada es un plano de conjunto de un gato de tornillo. La pieza 1 es el tornillo con su "
        "tuerca, collarín y palanca; la 2, los pernos que unen la base al bastidor; la 3, la ménsula "
        "guía sujeta con cuatro pernos. Cada pieza abre su calculadora."))
    s.append(bullets([
        "Entra tocando la pieza en el dibujo, su <b>globo</b> numerado o su fila en la <b>lista de piezas</b>. Con el teclado: Tab hasta la pieza y Enter.",
        "<b>Continuar</b> abre lo último que hiciste en el tornillo de potencia, tal como lo dejaste.",
        "<b>Proyectos guardados</b> muestra cada proyecto con su mecanismo dibujado, un sello con el veredicto, el criterio que gobierna y los valores de F y d.",
        "El <b>cajetín</b> lleva los datos del curso; arriba están el manual, los PDF y el tema (claro como plano, oscuro como cianotipo).",
    ]))
    s += h2("2.2  Controles de la aplicación")
    s.append(info_table([
        ("Cajetín", "Barra superior: calculadora abierta y su número de pieza, unidades SI / Imperial y tema claro u oscuro."),
        ("Lista de piezas", "Barra lateral: cambia de calculadora; se puede ocultar. Abajo, el manual y el regreso a la portada."),
        ("Celular", "La barra lateral se reemplaza por los botones 1, 2 y 3 del cajetín y una flecha a la portada."),
        ("Decimales", "Usa punto (.) como separador decimal."),
    ]))

    # 3. Tornillo de potencia
    s.append(PageBreak())
    s += h1("3. Tornillo de potencia")
    s.append(body(
        "El cálculo es <b>progresivo</b>: no hay botón de calcular ni campos obligatorios. Cada dato que "
        "escribes desbloquea los pasos que dependen de él y el resultado se actualiza en vivo."))
    s.append(apartado("Configurar el sistema",
        "Transmisión (par directo, palanca de una o dos manos, o reductor con motor), accionamiento manual o con velocidad, "
        "rosca cuadrada o Acme, apoyo de empuje (ninguno, collarín o rodamiento), par en el cuerpo, sentido de la carga y objetivo.",
        "El esquema del sistema y las etapas de cálculo se ajustan a lo elegido; solo aparecen los datos y las verificaciones que aplican.",
        "El objetivo (Analizar, Capacidad, Accionamiento, Dimensionar o Avance) solo cambia lo que se resalta."))
    s.append(apartado("Datos y tablas",
        "Los datos que tengas, en la unidad que prefieras. Se pueden tomar de las tablas: tamaños Acme de ½ a 2 in, aceros AISI 1010 a 1095, "
        "fricción de la rosca y del collarín, y condición de extremos.",
        "Cada etapa dice qué le falta, y arriba aparece el <b>próximo dato útil</b> (el que más resultados desbloquea).",
        "Con el diámetro y el paso ya salen el diámetro medio y el de raíz. Un valor tomado de una tabla queda marcado con su origen."))
    s.append(apartado("Esquema y cálculo paso a paso",
        "Nada adicional: se arman con la configuración y los datos.",
        "Esquema del mecanismo con las cotas que ya tienen valor (las punteadas esperan su dato) y cada resultado con ecuación, valores usados, sustitución y resultado con unidades.",
        "«Ver en grande» amplía el esquema. El resultado principal según el objetivo aparece arriba de la traza."))
    s.append(apartado("Estado del diseño y gráficos",
        "Resistencia del material y factor de seguridad objetivo; para pandeo, la longitud libre y la condición de extremos; para desgaste, la altura de la tuerca.",
        "Verificaciones con su utilización: ecuación de par, autobloqueo, retención con el apoyo, fluencia en la raíz y en el cuerpo, pandeo, desgaste y entrada suficiente. "
        "Gráficos de reparto del par, eficiencia, utilización y carga por filete.",
        "El criterio con mayor utilización es el que gobierna. Cada gráfico tiene un «Qué significa» plegado."))
    s.append(apartado("Dimensionar",
        "Carga, materiales y factor objetivo; opcionalmente, exigir autobloqueo.",
        "Recorre el catálogo Acme y propone el menor tamaño que cumple todas las verificaciones.",
        "Aplica la propuesta con un clic; puedes conservar la forma de rosca que elegiste."))
    s.append(apartado("Proyectos y autoguardado",
        "Menú Proyecto: ejemplos resueltos, guardar, guardar una copia, abrir, exportar (.json e informe .md), importar y reiniciar.",
        "Lo que tienes en pantalla se guarda solo y se recupera al volver o al recargar; la portada lo ofrece en «Continuar».",
        "Reiniciar borra la sesión, no los proyectos. Para llevar un proyecto a otro equipo, exporta el .json e impórtalo allá."))

    # 4. Pernos a tensión
    s.append(Spacer(1, 10))
    s += h1("4. Pernos a tensión")
    s.append(body("Uniones atornilladas cargadas a tensión. Se llenan los datos y se presiona <b>Calcular</b>."))
    s.append(apartado("Apartado 1 &mdash; Geometría del perno",
        "Estándar de rosca (ISO, UNC o UNF), designación, diámetro d, paso p y área de tensión A<sub>t</sub>.",
        "Define la rigidez del perno k<sub>b</sub> y la resistencia disponible.",
        "Elige la designación de la lista para llenar d, p y A<sub>t</sub> sin errores."))
    s.append(apartado("Apartado 2 &mdash; Grado o clase",
        "Primero el <b>sistema</b> (ISO clases 3.6 a 12.9, o SAE grados 1 a 8.2) y luego la <b>clase</b>.",
        "Resistencias S<sub>p</sub>, S<sub>y</sub>, S<sub>ut</sub> y S<sub>e</sub> del perno.",
        "Si cambias de sistema, vuelve a elegir la clase."))
    s.append(apartado("Apartado 3 &mdash; Longitud de agarre",
        "Agarre l y su reparto entre la parte sin rosca l<sub>d</sub> y la roscada l<sub>t</sub>, o cálculo automático.",
        "Entra en la rigidez del perno k<sub>b</sub>.",
        "Si todo el agarre está roscado, pon l<sub>d</sub> = 0."))
    s.append(apartado("Apartado 4 &mdash; Rigidez del paquete",
        "Método Cornwell (módulos E y espesores de las placas) o Wileman (material del elemento).",
        "Rigidez de los elementos k<sub>m</sub> y constante de la junta C.",
        "Cornwell admite dos materiales; es válido para j = d/l entre 0.10 y 2.00."))
    s.append(apartado("Apartado 5 &mdash; Precarga y apriete",
        "Unión reutilizable (0.75&middot;F<sub>p</sub>), permanente (0.90&middot;F<sub>p</sub>) o personalizada; precarga fija opcional y factor K.",
        "Precarga F<sub>i</sub> y par de apriete T = K&middot;F<sub>i</sub>&middot;d.",
        "Una precarga alta mejora la fatiga y el sellado, pero acerca el perno a la fluencia."))
    s.append(apartado("Apartado 6 &mdash; Carga externa",
        "Carga por perno (o total dividida entre N pernos), estática o de fatiga (Goodman, Gerber o ASME elíptica).",
        "Factores de carga n<sub>p</sub>, de separación n<sub>0</sub>, de fluencia n<sub>y</sub> y de fatiga n<sub>f</sub>.",
        "Verifica que n<sub>0</sub> &gt; 1 para que la junta no se separe antes de que falle el perno."))
    s.append(apartado("Apartado 7 &mdash; Unión con empaque (opcional)",
        "Empaque confinado o no confinado (módulo E<sub>g</sub> y espesor t<sub>g</sub>), área del empaque y círculo de pernos.",
        "Rigidez del empaque k<sub>g</sub>, presión de sellado y verificación del espaciado entre pernos.",
        "Con empaque no confinado, el perno toma una fracción mayor de la carga."))

    # 5. Pernos a cortante
    s.append(PageBreak())
    s += h1("5. Pernos a cortante")
    s.append(body("Grupos de pernos con cortante directo y excéntrico. Se llenan los datos y se presiona <b>Calcular</b>."))
    s.append(apartado("Apartado 1 &mdash; Patrón de pernos",
        "Coordenadas (x, y) de cada perno; puedes agregar o quitar pernos.",
        "Centroide del grupo y &Sigma;r<sub>i</sub><super>2</super> para el reparto del momento.",
        "Un patrón simétrico centrado sobre la línea de acción de V anula el momento."))
    s.append(apartado("Apartado 2 &mdash; Perno",
        "Diámetro d, área a cortante (A<sub>t</sub> o &pi;d<super>2</super>/4), cortante simple o doble y resistencia.",
        "Esfuerzo cortante del perno y su factor de seguridad.",
        "Si la rosca cae en el plano de corte usa A<sub>t</sub>; si solo el vástago, &pi;d<super>2</super>/4."))
    s.append(apartado("Apartado 3 &mdash; Carga V",
        "Magnitud, dirección y punto de aplicación.",
        "Cortante directo V/n, cortante por momento y fuerza en el perno más cargado.",
        "Si V no pasa por el centroide aparece un momento (carga excéntrica)."))
    s.append(apartado("Apartado 4 &mdash; Placa",
        "Espesor t, ancho w (activa la tensión en el área neta) y resistencia.",
        "Aplastamiento en la placa y tensión en el área neta.",
        "Respeta separaciones mínimas: 3d entre pernos y 1.5d al borde."))
    s.append(apartado("Diseño automático",
        "Patrón, carga, placa y factor de seguridad objetivo (no eliges perno ni grado).",
        "Tabla de pernos y grados; recomienda el menor perno con n &ge; objetivo, marcado con una estrella.",
        "Elige el área a cortante según dónde caiga el plano de corte."))

    # 6. Lectura de resultados
    s.append(PageBreak())
    s += h1("6. Cómo leer los resultados de las juntas")
    s.append(info_table([
        ("Veredicto", "Factor de seguridad que gobierna y si el diseño es válido, marginal o inválido."),
        ("Parámetros", "Los valores que efectivamente se usaron."),
        ("Desarrollo", "Cada parámetro con su fórmula en notación matemática y su valor."),
        ("Tabla iterativa", "En el diseño automático de cortante: candidatos ordenados; el recomendado lleva una estrella."),
        ("Dashboard", "Gráficos de esfuerzos y cargas, con exportación a PDF."),
    ]))
    s.append(Spacer(1, 8))
    s += h2("Consejos finales")
    s.append(bullets([
        "Las advertencias (por ejemplo, <i>no autobloqueante</i>) informan; no detienen el cálculo.",
        "En el tornillo de potencia, si un resultado no aparece, mira qué dato pide su etapa o el próximo dato útil.",
        "Internamente todo se calcula en SI; las entradas imperiales se convierten antes de calcular.",
        "Los proyectos quedan en el navegador; expórtalos si cambias de equipo.",
    ]))

    s.append(PageBreak())
    s += references()

    doc.build(s)
    return out


# ════════════════════════════════════════════════════════════════════════════
#  PDF 2 — CAPACIDADES DE LA APLICACIÓN
# ════════════════════════════════════════════════════════════════════════════
def build_capacidades():
    out = "Capacidades_CALCMECH.pdf"
    doc = build_doc(os.path.join(OUTDIR, out), "Capacidades de la Aplicación - CALCMECH")
    s = []
    s += cover(
        ["Capacidades", "de la Aplicación"],
        "Alcance funcional y técnico de CALCMECH",
        ["Calculadoras de elementos roscados",
         "Diseño de Máquinas II &middot; Escuela de Ingeniería Mecánica &middot; UIS &middot; 2026-1",
         "Documento técnico &middot; Versión 2.0"],
    )

    s += h1("1. Resumen")
    s.append(Paragraph(
        "CALCMECH es una aplicación web para el análisis y el diseño de elementos roscados según "
        "Shigley (9.ª ed.) y Norton (4.ª ed.). Integra tres calculadoras con el procedimiento completo "
        "a la vista, un motor de cálculo progresivo para el tornillo de potencia, diseño automático "
        "para juntas a cortante, tablas de referencia y gestión de proyectos, todo ejecutándose "
        "localmente en el navegador.", LEDE))

    s += h1("2. Módulos de cálculo")
    s.append(feature_table("2.1  Tornillo de potencia (&sect;8-1, &sect;8-2)", [
        "Rosca cuadrada o Acme, una o varias entradas; par directo, palanca o reductor; sin apoyo, collarín o rodamiento; compresión o tensión.",
        "Motor progresivo: resuelve con los datos que haya, por cualquier camino válido, e indica qué falta y el próximo dato útil.",
        "Pares de subir y bajar (con sec&alpha; en la Acme), del apoyo, total y de arranque; eficiencia y autobloqueo.",
        "Esfuerzos en el cuerpo (von Mises) y en la raíz del filete (aplastamiento, flexión, cortante, reparto entre filetes, esfuerzos principales).",
        "Pandeo (Euler o Johnson), desgaste por presión de apoyo, velocidad y potencia.",
        "Verificaciones con utilización y criterio que gobierna; dimensionamiento sobre el catálogo Acme.",
    ]))
    s.append(feature_table("2.2  Junta a tensión (&sect;8-3 a &sect;8-11 + Norton &sect;11)", [
        "Rigidez del perno k<sub>b</sub> y de los elementos k<sub>m</sub> (Cornwell o Wileman).",
        "Constante de la junta C (y C efectiva con empaque no confinado).",
        "Precarga F<sub>i</sub> y par de apriete T = K&middot;F<sub>i</sub>&middot;d.",
        "Factores n<sub>p</sub>, n<sub>0</sub> y n<sub>y</sub>; fatiga por Goodman, Gerber y ASME elíptica.",
        "Longitudes de agarre automáticas y uniones con empaque.",
    ], head=ORANGE))
    s.append(feature_table("2.3  Junta a cortante (&sect;8-12)", [
        "Centroide del grupo y cortante directo V/n.",
        "Cortante por momento (carga excéntrica) y perno más cargado.",
        "Cortante del perno, aplastamiento en la placa y tensión en el área neta.",
        "Diseño automático: barrido perno &times; grado y recomendación del menor perno viable.",
    ]))

    s += h1("3. Datos de referencia incluidos")
    s.append(info_table([
        ("Roscas", "UNC, UNF, ISO métrico y Acme; para el tornillo, tamaños Acme de ½ a 2 in con sus pasos preferidos."),
        ("Pernos", "Clases ISO 3.6 a 12.9 y grados SAE 1 a 8.2."),
        ("Tornillo", "Aceros AISI 1010 a 1095 (laminado en caliente y estirado en frío); fricción de rosca y collarín; presión de apoyo; condiciones de extremos."),
        ("Juntas", "Constantes de Wileman y Cornwell, factores K del par de apriete y materiales de empaque."),
    ]))

    s += h1("4. Funciones de la interfaz")
    s.append(bullets([
        "Portada como <b>plano de conjunto</b>: las piezas 1, 2 y 3 abren cada calculadora; lista de piezas, cajetín, «Continuar» y proyectos con miniatura.",
        "Barra superior como cajetín y barra lateral como lista de piezas, con transición fluida desde la portada.",
        "Tornillo de potencia: cálculo en vivo, ecuaciones en notación matemática (general, sustitución y resultado), esquema paramétrico del sistema y gráficos con interpretación.",
        "Proyectos: guardar, abrir, duplicar, importar y exportar (.json), informe en Markdown y autoguardado de la sesión.",
        "Juntas: formularios plegables, avisos de validación, dashboard con gráficos y exportación a PDF.",
        "Unidades SI e imperial, tema claro u oscuro, manual integrado y manuales en PDF.",
    ]))

    s += h1("5. Arquitectura técnica")
    s.append(info_table([
        ("Frontend", "React 18 + TypeScript, empaquetado con Vite; estilos con Tailwind y variables CSS."),
        ("Tornillo", "Motor de reglas puro (sin React) con resolución en vivo en menos de 1 ms; esquema SVG paramétrico."),
        ("Juntas", "Módulos de TypeScript puro ejecutados en un Web Worker."),
        ("Pruebas", "259 pruebas con Vitest: unitarias, de integración y de propiedades (fast-check), validadas contra ejemplos del libro."),
        ("Despliegue", "GitHub Pages con GitHub Actions; se publica en cada push."),
    ]))

    s += h1("6. Alcance y limitaciones")
    s.append(bullets([
        "No envía datos a ningún servidor: proyectos y sesión quedan en el navegador.",
        "Las advertencias son orientativas; no reemplazan el criterio de ingeniería.",
        "La junta a tensión no tiene diseño automático.",
    ]))

    s.append(PageBreak())
    s += references()

    doc.build(s)
    return out


if __name__ == "__main__":
    m = build_manual()
    c = build_capacidades()
    print("OK ->", m, "|", c)
