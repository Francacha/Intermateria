---
target: Torneos
total_score: 13
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Torneos.jsx"
target_fingerprint: "sha256:8bd040f519393063ec78db0dd0ea534b3bebb2b434cee0f9053c5971f7c5b529"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Torneos.jsx
timestamp: 2026-10-15T01-02-09Z
slug: front-eventos-src-pages-torneos-jsx
---
# Crítica: Torneos (front-eventos/src/pages/Torneos.jsx)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas.

## Puntaje: 13/40 (32%, Pobre)
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 1 | "Cargando..." en texto; sin indicador al filtrar; respuestas viejas pueden pisar a las nuevas. |
| 2 | Lenguaje del mundo real | 2 | "4/8 equipos" como fracción; formato sin explicar; precio sin "por equipo". |
| 3 | Control y libertad | 1 | El filtro no está en la URL; Atrás saca del sitio. |
| 4 | Consistencia | 1 | Sistema distinto de la home y el catálogo; h2 sin estilo. |
| 5 | Prevención de errores | 2 | Torneos llenos en "abiertos", marcados solo con rojo. |
| 6 | Reconocer antes que recordar | 2 | Premio y dirección ocultos. |
| 7 | Flexibilidad | 1 | Solo filtro de deporte; sin orden. |
| 8 | Estética y minimalismo | 2 | Insignias desparejas; "Inscripción abierta" redundante. |
| 9 | Recuperación de errores | 0 | Error y vacío a la vez; sin reintento. |
| 10 | Ayuda | 1 | No explica formatos, precio ni qué pasa después de inscribirse. |

## Especificidad
Genérica y atrasada respecto de la home, que ya muestra torneos con renglones, bloque de fecha, cupo y estados. No usa filtros en la URL ni aria-pressed.

Detector: el escaneo CLI dio 0. En el navegador:
- low-contrast 4.4:1 en .insignia-futbol y .insignia-padel (12px, claro): real.
- kicker-above-heading en Torneos.jsx:34 y TorneoDetalle.jsx:40: real.

## Problemas prioritarios
1. [P1] Error contradictorio sin reintento (Torneos.jsx:48-52). harden.
2. [P1] No usa el lenguaje de la home; faltan premio, lugares y formato. Reconstruir con FilaTorneo. layout.
3. [P1] Filtro fuera de la URL; Atrás sale del sitio; sin aria-pressed ni aria-live. harden.
4. [P2] Llenos, cancelados y vacío filtrado mal resueltos. clarify.
5. [P2] Pocos filtros (categoría, mes, con lugares); el login del detalle no vuelve; "equipo" en pádel. onboard + adapt.

## Señales de alerta por persona
- Jordan: Torneo vs Campeonato; el login pierde el torneo; precio ambiguo.
- Sam: filtro sin estado; lleno solo en rojo; sin anuncios; encabezado como span en el detalle.
- Casey: filtros de 38px; tarjetas altas; inscripción debajo del pliegue en el detalle.
- Pareja de pádel: sin categoría, mes ni orden.

## Observaciones menores
- h2 pegado a las tarjetas.
- Formato de fecha distinto al de la home.
- En el detalle: una sola fecha, campo de teléfono desalineado, "Llave" vacía grande.
- yaInscripto compara solo por id_cliente.

## Preguntas para pensar
- ¿/torneos como versión completa de la sección de la home?
- ¿Mes y categoría como filtros principales?
- ¿Resultados en otra vista?
