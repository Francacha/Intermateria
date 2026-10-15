---
target: Complejos
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Complejos.jsx"
target_fingerprint: "sha256:11372f918420c1bc25e68aebe0e6aabbc3a85edea484eab01d29d59abfa7de03"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Complejos.jsx
timestamp: 2026-10-15T00-38-50Z
slug: front-eventos-src-pages-complejos-jsx
---
# Crítica: Complejos (segunda pasada)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas.

## Puntaje: 26/40 (65%, Aceptable). Antes: 20/40
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | "0 horarios libres" como cifra; la atenuación no tiene etiqueta. |
| 2 | Lenguaje del mundo real | 3 | Los chips muestran la mañana; "+24" no se explica. |
| 3 | Control y libertad | 1 | replace:true rompe Atrás; el modal no se cierra con Escape; ingresar pierde el horario. |
| 4 | Consistencia | 3 | Formato de días del modal distinto; sin aria-pressed en el modal. |
| 5 | Prevención de errores | 3 | "ver otros días" abre el mismo día. |
| 6 | Reconocer antes que recordar | 3 | La tira de días se corta en mobile sin indicarlo. |
| 7 | Flexibilidad | 2 | Sin franja horaria ni orden; 3 links redundantes por complejo. |
| 8 | Estética y minimalismo | 3 | El aviso de cerrado se repite por cancha. |
| 9 | Recuperación de errores | 3 | Sin sugerencia de "mañana hay N". |
| 10 | Ayuda | 2 | No se ve la duración de los turnos. |

## Especificidad
Ya es propia del producto y coherente con la home. Sigue siendo una pila de tarjetas iguales sin jerarquía hacia la noche ni el precio.

Detector: 0 hallazgos en el CLI y en 6 corridas de navegador. El foco del buscador tiene 3px. 18 pedidos a la API en la carga inicial (9 en producción): uno por cancha.

## Problemas prioritarios
1. [P1] replace:true en todos los filtros rompe Atrás (Complejos.jsx:48-57). harden.
2. [P1] Los chips muestran los primeros horarios del día, no la noche; "+24"; falta la duración. shape + clarify.
3. [P1] El paso a la reserva pierde contexto: el login no vuelve; el confirmar queda debajo del pliegue en mobile; el modal sin role=dialog ni Escape. harden.
4. [P2] Días cerrados y sin horarios: aviso por cancha; "ver otros días" abre el mismo día; no sugiere mañana. clarify.
5. [P2] Escala: un pedido por cancha; hace falta un endpoint en lote. optimize.

## Señales de alerta por persona
- Alex: sin orden ni "solo con horarios"; 20 Tabs hasta el primer chip.
- Sam: insignia de torneo chica; "Sin horarios" de 22px; el modal no es un diálogo.
- Casey: la tira de días se corta; página larga; confirmar bajo el pliegue.
- Pádel esta noche: no se puede resolver desde la página.

## Observaciones menores
- flex en .horario-libre sin efecto en mobile.
- El orden de los complejos salta entre días.
- "el dom 18".
- El resumen se parte en mobile.
- Cabecera vacía si no hay dirección.

## Preguntas para pensar
- ¿Vista de "próximos horarios libres en horario pico"?
- ¿Reservar en un toque?
- ¿Orden con 40 complejos?
