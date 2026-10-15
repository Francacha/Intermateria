---
target: Empresas
total_score: 18
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Empresas.jsx"
target_fingerprint: "sha256:e714118f89e6c4daf74663892f2740db42197495c42b539d451b87e46a2c068f"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Empresas.jsx
timestamp: 2026-10-15T21-16-50Z
slug: front-eventos-src-pages-empresas-jsx
---
# Crítica: Empresas (/admin) + EmpresasForm

Method: dual-agent (A: diseño · B: detector + navegador)

| # | Heurística | Nota | Problema |
|---|---|---|---|
| 1 | Estado del sistema | 2 | "Cargando..." en texto; guardar sin estado ocupado; editar muestra campos vacíos mientras carga; sin mensaje "Listo" |
| 2 | Lenguaje del usuario | 2 | "Empresa" en vez de "complejo"; columna ID; "vacío = no cambia" |
| 3 | Control y libertad | 2 | Eliminar permanente tras confirm() nativo; la baja sí es reversible |
| 4 | Consistencia | 1 | No usa ninguno de los patrones de Jugadores/Registro; burbujas del navegador en inglés |
| 5 | Prevención de errores | 1 | CUIT sin validar ni formatear; "contraseña sin email" solo lo frena el servidor; un clic da de baja |
| 6 | Reconocer antes que recordar | 3 | Estado en palabras; ✎/✕ solo con title |
| 7 | Flexibilidad | 2 | Búsqueda sí; sin filtro activas/de baja, sin link a la página pública |
| 8 | Estética y minimalismo | 2 | 6 cifras iguales empujan la lista; columna de acciones rota |
| 9 | Recuperación de errores | 1 | Error + "No hay empresas." a la vez, sin Reintentar; error del form arriba, no en el campo |
| 10 | Ayuda | 2 | Pistas útiles en el form; diferencia baja/eliminar solo dentro del confirm |
| | Total | 18/40 | Pobre |

Especificidad: CRUD genérico del primer commit; comparte tokens pero ninguno de los patrones nuevos.
Detector: CLI 0; navegador 8 (claro) / 2 (oscuro): contraste de "Activa" 2.9:1, filas de baja a opacidad 0.55 (2.3–3.5:1), "De baja" 2.3–2.5:1, kicker "Administración" (falso positivo de estilo).

P0 Columna de acciones rota (td.acciones toma display:flex de .acciones): los separadores cortan y ✎/✕ flotan; en celular estado y acciones quedan fuera de vista.
P1 Formulario sin el patrón de validación (noValidate, errores por campo, CUIT, aria, enviando, 404 editable).
P1 Estados contradictorios (error + vacío, sin Reintentar, carga en texto, sin "Listo").
P2 Acciones destructivas débiles (✕ al lado de ✎, confirm() nativo, pill de estado que es botón, opacidad que apaga las acciones, contraste).
P3 Copy e IA ("Empresa"→"Complejo", 6 cifras, Recargar, "vacío = no cambia").
