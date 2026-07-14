---
name: audit
description: Generate the Quinta product audit PDF (Spanish) — fresh metrics, state, pros/cons, professionalization checklist, roadmap and store-payment call. Use when the user asks for an audit/analysis/roadmap update.
---

# Quinta product audit (ES, PDF)

Produce `Quinta_VX.XX_Audit_ES.pdf` at the repo root (X.XX = current APP_VERSION),
committed. Compare against the PREVIOUS audit PDF in the root (git log for context).

## 1 · Gather real metrics (never estimate)

```bash
grep "APP_VERSION =" src/core/constants.js
git rev-list --count HEAD                          # commits
find src -name "*.js" | wc -l                      # modules
cat src/**/*.js | wc -l ; cat src/**/*.css | wc -l # LOC
grep -c "assert(" src/dev/tests.js                 # tests
ls -lh dist/Quinta.html                            # bundle size
du -sh samples/                                    # sample weight
grep -rho "tel('[a-z_]*'" src/ | sort -u | wc -l   # telemetry events
grep -c "p: '" src/ui/icons.js                     # icon kit size
```

Also diff reality vs the previous audit's "pendiente" list — what got done, what didn't.

## 2 · Structure (8-9 A4 pages, Spanish) — ALL sections required

The user's definition of "audit" (fixed): code analysis + pros/cons + potential +
path-to-product + DESIGN REVIEW with concrete improvements — in one PDF.

1. **Portada** — qué cambió desde el audit anterior (releases con una línea cada una),
   veredicto /10 con evolución, métricas duras en tarjetas.
2. **Análisis del código** — mapa de arquitectura, patrones, cobertura de tests,
   ventajas/desventajas técnicas, deuda. Leer el código de verdad.
3. **Estado técnico** — calidad por dimensión (barras: código, identidad, sonido,
   primer minuto, feel, datos, legal, validación, negocio) con las deltas.
4. **Diseño** — revisión de cohesión visual/UX: qué está fuerte, qué desalineado,
   y cómo mejorarlo (concreto y priorizado).
3. **Ventajas / desventajas** + tabla "¿qué tan producto es?" (artefacto/producto/negocio).
4. **Profesionalizar: hecho vs pendiente** — checklist honesto, con la lectura de
   rendimientos decrecientes.
5. **Decisiones abiertas** — tiendas (gatillo = retención D7 medida), y lo que aplique.
6. **Roadmap** por fases con coste y estado (HECHO ✓ / AHORA / condicional).
7. **Conclusión** — cita grande, 3 frases que importan, siguiente paso concreto.

Tone: honest, direct, data-first. Score conservatively; business/validation stay low
until real users exist. Always name the real bottleneck (distribution, not code).

## 3 · Render

Build an HTML file in the scratchpad using the Quinta doc style (dark plum bg
`#0b0810`, coral/amber accents, Georgia display + SF Mono labels, `.page` =
`210mm×297mm` with `page-break-after`), then:

```js
// render.mjs — must run from the repo root (needs local playwright-core)
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
const b = await chromium.launch({ channel:'chrome', headless:true });
const p = await b.newPage();
await p.goto(pathToFileURL(process.argv[2]).href, { waitUntil:'networkidle' });
await p.pdf({ path: process.argv[3], format:'A4', printBackground:true,
              preferCSSPageSize:true, margin:{top:'0',bottom:'0',left:'0',right:'0'} });
await b.close();
```

Check the page count matches the design (an overflow = a broken/oversized section —
look for stray tags). Screenshot page 1 for a visual sanity check.

## 4 · Commit

`docs: product audit VX.XX (ES) — <one-line takeaway>` (+ co-author line). Auto-push deploys.
Summarise the verdict and deltas to the user in Spanish.
