---
target: Registro
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Registro.jsx"
target_fingerprint: "sha256:13e012141e99091c3e1c2fff980547757c8ea3b193aa795b111481bb6ed420db"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Registro.jsx
timestamp: 2026-10-15T21-03-08Z
slug: front-eventos-src-pages-registro-jsx
---
# Crítica: Registro de complejos (segunda pasada)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas. API caída: endpoints simulados a partir del controlador.

## Puntaje: 30/40 (75%, Bueno). Antes: 21/40
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | Final silencioso: foco al body, sin título ni anuncio en el panel. |
| 2 | Lenguaje del mundo real | 4 | Vocabulario del rubro, F5/7/11, AFIP/ARCA. |
| 3 | Control y libertad | 3 | Ediciones perdidas mientras envía. |
| 4 | Consistencia | 2 | Error de deportes sin estilo; sin readOnly al enviar. |
| 5 | Prevención de errores | 3 | Precio negativo sin validar en el cliente; el botón cuenta cantidades inválidas. |
| 6 | Reconocer antes que recordar | 3 | El placeholder del CUIT parece cargado. |
| 7 | Flexibilidad | 3 | Sin foco automático. |
| 8 | Estética y minimalismo | 3 | Aviso de precio prematuro; ayuda a 12px. |
| 9 | Recuperación de errores | 3 | Email y CUIT duplicados sin salida. |
| 10 | Ayuda | 3 | Buena microayuda. |

## Especificidad
Las tarjetas de deporte son propias; el resto es estándar. Coherente con el login salvo readOnly y foco automático.

Detector: CLI 0. Navegador: nested-cards en .deporte (probable falso positivo). En el panel, 3 hallazgos fuera de alcance. Contraste AA; campos de 16px; sin desbordes.
Defecto encontrado por el detector: el error de deportes no tiene estilo (fuera de .campo).

## Problemas prioritarios
1. [P1] Foco invisible en las tarjetas de deporte: .deporte overflow:hidden recorta el anillo. harden.
2. [P1] Error de deportes sin estilo; tarjetas sin marcar; precio negativo sin validar. harden.
3. [P2] Ediciones perdidas durante el envío; final silencioso en el panel; "Listo, ocultar" suelta el foco. harden.
4. [P2] Email y CUIT duplicados sin salida. clarify.
5. [P3] Placeholder del CUIT ambiguo; aviso de precio prematuro; el botón cuenta inválidos; tamaño activo poco visible en oscuro. polish.

## Señales de alerta por persona
- Jordan: "Crear cuenta" de la navbar compite con la tarea; CUIT que parece cargado.
- Sam: foco en las tarjetas; error sin estilo; nombre redundante; aviso que queda; éxito no anunciado.
- Casey: formulario largo; textos de 12px; el cambio de pestaña no desplaza.
- Encargado: tamaño activo poco visible en oscuro.
- Muchas canchas: un precio y un tamaño por deporte; tope de 30 invisible; promedio con canchas en $0.

## Observaciones menores
- campoDelError asigna el mensaje de obligatorios al CUIT.
- Mensajes de CUIT distintos entre cliente y servidor.
- .campo-ancho sin uso.
- "Registralo" del login pierde volver.

## Preguntas para pensar
- ¿Filas por tamaño?
- ¿Vista previa del panel?
- ¿Primeros pasos que se tilden solos?
