---
target: Registro
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
target_identity: "file:/home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Registro.jsx"
target_fingerprint: "sha256:ad5b1a3cc6abe621efc969bd37f08ef6c217170d5aeebda994ae4ece4333dcd4"
target_path: /home/franco/Escritorio/Universidad/Analista en sistemas/Segundo/Programacion II/Crud-Empresas/front-eventos/src/pages/Registro.jsx
timestamp: 2026-10-15T20-40-21Z
slug: front-eventos-src-pages-registro-jsx
---
# Crítica: Registro de complejos (front-eventos/src/pages/Registro.jsx)

Method: dual-agent. Surface mode: Operate. Se puntuaron las 10 heurísticas. API caída: endpoints simulados a partir del controlador.

## Puntaje: 21/40 (52%, Aceptable)
| # | Heurística | Puntaje | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | Errores del servidor arriba y fuera de pantalla en mobile. |
| 2 | Lenguaje del mundo real | 3 | "Fútbol 5, 7 u 11" pero todo se crea de 5. |
| 3 | Control y libertad | 2 | El conteo se reinicia al destildar; no se puede mostrar la contraseña; se pierde volver. |
| 4 | Consistencia | 1 | Burbujas nativas + alertas; sin role=alert ni aria-invalid. |
| 5 | Prevención de errores | 2 | CUIT libre; teléfono no es tel; $0 silencioso; step=500. |
| 6 | Reconocer antes que recordar | 3 | El formato del CUIT solo está en el placeholder. |
| 7 | Flexibilidad | 2 | Sin autocomplete; contador sin entrada directa. |
| 8 | Estética y minimalismo | 3 | Email y contraseña desalineados; tarjeta estirada. |
| 9 | Recuperación de errores | 1 | Foco al body; error lejos; mensajes crudos. |
| 10 | Ayuda | 2 | No explica los valores por defecto ni el CUIT. |

## Especificidad
El paso de deporte con colores y el total en vivo son propios. El resto es un formulario genérico, atrás del login rediseñado.

Detector: CLI 0. Navegador: nested-cards en .deporte (probable falso positivo: patrón de opción seleccionable). Contraste AA; campos de 16px.
Mediciones: sin id/autocomplete/aria; label envuelve el contador (el "−" se llama "Cantidad de canchas 1 +"; tocar el label resta); deportes sin aria-pressed; sin noValidate.

## Problemas prioritarios
1. [P0] Errores del servidor invisibles y foco perdido (Registro.jsx:73, 149). harden.
2. [P1] Contador y deportes rotos para el lector de pantalla y el mouse (Registro.jsx:91-98). harden + audit.
3. [P1] Validación inconsistente; CUIT, teléfono, step y autocomplete. clarify + harden.
4. [P1] Valores por defecto silenciosos ($0, F5, 09–23) y panel vacío al llegar. onboard.
5. [P2] Alineación, tarjeta estirada, links de 20px sin volver, título. polish.

## Señales de alerta por persona
- Jordan: formato del CUIT; no sabe que puede cambiar; $0.
- Sam: deportes y contador sin estado; errores no anunciados.
- Casey: error invisible; objetivos chicos; sin teclados adecuados.
- Encargado: email duplicado invisible; agenda vacía.
- Muchas canchas: muchos toques; un precio por deporte; todo F5.

## Observaciones menores
- Campos editables mientras se envía.
- Mensaje vago de CUIT duplicado.
- "*" sin aclaración.
- No avisa que el login es único.

## Preguntas para pensar
- ¿CUIT el primer día?
- ¿Cargar cancha por cancha?
- ¿Qué entrega "tu panel listo"?
