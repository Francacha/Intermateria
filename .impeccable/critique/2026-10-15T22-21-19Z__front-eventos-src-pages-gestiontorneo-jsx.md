---
target: GestionTorneo
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/GestionTorneo.jsx"
target_fingerprint: "sha256:62ed6d0ffeef7f09363e5f0c849166d5ac1084c94583facda3933e21ef8229a3"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/GestionTorneo.jsx
timestamp: 2026-10-15T22-21-19Z
slug: front-eventos-src-pages-gestiontorneo-jsx
---
# Crítica: GestionTorneo (/panel/torneos/:id)

Method: dual-agent (A: diseño · B: detector + navegador)

| # | Heurística | Nota | Problema |
|---|---|---|---|
| 1 | Estado del sistema | 2 | Sin "Listo" al guardar; sin progreso por ronda; foco a body tras Quitar |
| 2 | Lenguaje del usuario | 3 | "con 5 equipos" en pádel; "A Programar" por capitalize |
| 3 | Control y libertad | 1 | Un resultado a medias cierra la ronda sin vuelta; confirm() nativo; modal sin Escape |
| 4 | Consistencia | 2 | confirm() en vez de Confirmar; carga/error a mano; disabled; modal sin role=dialog |
| 5 | Prevención de errores | 1 | Medio resultado = 0; eliminar con un ✕ sin escribir el nombre |
| 6 | Reconocer antes que recordar | 2 | Campos de pareja solo con placeholder; marcadores sin nombre de equipo |
| 7 | Flexibilidad | 2 | Un Guardar por partido |
| 8 | Estética y minimalismo | 2 | Muro de 8 datos en cada estado; Guardar deshabilitado igual al habilitado |
| 9 | Recuperación de errores | 1 | Un solo bloque de error lejos de la fila, sin role=alert; sin Reintentar |
| 10 | Ayuda | 3 | Buen párrafo de ayuda y vacío explicado |
| | Total | 18/40 | Pobre |

Detector: CLI 0; navegador: kicker-above-heading (falso positivo: es el formato), gray-on-color + low-contrast 4.4:1 en el cartel del campeón (oscuro). Mediciones: 4 confirm(), campos de pareja sin label, ✕ anunciados como "multiplicación", objetivos táctiles <44px, tabla de inscriptos se desliza en 390.

P0 Medio resultado: el backend hace Number(null)=0, marca jugado y cierra la ronda (torneos.controller.js:261-263).
P1 Acciones irreversibles con confirm() y ✕ sin nombre.
P1 La organización no responde "qué hago ahora" en cada estado.
P2 Errores lejos de la fila, sin Listo, carga/error sin useCarga, campos sin etiqueta.
P2 Celular y accesibilidad (tabla, modal, marcadores, Guardar deshabilitado en oscuro).
