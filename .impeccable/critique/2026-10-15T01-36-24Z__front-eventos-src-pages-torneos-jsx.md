---
target: Torneos
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Torneos.jsx"
target_fingerprint: "sha256:31d4fe9833cfea7125a3e24320b5424e34b3e5a99a674ab66ffe9871fb2b07b9"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Torneos.jsx
timestamp: 2026-10-15T01-36-24Z
slug: front-eventos-src-pages-torneos-jsx
---
# Crítica: Torneos (tercera pasada)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas.

## Puntaje: 30/40 (75%, Bueno). Antes: 13 → 25
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | Durante el error el resumen dice "Buscando…". |
| 2 | Lenguaje del mundo real | 4 | Vocabulario del rubro con voseo consistente. |
| 3 | Control y libertad | 3 | La categoría inválida queda en la URL; mucho historial. |
| 4 | Consistencia | 3 | El interruptor activo se ve como un botón de acción. |
| 5 | Prevención de errores | 3 | Sin resumen de precio y fecha al inscribirse. |
| 6 | Reconocer antes que recordar | 3 | "Más filtros" cerrado esconde cuáles están activos. |
| 7 | Flexibilidad | 3 | Sin "este finde" ni búsqueda por zona. |
| 8 | Estética y minimalismo | 3 | Renglones de 200–280px en mobile; "Más filtros" pesado. |
| 9 | Recuperación de errores | 3 | Sugerencias del vacío del mismo peso; copy forzado. |
| 10 | Ayuda | 2 | No explica categorías, pago ni cantidad de partidos. |

## Especificidad
Propia del producto. Le falta: filtros genéricos, urgencia en rojo de error, detalle sin jerarquía.

Detector: 0 en el CLI y en 8 corridas. Filtros de 44px en mobile, sin desborde. Contraste de urgencia AA (4.83 y 5.93).

## Problemas prioritarios
1. [P1] El detalle se desliza de costado en mobile cuando hay tabla (grid 1fr → minmax(0,1fr)). adapt.
2. [P1] Foco de los renglones cortado por .tablero overflow:hidden; nombre accesible pegado. harden.
3. [P2] "Más filtros" en mobile torpe; esconde el estado. layout.
4. [P2] Urgencia en rojo de error; sin diferenciar cercanía; cuenta regresiva en los llenos. colorize.
5. [P2] Resumen durante el error; categoría inválida en la URL; el select salta al cargar. harden.
6. [P3] El botón principal del anónimo lleva al login; inscripción baja en mobile; sin resumen. clarify.

## Señales de alerta por persona
- Jordan: categorías, formatos y pago sin explicar; botón al login.
- Sam: foco cortado; nombre pegado.
- Casey: filtros arriba; tabla con scroll lateral.
- Pádel 4ta este mes: funciona, pero "Este mes" está escondido.

## Observaciones menores
- Subtítulo "Cupo completo" redundante.
- La cantidad del grupo incluye los llenos.
- Campeón en los terminados.
- Calle oculta en mobile; sin link a mapas.
- Inicio no ordena los torneos.
- TarjetaTorneo con vocabulario viejo.
- El h1 deja afuera a las parejas.

## Preguntas para pensar
- ¿"Este mes" antes que el deporte?
- ¿Reservar lugar sin cuenta?
- ¿Avisame / Campeón en lugar de renglones llenos?
