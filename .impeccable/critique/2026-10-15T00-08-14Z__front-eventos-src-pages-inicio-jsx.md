---
target: Inicio
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Inicio.jsx"
target_fingerprint: "sha256:e5f1031edfacd4567172a7b60869f7bce453d651d1081f33866b10e43d5f30ae"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Inicio.jsx
timestamp: 2026-10-15T00-08-14Z
slug: front-eventos-src-pages-inicio-jsx
---
# Crítica: Inicio (segunda pasada)

Method: dual-agent. Surface mode: Persuade. Heuristics 7 and 10 scored n/a.

## Puntaje: 22/32 (69%, Aceptable). Antes: 20/32
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | Hay esqueletos y respaldo a "mañana". Los bloques de cliente y empresa cargan con texto plano. |
| 2 | Lenguaje del mundo real | 3 | "Fútbol 1 · Fútbol" es redundante. A la empresa se le dice "Tocá un horario para reservarlo". |
| 3 | Control y libertad | 2 | El chip promete una hora y el modal abre sin hora elegida y en el día de hoy. |
| 4 | Consistencia | 3 | Solo un estado de error tiene "Reintentar". |
| 5 | Prevención de errores | 3 | Con el tablero en "mañana", el modal abre en hoy. |
| 6 | Reconocer antes que recordar | 2 | Después del chip hay que volver a buscar el horario en la grilla. |
| 7 | Flexibilidad | n/a | Landing. |
| 8 | Estética y minimalismo | 3 | El dibujo le saca lugar a los datos en vivo. |
| 9 | Recuperación de errores | 3 | role="alert", reintento en el tablero. |
| 10 | Ayuda | n/a | Landing. |

## Especificidad
Ya no es plantilla. Son propios del producto: las canchas con el mismo peso, las miniaturas, los casilleros de cupo y la agenda con la doble reserva rechazada. Las pruebas son reales. El hero sigue siendo genérico y no cambia según el rol.

Detector: el escaneo CLI dio 0. En el navegador:
- oversized-h1 de 74px (App.css:366): real.
- low-contrast en .turno-reservada, 4.1–4.4:1 (App.css:1780): real.
- radial-spotlight-glow en el hero oscuro: real, menor.
- repeating-stripes-gradient: falso positivo.

## Problemas prioritarios
1. [P1] Los chips no llevan la hora ni la fecha (Inicio.jsx:249, ReservaModal.jsx:26). Pasar ?fecha&hora y preseleccionar. harden.
2. [P1] La home solo cambia por rol agregando un bloque (Inicio.jsx:71-78, 198). Empresa: el día primero. Admin: redirigir o mostrar el estado de los complejos. shape → distill.
3. [P2] En mobile los datos en vivo quedan debajo del pliegue (hero de ~790px). adapt + layout.
4. [P2] Estados con sesión: "Cargando…" en texto plano, errores sin reintento, insignia "Reservado" bajo AA. harden → polish.
5. [P3] El vacío de la empresa es pobre y no hay cierre para quien tiene sesión. onboard.

## Señales de alerta por persona
- Jordan: la bajada mezcla dos públicos; el chip no deja nada seleccionado; no se explica la seña.
- Riley: "mañana" abre en hoy; "Turnos libres mañana" con todas las filas sin horarios se contradice; el hero salta de alto.
- Casey: menú arriba a la derecha, sin fondo para cerrarlo ni manejo del foco; enlaces de 19-20px de alto; el primer horario a una pantalla de distancia.
- Encargado: lo convence la doble reserva rechazada; sin precio; la banda está al final; no hay "Para complejos" en la navbar.

## Observaciones menores
- "Fútbol 1 · Fútbol" en los próximos turnos.
- "3 de pádel" queda sola en una línea en mobile.
- El enlace con flecha queda caído cuando no hay subtítulo.
- La banda en oscuro se distingue poco del fondo.
- Sin casilleros para cupos mayores a 16.

## Preguntas para pensar
- ¿Y si el hero fuera el tablero?
- ¿La home de la empresa debería ser la agenda de hoy?
- ¿El tablero debería mostrar mañana en horario pico cuando ya es tarde?
