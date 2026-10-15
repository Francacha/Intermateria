---
target: Ingresar
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Ingresar.jsx"
target_fingerprint: "sha256:f5ce28219ed19ac8ac48c8d310ef0ddbaaa0c66921e47b792a56471c06733cd4"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Ingresar.jsx
timestamp: 2026-10-15T15-04-38Z
slug: front-eventos-src-pages-ingresar-jsx
---
# Crítica: Ingresar (segunda pasada)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas. La API estaba caída: el login se probó con respuestas simuladas.

## Puntaje: 28/40 (70%, Bueno). Antes: 19/40
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | La redirección cuando el rol no coincide es silenciosa. |
| 2 | Lenguaje del mundo real | 3 | No dice qué turno se está reservando. |
| 3 | Control y libertad | 3 | Una empresa que entra desde una reserva va al panel sin explicación. |
| 4 | Consistencia | 3 | El registro de jugador no tiene autocomplete ni role=alert. |
| 5 | Prevención de errores | 3 | Zoom en iOS; un volver malformado tira la app. |
| 6 | Reconocer antes que recordar | 3 | Hay que recordar el turno. |
| 7 | Flexibilidad | 3 | Gestores de contraseñas y Enter, bien. |
| 8 | Estética y minimalismo | 3 | Genérica; links duplicados con la navbar. |
| 9 | Recuperación de errores | 2 | El 403 no tiene canal; el foco se pierde tras el error. |
| 10 | Ayuda | 2 | El olvido es un callejón sin salida. |

## Especificidad
Lo propio está en el copy; lo visual es genérico. No muestra el turno.

Detector: 0 en el CLI y en 7 corridas. Contraste AA en todo; foco de 3px. "Mostrar" mide 36px y "← Volver", 24px.

## Problemas prioritarios
1. [P1] volver sin validar donde se muestra: link a //evil.com (redirección abierta); /\evil.com pasa el regex y tira la app. Helper rutaInterna + error boundary. harden.
2. [P1] El login de una reserva no muestra el turno. clarify.
3. [P1] Recuperación sin salida: olvido y 403 sin canal; "creá otra cuenta". harden + clarify.
4. [P2] Zoom de iOS por campos de 14.4px (todo el sitio). adapt.
5. [P2] El foco se pierde tras un error con clic; el aviso de sesión vencida reaparece; "Mostrar" se anuncia dos veces; resumen sin marcador; áreas táctiles. polish.

## Señales de alerta por persona
- Jordan: el olvido dice que no hay recuperación; "¿Jugás?" en el contexto del panel.
- Sam: foco perdido; anuncio doble; resumen sin marcador.
- Casey: zoom de iOS; "Mostrar" de 36px.
- Encargado: 403 y olvido sin contacto.
- Jugador: no ve el turno; redirección silenciosa si usa una cuenta de complejo.

## Observaciones menores
- Burbujas de validación en el idioma del navegador.
- vencida no se avisa en páginas públicas.
- Registro y Registralo pierden volver.
- Foco automático doble.

## Preguntas para pensar
- ¿Paso 2 de 2 de la reserva?
- ¿Recuperación honesta y barata?
- ¿Decir con qué cuenta se entró?
