---
target: Inicio
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Inicio.jsx"
target_fingerprint: "sha256:ae9c985da4a24c47742ef49417c5ca77f25a0b6c6de31156bbf225c8208f4515"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Inicio.jsx
timestamp: 2026-10-14T23-25-16Z
slug: front-eventos-src-pages-inicio-jsx
---
# Crítica: Inicio (front-eventos/src/pages/Inicio.jsx)

Method: dual-agent. Surface mode: Persuade. Heuristics 7 and 10 scored n/a.

## Puntaje de diseño — 20/32 (62%, Aceptable)
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | Solo la pastilla del droplet es una señal en vivo. No muestra disponibilidad real. |
| 2 | Lenguaje del mundo real | 3 | "Mi complejo" en la navbar y "Ir a mi panel" en el hero nombran el mismo lugar. |
| 3 | Control y libertad | 3 | Un usuario logueado ve pasos de alta que no puede usar. |
| 4 | Consistencia | 2 | "Crear cuenta" y "Crear mi cuenta" llevan al mismo lugar; los links están duplicados; el CTA del complejo es fantasma. |
| 5 | Prevención de errores | 3 | Casi no aplica. |
| 6 | Reconocer antes que recordar | 2 | Las tarjetas de pasos parecen clickeables y no lo son. |
| 7 | Flexibilidad | n/a | Landing. |
| 8 | Estética y minimalismo | 3 | Las dos filas idénticas de tarjetas son monótonas. |
| 9 | Recuperación de errores | 2 | "Sin conexión" en rojo cuando la API está caída; al ↻ le falta aria-label. |
| 10 | Ayuda | n/a | Landing. |

## Especificidad
El hero (las canchas en CSS y el h1 con los colores de cada deporte) es propio del producto. Debajo, los dos bloques "1-2-3 cómo funciona" son una plantilla. No se muestran ni turnos ni torneos reales. En el dibujo el fútbol domina sobre el pádel.

Detector: el escaneo CLI dio 0 hallazgos. En el navegador marcó:
- hero-eyebrow-chip / kicker-above-heading en el `.etiqueta` (Inicio.jsx:24): real.
- low-contrast en `.resaltado-futbol` (2.8:1) y en el kicker (4.4:1), solo en mobile: real.
- repeating-stripes-gradient en `.cancha-futbol`: falso positivo (son las franjas de pasto de la cancha).

## Problemas prioritarios
1. [P1] La home ignora quién está logueado (Inicio.jsx:62-67). Mostrar contenido según el rol. harden → onboard.
2. [P1] Debajo del hero hay una plantilla sin evidencia del producto. Usar complejos reales, una mini grilla de turnos libres y torneos abiertos. layout + bolder.
3. [P1] Los complejos quedan en segundo plano (Inicio.jsx:30-31, 66). Darles una banda propia que venda la garantía contra la doble reserva y un CTA sólido. clarify + layout.
4. [P2] En mobile la navbar ocupa tres filas y queda fija (App.css:151-194). adapt.
5. [P2] Accesibilidad: falta focus-visible; contraste de "fútbol" y del kicker; el ↻ mide 28px y no tiene aria-label; CTAs angostos en mobile. audit → polish.

## Señales de alerta por persona
- Jordan: links duplicados con nombres distintos; tarjetas que no se pueden clickear; no ve ningún complejo.
- Riley: con sesión de empresa ve "Registrá tu complejo"; a la etiqueta del admin le cambia el nombre; "sin conexión" en rojo.
- Casey: header fijo de 3 filas; CTA a la izquierda y a ~380px de altura; el dibujo ocupa ~400px; seis tarjetas; el ↻ mide 28px.
- Encargado: el titular le habla al jugador; sin precio ni garantía; CTA fantasma; no tiene un ingreso propio.

## Observaciones menores
- `.hero p` a 34ch corta en tres líneas incómodas.
- Las clases `.cancha-*` están acopladas entre el hero y las tarjetas de canchas.
- `.saque-*::before` usa un hack de 100vh.
- `.paso-numero` tiene un hex fijo.
- El orden de los deportes cambia entre el kicker y el pie.
- "En un solo lugar" es un cierre genérico.

## Preguntas para pensar
- ¿Por qué la garantía contra la doble reserva no es el titular para los complejos?
- ¿La home son en realidad dos?
- ¿"Turnos libres hoy" con datos reales primero y el marketing solo como respaldo?
