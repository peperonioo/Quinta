#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Easy Fifth Circle — Auditoría V5.11 + Roadmap de producto (ES)."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                HRFlowable, ListFlowable, ListItem, PageBreak, KeepTogether)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont("Inter",     "/tmp/Inter-Regular.ttf"))
pdfmetrics.registerFont(TTFont("InterBold",  "/tmp/Inter-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Anton",      "/tmp/Anton-Regular.ttf"))

OUT    = "/Users/pedroipince/Documents/CLAUDE/FIFTH CIRCLE/Circle of Fifth Git/Easy_Fifth_Circle_V5.11_Audit_ES.pdf"
INK    = HexColor("#15151A")
ORANGE = HexColor("#E8441A")
ORANGE2= HexColor("#FF6A3D")
DIM    = HexColor("#6A6A72")
LINE   = HexColor("#E2DCD2")
CARD   = HexColor("#FAF6EF")
GREEN  = HexColor("#2E9E6B")
BG     = HexColor("#FFFFFF")

ss = getSampleStyleSheet()
def S(name, **kw):
    base = kw.pop("parent", ss["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

H1   = S("H1", fontName="Anton", fontSize=26, textColor=INK, leading=30, spaceAfter=2)
SUB  = S("SUB", fontName="Inter", fontSize=10.5, textColor=DIM, leading=15, spaceAfter=10)
H2   = S("H2", fontName="Anton", fontSize=15, textColor=ORANGE, leading=19, spaceBefore=15, spaceAfter=6)
H3   = S("H3", fontName="InterBold", fontSize=11.5, textColor=INK, leading=15, spaceBefore=9, spaceAfter=3)
BODY = S("BODY", fontName="Inter", fontSize=9.7, textColor=INK, leading=14.5, spaceAfter=5, alignment=TA_LEFT)
SMALL= S("SMALL", fontName="Inter", fontSize=8.6, textColor=DIM, leading=12)
LI   = S("LI", fontName="Inter", fontSize=9.6, textColor=INK, leading=14)
CELL = S("CELL", fontName="Inter", fontSize=8.7, textColor=INK, leading=12)
CELLH= S("CELLH", fontName="InterBold", fontSize=8.9, textColor=HexColor("#FFFFFF"), leading=12)
CELLB= S("CELLB", fontName="InterBold", fontSize=8.7, textColor=INK, leading=12)
TAG  = S("TAG", fontName="InterBold", fontSize=8.5, textColor=ORANGE, leading=12)

def rule(c=LINE, w=0.8, sb=2, sa=8):
    return HRFlowable(width="100%", thickness=w, color=c, spaceBefore=sb, spaceAfter=sa)

def bullets(items, st=LI):
    return ListFlowable(
        [ListItem(Paragraph(t, st), leftIndent=10, value="•") for t in items],
        bulletType="bullet", bulletColor=ORANGE, bulletFontSize=7, leftIndent=12, spaceAfter=5)

def card(flows, pad=9, bg=CARD, bd=LINE):
    t = Table([[flows]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",(0,0),(-1,-1),bg),("BOX",(0,0),(-1,-1),0.8,bd),
        ("LEFTPADDING",(0,0),(-1,-1),pad),("RIGHTPADDING",(0,0),(-1,-1),pad),
        ("TOPPADDING",(0,0),(-1,-1),pad),("BOTTOMPADDING",(0,0),(-1,-1),pad)]))
    return t

story = []

# ── PORTADA ───────────────────────────────────────────────
story += [Spacer(1, 6*mm)]
story += [Paragraph("EASY FIFTH CIRCLE", H1)]
story += [Paragraph("Auditoría <b>V5.11</b> · Roadmap de producto · Plan de monetización &nbsp;—&nbsp; Junio 2026", SUB)]
story += [rule(ORANGE, 1.4, 0, 10)]

meta = Table([[
    Paragraph("<b>Versión</b><br/>V5.11", CELL),
    Paragraph("<b>Stack</b><br/>Vanilla JS · CSS · WebGL · Web Audio", CELL),
    Paragraph("<b>Deploy</b><br/>GitHub Pages · PWA instalable", CELL),
    Paragraph("<b>Tests</b><br/>68 EFC_DEV (núcleo OK)", CELL),
]], colWidths=[34*mm, 52*mm, 50*mm, 34*mm])
meta.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,-1),CARD),("BOX",(0,0),(-1,-1),0.8,LINE),
    ("INNERGRID",(0,0),(-1,-1),0.6,LINE),("VALIGN",(0,0),(-1,-1),"TOP"),
    ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
    ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
story += [meta, Spacer(1, 5*mm)]

# ── RESUMEN EJECUTIVO ─────────────────────────────────────
story += [Paragraph("Resumen ejecutivo", H2)]
story += [Paragraph(
    "Easy Fifth Circle es una herramienta interactiva de armonía y teoría musical: una rueda de "
    "quintas viva donde el usuario explora tonalidades y modos, construye progresiones con física "
    "de burbujas, las escucha con un sintetizador propio (Rhodes FM, guitarra de nylon, batería "
    "808/909), y las exporta a MIDI. Es una PWA instalable, offline, con identidad visual fuerte "
    "(plasma WebGL + UI liquid-gel).", BODY)]
story += [Paragraph(
    "<b>Estado:</b> producto técnicamente maduro y feature-rich. El núcleo de teoría y audio es "
    "sólido (68 tests). <b>El paso crítico ya no es técnico, es de producto:</b> falta el onboarding, "
    "el empaquetado a tienda y una capa de funciones \"premium\" que justifiquen pago. Este documento "
    "audita lo construido y traza el camino a producto vendible.", BODY)]

# ── NOVEDADES ─────────────────────────────────────────────
story += [Paragraph("Novedades V5.7 → V5.11", H2)]

story += [Paragraph("V5.7 · Playhead arrastrable + metrónomo continuo", H3)]
story += [Paragraph(
    "Aguja de reproducción arrastrable en la timeline del builder para elegir desde dónde sonar. "
    "Con el reloj (reloj) activo, el metrónomo suena durante toda la progresión, no solo en la cuenta de "
    "entrada.", BODY)]

story += [Paragraph("V5.8 · Selector de sonido de metrónomo", H3)]
story += [Paragraph(
    "Tres timbres de click seleccionables (Wood · Rim · Elec), persistidos en <font face='InterBold'>"
    "st.metroSound</font>.", BODY)]

story += [Paragraph("V5.9 – V5.11 · La saga de la voz de guitarra (resuelta)", H3)]
story += [Paragraph(
    "El reto técnico de la serie. La síntesis de cuerda pulsada (Karplus-Strong) no funcionaba en "
    "Web Audio porque el <font face='InterBold'>DelayNode</font> añade ~128 muestras (2.9 ms) de "
    "latencia fija a cualquier bucle de realimentación — más que el periodo entero de una nota aguda, "
    "lo que desafinaba completamente el tono y producía un barrido grave→agudo.", BODY)]
story += [Paragraph(
    "<b>Solución (V5.9):</b> ejecutar Karplus-Strong muestra a muestra en JavaScript y reproducir el "
    "resultado como AudioBuffer. <b>V5.11 reconstruyó la voz de cero</b> como un modelo de nylon fiel: "
    "afinación de retardo fraccional (pitch exacto a cualquier frecuencia), filtro peine de posición "
    "de púa (timbre amaderado), excitación de ruido suavizada (ataque redondo del nylon), filtro de "
    "amortiguación en el bucle con ganancia escalada por frecuencia (T60 ≈ 1.5 s graves / 0.9 s "
    "agudos) y EQ de resonancia de cuerpo (picos a 100 Hz Helmholtz y 215 Hz tapa).", BODY)]

story += [Paragraph("V5.10 – V5.11 · Diagramas de acordes en el mástil", H3)]
story += [Paragraph(
    "Botón <font face='InterBold'>Shapes</font> en el cajón de guitarra: despliega una tira con "
    "diagramas SVG en notación de tablero. Dos vistas con control segmentado <b>Acordes | Tríadas</b>: "
    "voicings completos (abierto, cejillas Mi/La, posición alta) y <b>tríadas en las 3 cuerdas agudas</b> "
    "(Sol/Si/Mi) etiquetadas por inversión (Fund. / 1ª inv / 2ª inv). Al tocar un diagrama, el mástil "
    "muestra solo las 6 posiciones exactas de ese voicing. La fundamental se marca con centro hueco; "
    "rejilla theme-aware (claro + oscuro).", BODY)]

story += [PageBreak()]

# ── ARQUITECTURA ──────────────────────────────────────────
story += [Paragraph("Arquitectura actual", H2)]
story += [bullets([
    "<b>~31 módulos</b> en <font face='InterBold'>src/</font> (core · i18n · theory · ui · interactions · styles · dev). Sin framework, sin dependencias en runtime.",
    "<b>build.js</b> (Node) concatena módulos → <font face='InterBold'>dist/Easy_Fifth_Circle.html</font> (~356 KB standalone) + <font face='InterBold'>index.html</font> para GitHub Pages.",
    "<b>Estado global st</b> en localStorage, mutado solo por <font face='InterBold'>AppActions.*</font> vía dispatcher. <b>RenderEngine.full()/.partial([])</b> orquesta todo el DOM.",
    "<b>OverlayManager</b> — contrato único para todos los overlays (Escape + click-fuera centralizados). 10 overlays registrados.",
    "<b>68 tests</b> en EFC_DEV.runTests() cubren teoría y audio. PWA: manifest + SW (efc-v5.11) + iconos.",
])]

# ── FUNCIONALIDADES ───────────────────────────────────────
story += [Paragraph("Funcionalidades completas (acumuladas)", H2)]
rows = [
    [Paragraph("Área", CELLH), Paragraph("Funciones", CELLH)],
    [Paragraph("Rueda", CELLB), Paragraph("Drag-spin con momentum, ratchet háptico, sectores diatónicos resaltados con acento de paleta, sonido al tocar, guía de dirección Quintas/Cuartas.", CELL)],
    [Paragraph("Teoría", CELLB), Paragraph("7 modos (Jónico→Locrio), vista Mayor/Menor, modelo key/tonality/mode desacoplado y documentado como contrato.", CELL)],
    [Paragraph("Builder", CELLB), Paragraph("Drag para reordenar, timeline Klimper con duración por compás, playhead arrastrable, física de burbujas (spring), fly-to-pill WAAPI, Dynamic-Island de variantes.", CELL)],
    [Paragraph("Sugerencias", CELLB), Paragraph("Motor de armonía por género + mood con lookahead de 2 pasos, burbujas liquid-gel con anillo de fuerza.", CELL)],
    [Paragraph("Audio", CELLB), Paragraph("Rhodes FM, voice-leading 2.0, guitarra de nylon (K-S extendido), batería 808/909, metrónomo con lookahead + 3 timbres.", CELL)],
    [Paragraph("Instrumentos", CELLB), Paragraph("Piano + mástil click-to-play, resaltado exacto del acorde, diagramas de acordes/tríadas, zoom fullscreen + landscape.", CELL)],
    [Paragraph("Export", CELLB), Paragraph("MIDI tipo-0, link compartible base64, biblioteca de progresiones (8 presets + guardar/cargar).", CELL)],
    [Paragraph("Producción", CELLB), Paragraph("Batería sintetizada, groove player sincronizado al BPM, sub-bass 808.", CELL)],
    [Paragraph("Plataforma", CELLB), Paragraph("PWA instalable + offline, tema claro/oscuro, 4 paletas plasma, i18n EN/ES, a11y ARIA, FAB de modo móvil.", CELL)],
]
t = Table(rows, colWidths=[26*mm, 144*mm])
t.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),ORANGE),("ROWBACKGROUNDS",(0,1),(-1,-1),[BG, CARD]),
    ("BOX",(0,0),(-1,-1),0.8,LINE),("INNERGRID",(0,0),(-1,-1),0.5,LINE),
    ("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),
    ("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
story += [t]

story += [PageBreak()]

# ── ROADMAP PRIORIZADO ────────────────────────────────────
story += [Paragraph("Roadmap priorizado — el camino a producto", H2)]
story += [Paragraph(
    "Orden recomendado por impacto/esfuerzo. Cada función nueva está diseñada abajo en detalle. "
    "La regla: lo que desbloquea retención y lo que se puede vender, primero.", BODY)]

prio = [
    ["#", "Función", "Por qué ahora", "Esf."],
    ["1", "Onboarding didáctico", "El hueco nº1. Sin él, un usuario nuevo no entiende el flujo. Bloquea todo lo demás.", "M"],
    ["2", "Sugeridor por emoción", "Máximo \"wow\" y valor de marketing, bajo riesgo teórico. Extiende MOOD_PROFILES.", "M"],
    ["3", "Bloqueo de acorde", "Mejora la exploración sin coste de UI. Gesto pequeño, gran utilidad.", "S"],
    ["4", "Coach de modulaciones", "Diferenciador real: casi ninguna app lo tiene. Apóyate en el motor de armonía.", "M-L"],
    ["5", "Web MIDI → Ableton", "Conecta con el flujo pro del músico. MIDI ya existe; falta salida en vivo.", "M"],
    ["6", "Empaquetado a tienda", "Capacitor/PWABuilder → App Store + Play. La PWA ya está lista.", "M"],
]
pr = Table([[Paragraph(c, CELLH if i==0 else (CELLB if j in (0,3) else CELL)) for j,c in enumerate(r)]
            for i,r in enumerate(prio)],
           colWidths=[10*mm, 42*mm, 104*mm, 14*mm])
pr.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),INK),("ROWBACKGROUNDS",(0,1),(-1,-1),[BG, CARD]),
    ("BOX",(0,0),(-1,-1),0.8,LINE),("INNERGRID",(0,0),(-1,-1),0.5,LINE),
    ("VALIGN",(0,0),(-1,-1),"TOP"),("ALIGN",(0,0),(0,-1),"CENTER"),("ALIGN",(3,0),(3,-1),"CENTER"),
    ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
    ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
# header text white
pr.setStyle(TableStyle([("TEXTCOLOR",(0,0),(-1,0),HexColor("#FFFFFF"))]))
story += [pr, Spacer(1,3*mm)]
story += [Paragraph("Esf. = esfuerzo estimado: S pequeño · M medio · L grande.", SMALL)]

# ── DISEÑO DE FUNCIONES NUEVAS ────────────────────────────
story += [Paragraph("Diseño de las funciones nuevas", H2)]

# 1 Chord lock
story += [Paragraph("① Bloqueo de acorde — \"hold para auditar\"", H3)]
story += [Paragraph(
    "<b>Problema:</b> al tocar un acorde en la rueda, todo el contexto (grados, escala, sugerencias) "
    "se mueve con él. El usuario quiere escuchar otros acordes <i>sin perder su sitio</i>.", BODY)]
story += [Paragraph(
    "<b>Propuesta — sin modo, solo un gesto:</b> mantén pulsado (long-press) un sector para "
    "<b>fijarlo</b>. Aparece un candado pequeño en ese sector + feedback háptico. Mientras está fijado, "
    "tocar otros sectores <b>solo suena</b> (audición) con un resaltado fantasma temporal, pero el "
    "contexto no se mueve. Vuelves a tocar el candado para soltar. Cero peso cognitivo: si no usas el "
    "gesto, la app se comporta igual que ahora.", BODY)]
story += [card([Paragraph(
    "<b>Implementación:</b> nuevo flag <font face='InterBold'>st.lockedChord</font> (o variable de "
    "interacción). WheelInteraction detecta long-press (ya hay infra de gestos + háptica). Cuando hay "
    "bloqueo: SET_KEY desde la rueda → en vez de despachar, llama a una ruta \"audición\" "
    "(AudioEngine.playChord + highlight efímero). El candado se dibuja en renderWheel sobre el sector "
    "fijado. Coste: 1 archivo de interacción + un glifo SVG. Esfuerzo S.", CELL)])]

# 2 Emotion
story += [Paragraph("② Sugeridor por emoción", H3)]
story += [Paragraph(
    "<b>Idea:</b> el usuario elige la <i>emoción</i> que quiere transmitir y la app propone una "
    "progresión completa — no solo acordes sueltos, sino una <b>narración guiada por grados</b> "
    "(\"empieza en i para asentar la melancolía, sube a bVI para abrir, tensa con bVII y resuelve\").", BODY)]
story += [Paragraph(
    "<b>Encaje técnico:</b> ya existe <font face='InterBold'>MOOD_PROFILES</font> en harmony-engine. "
    "Esto añade una capa de <i>plantillas de progresión</i> por emoción (secuencias de grados) + texto "
    "narrativo. Mapeos fundamentados:", BODY)]
emo = [
    ["Emoción", "Tonalidad / modo", "Plantilla de grados", "Ejemplo en Do"],
    ["Feliz / Esperanzador", "Mayor", "I–V–vi–IV · I–IV–V", "C–G–Am–F"],
    ["Triste / Melancólico", "Menor (eólico)", "i–VI–III–VII · i–iv–v", "Am–F–C–G"],
    ["Nostálgico", "Mayor", "I–vi–IV–V (50s) · ii–V–I", "C–Am–F–G"],
    ["Épico / Triunfal", "Mayor / mixolidio", "I–bVII–IV · i–bVI–bVII", "C–Bb–F"],
    ["Soñador / Etéreo", "Lidio + préstamo", "IV-céntrico + bVI/bVII prestados", "F–C–Ab–Bb"],
    ["Tenso / Oscuro", "Frigio / menor", "i–bII · i–bVI–V", "Am–Bb · Am–F–E"],
    ["Romántico", "Mayor con extens.", "I–vi–ii–V (con 7ª/9ª)", "Cmaj7–Am7–Dm7–G7"],
]
et = Table([[Paragraph(c, CELLH if i==0 else (CELLB if j==0 else CELL)) for j,c in enumerate(r)]
            for i,r in enumerate(emo)],
           colWidths=[34*mm, 34*mm, 60*mm, 42*mm])
et.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),ORANGE),("TEXTCOLOR",(0,0),(-1,0),HexColor("#FFFFFF")),
    ("ROWBACKGROUNDS",(0,1),(-1,-1),[BG, CARD]),
    ("BOX",(0,0),(-1,-1),0.8,LINE),("INNERGRID",(0,0),(-1,-1),0.5,LINE),
    ("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
    ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
story += [et, Spacer(1,2*mm)]
story += [Paragraph(
    "<b>UI:</b> chips de emoción en una pestaña del sugeridor. Al elegir, se siembra la progresión en "
    "el builder + una tarjeta con la narración. Combinable con el género existente. <b>Esta es la "
    "función con mayor valor comercial</b> para el público no-teórico. Esfuerzo M.", BODY)]

story += [PageBreak()]

# 3 Modulation
story += [Paragraph("③ Coach de modulaciones", H3)]
story += [Paragraph(
    "<b>Idea:</b> un apartado \"Modular a…\" que explique <i>cómo</i> pasar a un acorde o tonalidad "
    "fuera de la escala actual, con un <b>acorde puente</b> y una explicación breve, e integrado en el "
    "sugeridor de acordes.", BODY)]
story += [Paragraph(
    "<b>Teoría aplicada (fundamentada en fuentes):</b> la modulación más común y suave es por "
    "<b>acorde pivote</b> (común a ambas tonalidades). Funciona mejor entre <b>tonalidades cercanas</b> "
    "— a ±1 alteración en el círculo de quintas (dominante, subdominante, relativo). El pivote ideal "
    "suele ser un <b>pre-dominante (ii o IV) en la tonalidad destino</b>. Alternativa directa: salto a "
    "la <b>V de la nueva tonalidad</b> (modulación \"de camionero\", típica del pop).", BODY)]
story += [card([
    Paragraph("<b>Algoritmo del motor:</b>", CELL),
    bullets([
        "Para la tonalidad destino T, calcula sus 7 tríadas diatónicas.",
        "Intersecta (por raíz + cualidad) con las de la tonalidad actual → <b>pivotes candidatos</b>. Ej.: Do→Sol comparten Sol, Si m, Re, Mi m.",
        "Prioriza pivotes que sean ii o IV en T (pre-dominantes = transición más fluida).",
        "Salida: <b>pivote → V de T → I de T</b> + explicación de una línea (\"Am es vi en Do y ii en Sol; úsalo de puente, luego D7→G\").",
        "Sugiere 3–4 destinos naturales: dominante, subdominante, relativo, paralelo.",
        "En el sugeridor: marca con color/icono los movimientos de modulación (p. ej. dominantes secundarias V/x).",
    ], CELL),
])]
story += [Paragraph(
    "<b>UI:</b> panel \"Modulaciones\" + opción \"Modular a…\" en cada acorde. <b>Diferenciador "
    "fuerte</b> — Scaler/Hooktheory no lo explican pedagógicamente. Esfuerzo M-L.", BODY)]

# 4 Ableton
story += [Paragraph("④ Integración con Ableton / DAW", H3)]
story += [Paragraph(
    "Camino realista por fases, sin reescribir nada:", BODY)]
story += [bullets([
    "<b>Fase 1 (ya posible hoy):</b> el export MIDI tipo-0 se arrastra directo a Ableton. Solo hay que pulir el nombrado del clip y documentarlo.",
    "<b>Fase 2 (cercana):</b> <b>Web MIDI API</b> (Chrome) → bus virtual IAC (macOS) / loopMIDI (Windows) → tocar la progresión <i>en vivo</i> dentro de Ableton con &lt;5 ms de latencia. El navegador no puede crear el puerto virtual solo; el usuario activa el loopback del sistema una vez.",
    "<b>Fase 3 (futuro):</b> dispositivo <b>Max for Live</b> compañero que reciba la progresión y la coloque como clips, o sincronización de tempo.",
])]
story += [Paragraph(
    "Es una función <b>premium</b> natural: conecta la app con el flujo de trabajo profesional.", BODY)]

story += [PageBreak()]

# ── CAMINO A PRODUCTO ─────────────────────────────────────
story += [Paragraph("De prototipo a producto vendible", H2)]
story += [Paragraph(
    "La tecnología ya está. Convertirlo en producto es un trabajo de <b>empaquetado, pulido y "
    "modelo de negocio</b>, no de ingeniería pesada.", BODY)]

story += [Paragraph("Distribución", H3)]
story += [bullets([
    "La base PWA ya está hecha (manifest + SW + iconos + instalable + offline).",
    "Envolver con <b>Capacitor</b> o <b>PWABuilder</b> → <b>App Store (iOS)</b>, <b>Google Play (TWA)</b> y <b>Mac App Store</b> reutilizando el mismo código.",
    "La web sigue viva como demo gratuita y captación (SEO + landing).",
])]

story += [Paragraph("Modelo de monetización (recomendado: freemium con desbloqueo único)", H3)]
mon = [
    ["Capa", "Contenido", "Precio"],
    ["Gratis", "Rueda, teoría, modos, builder básico, escuchar, piano/guitarra.", "0 €"],
    ["Premium (desbloqueo único)", "Sugeridor por emoción, coach de modulaciones, export MIDI/Ableton, zoom de instrumentos, biblioteca ampliada.", "≈ 7,99–9,99 €"],
    ["Pro (solo si hay nube)", "Sincronización en la nube, colaboración, packs de sonidos. Suscripción opcional futura.", "susc. opc."],
]
mt = Table([[Paragraph(c, CELLH if i==0 else (CELLB if j==0 else CELL)) for j,c in enumerate(r)]
            for i,r in enumerate(mon)],
           colWidths=[44*mm, 100*mm, 26*mm])
mt.setStyle(TableStyle([
    ("BACKGROUND",(0,0),(-1,0),GREEN),("TEXTCOLOR",(0,0),(-1,0),HexColor("#FFFFFF")),
    ("ROWBACKGROUNDS",(0,1),(-1,-1),[BG, CARD]),
    ("BOX",(0,0),(-1,-1),0.8,LINE),("INNERGRID",(0,0),(-1,-1),0.5,LINE),
    ("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
    ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
story += [mt, Spacer(1,2*mm)]
story += [Paragraph(
    "<b>Por qué desbloqueo único y no suscripción:</b> los músicos rechazan suscripciones para "
    "herramientas de creación. Referencias de mercado 2025: <b>Scaler 3</b> $79 intro / $99 (pago "
    "único, plugin); <b>Hookpad</b> $199 único o $7,99/mes (+ IA $14,99/mes). EFC juega en otra liga: "
    "<b>móvil-first, visual y accesible</b> — no compite de frente con plugins de escritorio.", BODY)]

story += [Paragraph("Diferenciadores a explotar en el marketing", H3)]
story += [bullets([
    "La <b>rueda diatónica visual</b> y la UX liquid-gel: nadie se ve así.",
    "El <b>sugeridor por emoción</b>: habla el idioma del compositor no-teórico (\"quiero algo nostálgico\").",
    "El <b>coach de modulaciones</b>: enseña, no solo genera. Casi inédito en apps.",
    "PWA instalable que compite con apps nativas a coste de desarrollo mínimo.",
])]

story += [Paragraph("Checklist pre-lanzamiento", H3)]
story += [bullets([
    "<b>Onboarding</b> (bloqueante) · <b>marca + nombre</b> · <b>landing page</b> con captación de emails desde ya.",
    "Assets de tienda (capturas, vídeo, textos ASO) · política de privacidad · términos.",
    "Analítica + reporte de crashes · flujo de compra (StoreKit / Play Billing).",
    "Beta cerrada en <b>TestFlight</b> antes de monetizar — validar retención real.",
])]

story += [Paragraph("Orden de construcción recomendado", H3)]
story += [Paragraph(
    "<b>Onboarding → Sugeridor por emoción → Bloqueo de acorde → Coach de modulaciones → "
    "Web MIDI/Ableton → Empaquetado a tienda + beta.</b> Onboarding desbloquea la retención; el "
    "sugeridor por emoción es el gancho de marketing; el resto añade profundidad \"premium\".", BODY)]

# ── DEUDA / CIERRE ────────────────────────────────────────
story += [Paragraph("Deuda técnica y notas", H2)]
story += [bullets([
    "Sin deuda crítica. Código limpio y modular; el modelo key/tonality/mode está documentado como contrato.",
    "Test pendiente menor: \"Mixolydian favours bVII from I\" falla en la suite de sugerencias (no afecta a la app; revisar el peso esperado del test).",
    "Hápticos imposibles en iOS web (sin navigator.vibrate en Safari) — solo Android. Audio iOS confirmado OK.",
])]

story += [Spacer(1, 4*mm), rule(ORANGE, 1.2, 0, 8)]
story += [Paragraph(
    "<b>Conclusión:</b> Easy Fifth Circle ya es un producto sólido a nivel técnico. El siguiente "
    "capítulo no es construir más motor, sino <b>consolidar</b>: onboarding que enganche, un par de "
    "funciones premium con gancho real (emoción + modulación), y empaquetar a tienda con un modelo de "
    "pago único. Ese es el camino de prototipo a app vendible.", BODY)]
story += [Spacer(1,3*mm)]
story += [Paragraph("Easy Fifth Circle · Auditoría V5.11 · Junio 2026 · Documento interno", SMALL)]

def footer(c, doc):
    c.saveState()
    c.setFont("Inter", 7.5); c.setFillColor(DIM)
    c.drawString(20*mm, 12*mm, "Easy Fifth Circle — Auditoría V5.11")
    c.drawRightString(190*mm, 12*mm, "pág. %d" % doc.page)
    c.setStrokeColor(LINE); c.setLineWidth(0.5); c.line(20*mm, 15*mm, 190*mm, 15*mm)
    c.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=A4,
                        leftMargin=20*mm, rightMargin=20*mm, topMargin=16*mm, bottomMargin=20*mm,
                        title="Easy Fifth Circle — Auditoría V5.11", author="Easy Fifth Circle")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("OK ->", OUT)
