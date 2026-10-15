---
target: Empresas
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Empresas.jsx"
target_fingerprint: "sha256:d3e1192b95cfc8453e3676fee2c499dbd26ed5205f946ca6ab3d0aa02d5b3a25"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Empresas.jsx
timestamp: 2026-10-15T21-54-30Z
slug: front-eventos-src-pages-empresas-jsx
---
# Crítica: Complejos (/admin) + EmpresasForm — segunda pasada

Method: dual-agent (A: diseño · B: detector + navegador)

| # | Heurística | Nota | Problema |
|---|---|---|---|
| 1 | Estado del sistema | 3 | Reactivar sin estado ocupado ni freno al doble clic |
| 2 | Lenguaje del usuario | 3 | "Se borran 0 canchas, 0 turnos y 0 torneos"; texto crudo del servidor en el error |
| 3 | Control y libertad | 3 | Escape no cierra el form de contraseña; editar sin aviso de cambios sin guardar |
| 4 | Consistencia | 2 | Contraseña visible en un lado y oculta en otro; "Nueva contraseña" ofrecida donde no sirve; dos CTA en el vacío |
| 5 | Prevención de errores | 2 | Escribir el nombre exige caracteres no tipeables; con canchas y sin turnos se borra sin escribir |
| 6 | Reconocer antes que recordar | 3 | "2 activos sin canchas" no se puede filtrar |
| 7 | Flexibilidad | 2 | Sin orden ni filtro por pendientes |
| 8 | Estética y minimalismo | 2 | 21 pastillas iguales; CUIT cortado en celular; textos de 11–12px |
| 9 | Recuperación de errores | 3 | Error del form de contraseña en gris |
| 10 | Ayuda | 2 | Sin guía para pasar la contraseña con seguridad |
| | Total | 25/40 | Aceptable |

Detector: CLI 0, navegador 0 en 7 vistas. Mediciones: error de FormPassword gris (.campo small pisa .alerta-texto), cuenta del segmento inactivo 2.98:1 (claro) y 4.32:1 (oscuro), enlaces de título de 25px.

P1 Confirmación escribiendo el nombre no tipeable (—, «», espacios dobles); con canchas y sin turnos no pide confirmación.
P1 Error de contraseña en gris (afecta también Jugadores).
P2 Renglones con tres pastillas del mismo peso; "Nueva contraseña" visible sin email o de baja.
P2 Estados de error y vacío pierden contexto y muestran el texto del servidor.
P3 Edición sin aviso de cambios sin guardar; "0 canchas, 0 turnos y 0 torneos"; duplicado sin link.
