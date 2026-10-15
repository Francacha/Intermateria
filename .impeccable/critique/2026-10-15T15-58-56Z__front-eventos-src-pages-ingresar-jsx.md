---
target: Ingresar
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Ingresar.jsx"
target_fingerprint: "sha256:3a8b0514c8dce949da7ce7a81045a5aa123acc8f2397f2c6716e240e6294ec0c"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Ingresar.jsx
timestamp: 2026-10-15T15-58-56Z
slug: front-eventos-src-pages-ingresar-jsx
---
# Crítica: Ingresar (tercera pasada)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas. La API estaba caída: los endpoints se simularon a partir de los controladores.

## Puntaje: 27/40 (67%, Aceptable). Antes: 19 → 28
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | Los campos de solo lectura se ven editables mientras envía. |
| 2 | Lenguaje del mundo real | 3 | "El administrador del sitio" no le dice nada al jugador. |
| 3 | Control y libertad | 2 | "Volver" entra en bucle con destinos protegidos; el aviso de rol no ofrece acción. |
| 4 | Consistencia | 3 | Burbuja nativa frente a .alerta. |
| 5 | Prevención de errores | 3 | Sin aviso de mayúsculas. |
| 6 | Reconocer antes que recordar | 3 | El chip del turno funciona. |
| 7 | Flexibilidad | 3 | Bien. |
| 8 | Estética y minimalismo | 3 | Con la sesión vencida, cinco bloques antes del campo. |
| 9 | Recuperación de errores | 2 | Sin canal de contacto; el foco va al email tras un 401. |
| 10 | Ayuda | 2 | El desplegable no dice cómo actuar. |

## Especificidad
Lo visual es genérico; el comportamiento es claramente propio (chip del turno, título por destino).

Detector: 0 en el login y en jugadores. 3 hallazgos en /panel, fuera de alcance (borde de color sobre tarjeta redondeada ×2, kicker). Contraste AA en todo; campos de 16px; volver seguro.

## Problemas prioritarios
1. [P1] Recuperación sin salida; Jugadores.jsx:38 pide que el jugador cambie la contraseña pero no existe la función. harden + clarify.
2. [P1] Nombre accesible "Contraseña Mostrar contraseña": el label envuelve el botón (Ingresar.jsx:185). audit.
3. [P2] "Volver sin ingresar" en bucle con /panel y /mis-reservas; orden del aviso de sesión vencida. clarify.
4. [P2] Aviso de rol sin acción, que puede no anunciarse; sin aviso desde RutaPublica. harden.
5. [P3] Foco tras el 401 al email; validación nativa sin aria-invalid; anillo verde sobre borde rojo; foco en Jugadores. polish.

## Señales de alerta por persona
- Jordan: olvido sin salida.
- Sam: nombre del campo de contraseña; aviso no anunciado.
- Casey: el teclado tapa el chip.
- Encargado: 403 sin canal.
- Jugador: el mejor camino; formato de la fecha.
- Administrador: el jugador no puede cambiar la contraseña; foco; fecha sin año.

## Observaciones menores
- Marca decorativa débil.
- Campos de solo lectura sin cambio visual.
- Comentario viejo.
- Fecha de alta con día de la semana.

## Preguntas para pensar
- ¿Que la recuperación pase por el complejo?
- ¿Login en dos pasos?
- ¿Sacar "Volver sin ingresar"?
