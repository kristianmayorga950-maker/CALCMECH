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
    c.drawString(MX, 9.5 * mm, "CALCMECH  |  Universidad Industrial de Santander")
    c.drawRightString(PAGE_W - MX, 9.5 * mm, "Pag. %d" % doc.page)
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
    story.append(Paragraph("INGENIERIA MECANICA &middot; DISENO DE MAQUINAS", COVER_KICKER))
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
        ("Que meter", que),
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
        "Budynas, R. G. &amp; Nisbett, J. K. <i>Diseno en Ingenieria Mecanica de Shigley</i>, 9.a ed. McGraw-Hill, 2012. Capitulo 8 (Tornillos, sujetadores y diseno de uniones no permanentes): &sect;8-1 a &sect;8-12; Tablas 8-1, 8-2, 8-7, 8-8, 8-9, 8-11 y 8-15.",
        "Norton, R. L. <i>Diseno de Maquinas: Un Enfoque Integrado</i>, 4.a ed. Pearson, 2011. Capitulo 11 (Tornillos y sujetadores); &sect;11.8 uniones con empaque; Tablas 11-8 y 11-10.",
        "Mott, R. L. <i>Diseno de Elementos de Maquinas</i>, 4.a ed. Pearson. Convenciones de unidades (SI) y esfuerzos admisibles.",
    ]
    out = h1("Referencias")
    lis = [ListItem(Paragraph(r, BODYC), value=i + 1) for i, r in enumerate(refs)]
    out.append(ListFlowable(lis, bulletType="1", leftIndent=14, spaceBefore=2, spaceAfter=4))
    out.append(Spacer(1, 6))
    out.append(Paragraph("Documento generado para la aplicacion CALCMECH &mdash; Universidad Industrial de Santander.", SMALL))
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
        "Calculadora de tornillos y juntas atornilladas",
        ["Basada en Shigley, <i>Diseno en Ingenieria Mecanica</i>, 9.a edicion",
         "Universidad Industrial de Santander",
         "calcmech.github.io &middot; Version 1.0"],
    )

    # Introduccion
    s += h1("1. Introduccion")
    s.append(Paragraph(
        "CALCMECH automatiza tres tipos de calculo de elementos de sujecion: "
        "<b>tornillos de potencia</b>, <b>juntas a tension</b> y <b>juntas a cortante</b>. "
        "Todo el calculo se ejecuta en tu navegador; no se envia ningun dato a un servidor. "
        "Este manual explica, apartado por apartado, <b>que datos ingresar</b>, "
        "<b>que resultados obtienes</b> y un <b>consejo</b> practico para cada uno.", LEDE))
    s.append(Spacer(1, 6))
    s.append(feature_table("Las tres calculadoras", [
        "<b>Tornillo de potencia</b> (Shigley &sect;8-1, &sect;8-2): torques, eficiencia, autobloqueo y esfuerzos.",
        "<b>Junta a tension</b> (&sect;8-3 a &sect;8-11): rigideces, precarga, factores de seguridad y fatiga.",
        "<b>Junta a cortante</b> (&sect;8-12): cortante directo y excentrico, aplastamiento y area neta.",
    ]))

    # Antes de empezar
    s += h1("2. Antes de empezar")
    s += h2("2.1  Recorrido general")
    s.append(bullets([
        "En la <b>pantalla de inicio</b> elige una de las tres calculadoras.",
        "Llena los <b>datos de entrada</b> (columna izquierda) y presiona <b>CALCULAR</b>.",
        "Los <b>resultados</b> aparecen en la columna derecha.",
        "Usa el <b>menu lateral</b> para cambiar de calculadora o volver al inicio.",
    ]))
    s += h2("2.2  Controles de la interfaz")
    s.append(info_table([
        ("Unidades", "Boton SI / Imperial: convierte todo automaticamente (mm/N/MPa o in/lbf/kpsi)."),
        ("Tema", "Boton de sol/luna para alternar tema claro y oscuro."),
        ("Secciones", "Cada bloque del formulario se contrae o expande con el chevron."),
        ("Avisos", "Si falta un dato, un aviso flotante indica cual antes de calcular."),
        ("Tooltips", "El icono de informacion muestra la formula o nota de cada campo."),
    ]))
    s.append(Spacer(1, 6))
    s += h2("2.3  Modo Manual vs. Diseno automatico")
    s.append(body(
        "Las calculadoras de <b>Tornillo de potencia</b> y <b>Junta a cortante</b> tienen un selector "
        "arriba del formulario. En <b>Calculo manual</b> evaluas un caso concreto (una cuerda y un material "
        "que tu eliges). En <b>Diseno automatico</b> la app barre muchas combinaciones (cuerda x material, "
        "o perno x grado) y <b>recomienda el tamano mas pequeno</b> que cumple tu factor de seguridad objetivo, "
        "mostrando la tabla completa de candidatos: es el flujo iterativo tipico del libro."))

    # Tornillo de potencia
    s.append(PageBreak())
    s += h1("3. Tornillo de potencia")
    s.append(body("Resuelve la mecanica de tornillos de potencia Acme y cuadrada (Shigley &sect;8-1 y &sect;8-2)."))
    s.append(apartado("Apartado 1 &mdash; Geometria de la rosca",
        "Tipo de rosca (Acme &alpha;=14.5&deg; o cuadrada &alpha;=0&deg;), numero de entradas, diametro mayor d y paso p. Opcionalmente carga los valores desde tabla.",
        "Diametro medio d<sub>m</sub>, de raiz d<sub>r</sub>, avance L y angulo de avance &lambda;.",
        "Para varias entradas el avance L = n&middot;p crece; vigila que el tornillo siga siendo autobloqueante."))
    s.append(apartado("Apartado 2 &mdash; Carga axial",
        "La fuerza axial F que el tornillo debe elevar, sostener o aplicar.",
        "Es la base de todos los torques y esfuerzos del cuerpo y del filete.",
        "Usa el valor mas desfavorable de operacion; las unidades se ajustan al sistema activo."))
    s.append(apartado("Apartado 3 &mdash; Friccion y collarin",
        "Coeficiente de friccion de la rosca f, filetes en contacto n<sub>t</sub> y, si existe, diametro y friccion del collarin.",
        "Torque de subida T<sub>R</sub>, de bajada T<sub>L</sub>, de collarin T<sub>c</sub>, eficiencia y condicion de autobloqueo.",
        "f &asymp; 0.08 lubricado y 0.15 en seco; un cojinete de bolas baja f<sub>c</sub> &asymp; 0.01."))
    s.append(apartado("Apartado 4 &mdash; Material (opcional)",
        "La resistencia de fluencia S<sub>y</sub> del material del tornillo.",
        "Factor de seguridad contra el esfuerzo de Von Mises del cuerpo.",
        "Solo es necesario si quieres un factor de seguridad; sin material igual obtienes torques y esfuerzos."))
    s.append(apartado("Modo automatico",
        "Carga, friccion y el factor de seguridad objetivo (no eliges cuerda ni material).",
        "Tabla de cuerdas Acme estandar x materiales; recomienda la cuerda mas pequena con n &ge; objetivo.",
        "Sube el factor objetivo para forzar disenos mas robustos (cuerdas mayores)."))

    # Junta a tension
    s.append(PageBreak())
    s += h1("4. Junta a tension")
    s.append(body("Disena uniones atornilladas cargadas a tension (Shigley &sect;8-3 a &sect;8-11 y Norton &sect;11)."))
    s.append(apartado("Apartado 1 &mdash; Geometria del perno",
        "Estandar de rosca (ISO/UNC/UNF), designacion, diametro d, paso p y area de tension A<sub>t</sub>.",
        "Define la rigidez del perno k<sub>b</sub> y la resistencia disponible.",
        "Elige la designacion de la lista para autollenar d, p y A<sub>t</sub> sin errores."))
    s.append(apartado("Apartado 2 &mdash; Grado / clase",
        "Primero el <b>Sistema</b> (ISO clases 3.6&hellip;12.9 o SAE grados 1&hellip;8.2) y luego la <b>Clase/Grado</b>.",
        "Resistencias S<sub>p</sub>, S<sub>y</sub>, S<sub>ut</sub> y S<sub>e</sub> del perno.",
        "Si cambias de sistema (ISO&harr;SAE) debes <b>volver a seleccionar</b> la clase."))
    s.append(apartado("Apartado 3 &mdash; Longitud de agarre",
        "Grip l y su reparto entre parte sin rosca l<sub>d</sub> y roscada l<sub>t</sub>; o modo automatico con la Tabla 8-7 (solo L y l).",
        "Entra en la rigidez del perno k<sub>b</sub> (Ec. 8-17).",
        "Si todo el agarre esta roscado, pon l<sub>d</sub> = 0; el modo Tabla 8-7 calcula l<sub>d</sub> y l<sub>t</sub> por ti."))
    s.append(apartado("Apartado 4 &mdash; Rigidez del paquete",
        "Metodo Cornwell FEA (recomendado: modulos E y espesores de las placas) o Wileman (material del elemento).",
        "Rigidez de los elementos k<sub>m</sub> y la constante de junta C.",
        "Cornwell da C directamente y admite dos materiales; valido para j = d/l entre 0.10 y 2.00."))
    s.append(apartado("Apartado 5 &mdash; Precarga y apriete",
        "Tipo de union (reutilizable 0.75&middot;F<sub>p</sub>, permanente 0.90&middot;F<sub>p</sub> o personalizada), precarga fija opcional y factor K del par.",
        "Precarga F<sub>i</sub> y par de apriete T = K&middot;F<sub>i</sub>&middot;d (Ec. 8-27).",
        "Una precarga alta mejora la fatiga y el sellado, pero acerca el perno a su limite de fluencia."))
    s.append(apartado("Apartado 6 &mdash; Carga externa",
        "Carga por perno P (o total dividida entre N pernos) y el tipo: estatica o de fatiga (Goodman/Gerber/ASME).",
        "Factores de carga n<sub>p</sub>, de separacion n<sub>0</sub>, de fluencia n<sub>y</sub> y de fatiga n<sub>f</sub>.",
        "Verifica que n<sub>0</sub> &gt; 1 para que la junta no se separe antes de fallar el perno."))
    s.append(apartado("Apartado 7 &mdash; Union con empaque (opcional)",
        "Tipo confinado o no confinado (con modulo E<sub>g</sub> y espesor t<sub>g</sub>), area del empaque y diametro del circulo de pernos.",
        "Rigidez del empaque k<sub>g</sub>, presion de sellado y verificacion del espaciado entre pernos (Ec. 8-34).",
        "En empaque no confinado, k<sub>g</sub> en serie con k<sub>m</sub> aumenta la fraccion de carga sobre el perno."))

    # Junta a cortante
    s.append(PageBreak())
    s += h1("5. Junta a cortante")
    s.append(body("Analiza grupos de pernos cargados a cortante directo y excentrico (Shigley &sect;8-12)."))
    s.append(apartado("Apartado 1 &mdash; Patron de pernos",
        "Coordenadas (x, y) de cada perno; agrega o elimina pernos del patron.",
        "Centroide del grupo y &Sigma;r<sub>i</sub><super>2</super> para el reparto del momento.",
        "Un patron simetrico centrado sobre la linea de accion de V anula el momento."))
    s.append(apartado("Apartado 2 &mdash; Perno",
        "Diametro d, area a cortante (A<sub>t</sub> o &pi;d<super>2</super>/4), cortante simple o doble y grado (S<sub>p</sub>, S<sub>y</sub>, S<sub>ut</sub>).",
        "Esfuerzo cortante del perno y su factor de seguridad (&tau;<sub>adm</sub> = 0.577&middot;S<sub>p</sub>).",
        "Si la rosca cae en el plano de corte usa A<sub>t</sub>; si solo el vastago, &pi;d<super>2</super>/4."))
    s.append(apartado("Apartado 3 &mdash; Carga aplicada V",
        "Magnitud de V, su direccion y el punto de aplicacion.",
        "Cortante directo V/n y cortante por momento; fuerza resultante en el perno mas cargado.",
        "Si el punto de aplicacion no coincide con el centroide aparece un momento (carga excentrica)."))
    s.append(apartado("Apartado 4 &mdash; Placa / elemento sujetado",
        "Espesor t, ancho w (activa la tension en area neta) y propiedades S<sub>y</sub>/S<sub>ut</sub>.",
        "Aplastamiento (&sigma; = F/(t&middot;d), Ec. 8-49) y tension en el area neta.",
        "Respeta separaciones minimas: 3d entre pernos y 1.5d al borde (practica AISC)."))
    s.append(apartado("Modo automatico",
        "Patron, carga V, placa y el factor de seguridad objetivo (no eliges perno ni grado).",
        "Tabla de pernos x grados; recomienda el menor perno con n &ge; objetivo.",
        "Elige el modo de area (A<sub>t</sub> o &pi;d<super>2</super>/4) segun donde caiga el plano de corte."))

    # Lectura de resultados
    s.append(PageBreak())
    s += h1("6. Como leer los resultados")
    s.append(info_table([
        ("Veredicto", "Tarjeta con el factor de seguridad gobernante y si el diseno es valido, marginal o invalido."),
        ("Parametros", "Los valores efectivamente usados en el calculo."),
        ("Desarrollo", "Tabla con cada parametro, su formula en notacion matematica y su valor."),
        ("Tabla iterativa", "En modo automatico: candidatos ordenados; el recomendado va marcado con una estrella."),
        ("Dashboard", "Graficos interactivos de la distribucion de esfuerzos y cargas."),
        ("Exportar", "Genera un PDF del dashboard de resultados para tu informe."),
    ]))
    s.append(Spacer(1, 8))
    s += h2("Consejos finales")
    s.append(bullets([
        "Usa <b>punto (.)</b> como separador decimal, no coma.",
        "En modo automatico, el <b>factor de seguridad objetivo</b> es el que define el candidato recomendado.",
        "Las advertencias (p. ej. <i>no autobloqueante</i>) son informativas y no detienen el calculo.",
        "Los calculos usan SI internamente; las entradas imperiales se convierten antes de calcular.",
    ]))

    # Referencias
    s.append(PageBreak())
    s += references()

    doc.build(s)
    return out


# ════════════════════════════════════════════════════════════════════════════
#  PDF 2 — CAPACIDADES DE LA APLICACION
# ════════════════════════════════════════════════════════════════════════════
def build_capacidades():
    out = "Capacidades_CALCMECH.pdf"
    doc = build_doc(os.path.join(OUTDIR, out), "Capacidades de la Aplicacion - CALCMECH")
    s = []
    s += cover(
        ["Capacidades", "de la Aplicacion"],
        "Alcance funcional y tecnico de CALCMECH",
        ["Calculadora de tornillos y juntas atornilladas",
         "Universidad Industrial de Santander",
         "Documento tecnico &middot; Version 1.0"],
    )

    s += h1("1. Resumen")
    s.append(Paragraph(
        "CALCMECH es una aplicacion web que automatiza el analisis y diseno de elementos de "
        "sujecion segun Shigley (9.a ed.) y Norton (4.a ed.). Integra tres calculadoras, un modo "
        "de diseno iterativo, tablas de referencia normalizadas y exportacion de resultados, "
        "todo ejecutandose localmente en el navegador.", LEDE))

    s += h1("2. Modulos de calculo")
    s.append(feature_table("2.1  Tornillo de potencia (&sect;8-1, &sect;8-2)", [
        "Roscas Acme (&alpha;=14.5&deg;) y cuadrada (&alpha;=0&deg;), una o varias entradas.",
        "Geometria: diametro medio d<sub>m</sub>, de raiz d<sub>r</sub>, avance L y angulo &lambda;.",
        "Torque de subida T<sub>R</sub> y de bajada T<sub>L</sub> (con sec&alpha; para Acme) y torque de collarin T<sub>c</sub>.",
        "Eficiencia, condicion de autobloqueo y esfuerzo de Von Mises del cuerpo.",
        "Esfuerzos en el filete: aplastamiento, flexion y cortante.",
    ]))
    s.append(feature_table("2.2  Junta a tension (&sect;8-3 a &sect;8-11 + Norton &sect;11)", [
        "Rigidez del perno k<sub>b</sub> y de los elementos k<sub>m</sub> (Cornwell FEA o Wileman).",
        "Constante de junta C (y C efectiva con empaque no confinado).",
        "Precarga F<sub>i</sub> y par de apriete T = K&middot;F<sub>i</sub>&middot;d.",
        "Factores de seguridad n<sub>p</sub>, n<sub>0</sub> y n<sub>y</sub>; fatiga por Goodman, Gerber y ASME-eliptica.",
        "Longitudes por Tabla 8-7 y uniones con empaque (confinado/no confinado, Ec. 8-34).",
    ], head=ORANGE))
    s.append(feature_table("2.3  Junta a cortante (&sect;8-12)", [
        "Centroide del grupo y reparto de cortante directo V/n.",
        "Cortante por momento (carga excentrica) y perno mas cargado.",
        "Esfuerzo cortante del perno (&tau;<sub>adm</sub> = 0.577&middot;S<sub>p</sub>).",
        "Aplastamiento en placa (Ec. 8-49) y tension en el area neta.",
        "Veredicto del criterio que gobierna el diseno.",
    ]))

    s += h1("3. Diseno iterativo automatico")
    s.append(body(
        "Para tornillo de potencia y junta a cortante, la app barre el producto cartesiano "
        "<b>cuerda x material</b> o <b>perno x grado</b>, evalua cada combinacion con los mismos "
        "calculos del libro, las ordena por diametro y <b>recomienda el menor tamano viable</b> "
        "(n &ge; objetivo), mostrando la tabla completa de candidatos."))

    s += h1("4. Datos de referencia incluidos")
    s.append(info_table([
        ("Roscas", "UNC, UNF, ISO metrico y Acme (diametros, paso, areas A<sub>t</sub>/A<sub>r</sub>)."),
        ("Pernos", "Clases ISO 3.6&hellip;12.9 (Tabla 8-11) y grados SAE 1&hellip;8.2 (Tabla 8-9)."),
        ("Tornillo potencia", "Aceros 1020, 1040, 4140 e inoxidable 304."),
        ("Wileman", "Constantes A y B para acero, aluminio, cobre y hierro colado (Tabla 8-8)."),
        ("Cornwell", "Constantes de rigidez de los elementos (Tabla 11-8)."),
        ("Apriete", "Factores K del par de apriete (Tabla 8-15)."),
        ("Empaques", "Materiales y modulos E<sub>g</sub> (Norton Tabla 11-10)."),
    ]))

    s.append(PageBreak())
    s += h1("5. Funciones de la interfaz")
    s.append(bullets([
        "Pantalla de inicio con seleccion de calculadora y <b>manual de uso integrado</b>.",
        "Espacio de trabajo de dos columnas (entrada / resultados).",
        "Cambio de unidades SI &harr; Imperial con conversion automatica.",
        "Tema claro / oscuro con persistencia.",
        "Secciones de formulario plegables y avisos de validacion flotantes.",
        "Formulas renderizadas en notacion matematica (KaTeX).",
        "Graficos interactivos de distribucion de esfuerzos (Recharts) y dashboard.",
        "Tabla de alternativas y tabla de diseno iterativo.",
        "Exportacion de resultados a PDF.",
    ]))

    s += h1("6. Arquitectura tecnica")
    s.append(info_table([
        ("Frontend", "React 18 + TypeScript, empaquetado con Vite."),
        ("Estilos", "Tailwind CSS con tokens de color por variables CSS (tema claro/oscuro)."),
        ("Calculo", "Modulos de TypeScript puro ejecutados en un Web Worker (UI siempre fluida)."),
        ("Estado", "Context + useReducer como fuente unica de verdad de las tres pestanas."),
        ("Datos", "Tablas JSON cargadas al inicio (patron singleton)."),
        ("Pruebas", "127 pruebas (unitarias e integracion) con Vitest, validadas contra ejemplos del libro."),
        ("Despliegue", "GitHub Pages mediante GitHub Actions (build automatico en cada push)."),
    ]))

    s += h1("7. Alcance y limitaciones")
    s.append(bullets([
        "No guarda ni envia datos a ningun servidor: todo es local en el navegador.",
        "Las advertencias son orientativas; no reemplazan el criterio de ingenieria.",
        "El modo de diseno automatico cubre Tornillo de potencia y Junta a cortante (no Tension).",
    ]))

    s.append(PageBreak())
    s += references()

    doc.build(s)
    return out


if __name__ == "__main__":
    m = build_manual()
    c = build_capacidades()
    print("OK ->", m, "|", c)

