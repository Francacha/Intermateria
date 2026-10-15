---
target: Complejos
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Complejos.jsx"
target_fingerprint: "sha256:98a0bc5580f225292c83efb05ae9c1d4e4ce02123f684f53d0db0fb7e024f7f3"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Complejos.jsx
timestamp: 2026-10-15T00-23-14Z
slug: front-eventos-src-pages-complejos-jsx
---
# Crítica: Complejos (front-eventos/src/pages/Complejos.jsx)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas.

## Puntaje: 20/40 (50%, Aceptable)
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | No hay indicador al refiltrar (cargando nunca vuelve a true). |
| 2 | Lenguaje del mundo real | 2 | "Sintetico" sin tilde; precio sin "la hora". |
| 3 | Control y libertad | 2 | El vacío no tiene salida; el filtro y la búsqueda no quedan en la URL. |
| 4 | Consistencia | 2 | El botón y las canchas van a lugares distintos; no se parece a la home nueva. |
| 5 | Prevención de errores | 3 | Buena espera al tipear. |
| 6 | Reconocer antes que recordar | 2 | Para ver disponibilidad hay que abrir cada complejo. |
| 7 | Flexibilidad | 1 | Sin orden, sin filtros de techada, F5/F7 ni día/hora. |
| 8 | Estética y minimalismo | 3 | Los servicios empujan las canchas debajo del pliegue en mobile. |
| 9 | Recuperación de errores | 1 | Error sin reintento; vacío sin acciones. |
| 10 | Ayuda | 2 | No avisa el alcance de la búsqueda. |

## Especificidad
Es una lista de tarjetas genérica que no comparte el lenguaje de la home (miniaturas, renglones, chips de horario, esqueletos). No muestra disponibilidad: la home dice "Turnos libres hoy" y el link lleva a una página sin horarios.

Detector: el escaneo CLI dio 0. En el navegador:
- kicker-above-heading en .etiqueta (Complejos.jsx:39): real.
- low-contrast en el placeholder del buscador en oscuro, 3.6:1: real.

Además, la revisión de diseño encontró que `.buscador { outline: none }` anula el foco global.

## Problemas prioritarios
1. [P1] Sin disponibilidad. Agregar selector de día y renglones con horarios libres que deep-linkean. shape → layout.
2. [P1] El lenguaje visual no coincide con la home. Usar tablero/renglon/mini-dibujo, servicios en una línea suave, sin kicker. layout + polish.
3. [P1] Estados frágiles: no hay carga al refiltrar, no se descartan respuestas viejas, error sin reintento, vacío sin salida. harden.
4. [P2] Accesibilidad: buscador sin etiqueta y con el foco anulado, placeholder en oscuro, filtro sin aria-pressed, nombres accesibles pegados. audit → harden.
5. [P2] Comparación y copy: "la hora", "Sintético", "Al aire libre", servicios que parecen clickeables. clarify.

## Señales de alerta por persona
- Alex: sin orden ni estado en la URL.
- Sam: buscador sin etiqueta y foco invisible; filtro sin estado anunciado.
- Casey: la primera cancha en y≈760; el modal se corta como anónimo.
- Jugador que busca pádel esta noche: no puede saber si hay algo libre.

## Observaciones menores
- Conteo en singular y "0 · 0" junto al vacío.
- Espacio de más en el texto vacío.
- flex-wrap en .mini-cancha.
- "1 torneo" no es un link.
- Buscador despegado del filtro en escritorio.

## Preguntas para pensar
- ¿Listado de complejos o búsqueda de turnos libres agrupada por complejo?
- ¿Por qué las canchas saltean la ficha del complejo?
- ¿Los servicios valen más pantalla que el próximo horario libre?
