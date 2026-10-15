---
target: Ingresar
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Ingresar.jsx"
target_fingerprint: "sha256:d6dc7876f56fa9f229692d85aaf5f3f1b666e15471b4731e0459cf77ccffcda8"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Ingresar.jsx
timestamp: 2026-10-15T14-28-11Z
slug: front-eventos-src-pages-ingresar-jsx
---
# Crítica: Ingresar (front-eventos/src/pages/Ingresar.jsx)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas.
La API local estaba caída: el login se probó con respuestas simuladas tomadas del controlador.

## Puntaje: 19/40 (47%, Pobre)
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | No da contexto de la reserva pendiente; el error no se anuncia. |
| 2 | Lenguaje del mundo real | 3 | h1 en infinitivo; "administradores" de cara al público. |
| 3 | Control y libertad | 2 | No se puede mostrar la contraseña; volver se pierde. |
| 4 | Consistencia | 2 | Tarjeta genérica; sin name ni autocomplete. |
| 5 | Prevención de errores | 2 | Sin mostrar contraseña ni aviso de mayúsculas. |
| 6 | Reconocer antes que recordar | 2 | Hay que recordar la reserva; autocompletado débil. |
| 7 | Flexibilidad | 2 | Sin pistas de autocompletado. |
| 8 | Estética y minimalismo | 2 | La tarjeta se estira (align-items: stretch). |
| 9 | Recuperación de errores | 1 | Sin "olvidé mi contraseña"; 403 y red sin salida. |
| 10 | Ayuda | 1 | Ninguna. |

## Especificidad
Tarjeta de login genérica; el copy expone roles internos.

Detector: el escaneo CLI dio 0. En el navegador: low-contrast 4.1:1 en .alerta (claro), real y presente en todo el sitio.
Mediciones: .campo input outline:none anula el foco; bordes de 1.28:1; sin name/autocomplete; sin role=alert; link de registro de 20px.

## Problemas prioritarios
1. [P1] Volver se pierde: el link "Ingresá" del registro, "Crear cuenta" de la navbar, RutaProtegida y "registrá tu complejo"; sin contexto de la reserva; sesión vencida sin aviso. clarify + harden.
2. [P1] Errores sin role=alert ni aria-invalid; contraste 4.1; sin olvido de contraseña; 403 y red sin salida. harden.
3. [P2] Sin name/autocomplete/autocapitalize; no se puede mostrar la contraseña. harden.
4. [P2] Tarjeta estirada; bordes de 1.28:1; foco de los campos anulado (todo el sitio). polish + layout.
5. [P3] Identidad genérica; h1 y subtítulo; pie confuso; title por página. clarify + bolder.

## Señales de alerta por persona
- Jordan: duda por los roles; links partidos.
- Sam: error no anunciado; bordes y foco.
- Casey: sin autocompletado; no puede mostrar la contraseña; link de 20px.
- Encargado: credenciales no recordadas; baja sin contacto; PC compartida.
- Jugador que viene de una reserva: sin confirmación; la vuelta se pierde desde el registro.

## Observaciones menores
- El error persiste mientras se edita.
- Campos editables durante el envío.
- "Ingresando..." a 2.46:1.
- Chip del droplet en el login.
- Link "Ingresar" en la navbar.

## Preguntas para pensar
- ¿Mostrar primero la reserva?
- ¿Nombrar los roles?
- ¿Link mágico o WhatsApp en lugar de contraseña?
