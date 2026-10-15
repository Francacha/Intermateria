---
target: Torneos
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Torneos.jsx"
target_fingerprint: "sha256:9f20514ab501c5d159dd33eede3b7bdae41e08212dd9b1602ba653897d5906d1"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Torneos.jsx
timestamp: 2026-10-15T01-18-42Z
slug: front-eventos-src-pages-torneos-jsx
---
# Crítica: Torneos (segunda pasada)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas.

## Puntaje: 25/40 (62%, Aceptable). Antes: 13/40
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | El detalle carga con texto plano. |
| 2 | Lenguaje del mundo real | 3 | Tres nombres para la eliminación (Eliminación / Torneo / Llave). |
| 3 | Control y libertad | 3 | URL e historial correctos. |
| 4 | Consistencia | 2 | Sin casilleros arriba de cupo 16; "Llave" vs "fixture"; la lista tiene esqueleto y el detalle no. |
| 5 | Prevención de errores | 2 | La categoría no se filtra por deporte, lo que lleva a vacíos seguros. |
| 6 | Reconocer antes que recordar | 3 | Los renglones se explican solos. |
| 7 | Flexibilidad | 2 | Sin zona ni orden; no marca "ya inscripto". |
| 8 | Estética y minimalismo | 3 | El renglón repite tipo y formato; renglones largos en mobile. |
| 9 | Recuperación de errores | 2 | El vacío no sugiere alternativas; el detalle no tiene reintento. |
| 10 | Ayuda | 2 | No explica categoría ni cierre de inscripción. |

## Especificidad
Propia del dominio y coherente con la home y el catálogo. Le falta urgencia: "quedan 2", "empieza en N días", "cierra el…".

Detector: 0 en el CLI y en 6 corridas de navegador. Segmentados de 40px en mobile (38 en escritorio). 4 pedidos en la carga.

## Problemas prioritarios
1. [P1] Filtros en mobile: la categoría y "con lugares" quedan a ~1100px de deslizamiento; botones de 40px. adapt.
2. [P1] La categoría no depende del deporte; el vacío repite la palabra y no sugiere nada (Torneos.jsx:54, 84). harden.
3. [P1] El detalle no dice dónde se juega; el aviso para anónimos son links chicos; sin esqueleto ni reintento. clarify.
4. [P2] Vocabulario inconsistente; renglón redundante; sin casilleros arriba de 16; texto de la llave vacía. polish.
5. [P2] Renglones largos en mobile; sin urgencia (pocos lugares, tiempo relativo). layout + distill.

## Señales de alerta por persona
- Jordan: categorías y formatos sin explicar; links chicos en el detalle.
- Sam: segmentados de 38/40px; nombre accesible largo en el renglón; la carga del detalle no se anuncia.
- Casey: deslizar hasta la categoría; sin resumen fijo.
- Pareja de pádel: categorías mezcladas; "este mes" oculta noviembre sin aviso; no sabe dónde se juega.

## Observaciones menores
- plural redundante en el resumen.
- Fechas desordenadas por los llenos al final.
- Filtros activos durante el error.
- Placeholder usado como ayuda en el formulario.
- 🏆 es el único emoji.

## Preguntas para pensar
- ¿Abrir con "tu deporte + tu categoría" y recordarlo?
- ¿Mostrar el cierre de la inscripción?
- ¿Terminados en la ficha del complejo?
