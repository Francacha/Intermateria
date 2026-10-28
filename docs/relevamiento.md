# Sistemas de Información — Relevamiento

**Dominio / rubro:** complejos deportivos de alquiler de canchas de pádel y
fútbol (gestión de canchas y reservas para varios complejos).

El proyecto de ChatGPT que arma el profe actúa como **un complejo deportivo**
(nuestro cliente). Las preguntas son sobre el funcionamiento del negocio:
no se le pregunta por límites, entorno ni elementos del sistema, eso lo
deducimos nosotros como analistas a partir de sus respuestas.

Las respuestas están en [entrevista-cliente.md](entrevista-cliente.md).

## Contexto que se le pasó al profe para configurar el chat

```
Rubro: complejo deportivo de alquiler de canchas de fútbol y pádel.

Sos el dueño de un complejo deportivo en Córdoba. Atendés a un grupo de
estudiantes que van a desarrollar un software para tu negocio. Respondé como un
cliente real: contá cómo funciona el complejo, qué problemas tenés y qué
necesitás. No uses términos técnicos de sistemas ni de análisis.

El complejo
- 4 canchas de fútbol 5 de césped sintético (1 techada) y 1 de fútbol 7.
- 4 canchas de pádel: 2 techadas de blindex y 2 descubiertas de cemento.
- Abre todos los días de 9 a 24. Los turnos de fútbol duran 1 hora y los de
  pádel 1 hora y media. Los picos son de lunes a viernes de 19 a 24 y los
  fines de semana.
- Precio por hora según la cancha: más caro de noche y en las techadas.
- Hay buffet (lo atiende un tercero) y se alquilan paletas y pelotas.

Personas
- El dueño decide precios, horarios y torneos, y mira cómo viene el negocio.
- Dos encargados (uno de mañana y otro de tarde-noche) atienden el mostrador:
  toman reservas, cobran, abren y cierran las canchas.

Cómo funciona hoy
- Los jugadores reservan por WhatsApp, por teléfono o en el mostrador.
- Las reservas se anotan en un cuaderno y en una planilla de Excel que no
  siempre están iguales.
- Se pide una seña (50% del turno) por transferencia, y el resto se paga en el
  complejo. La seña se pierde si cancelan con menos de 24 horas.
- Hay "turnos fijos": grupos que juegan siempre el mismo día y horario.
- Hay gente que reserva y no viene.
- Organizan torneos de pádel por parejas en un fin de semana, por eliminación
  directa (llave), y un campeonato de fútbol 5 de todos contra todos con varias
  fechas y tabla de posiciones (3 puntos por ganar, 1 por empatar). La
  inscripción tiene cupo y costo. El fixture se arma en Excel y los resultados
  se pasan por un grupo de WhatsApp. Los partidos del torneo ocupan canchas que
  entonces no se pueden alquilar.

Problemas
- Alguna vez se reservó dos veces la misma cancha por no actualizar el cuaderno.
- El WhatsApp se satura en las horas pico y se pierden consultas.
- Cuesta controlar quién pagó la seña y quién no vino.
- Los jugadores no saben qué horarios están libres sin preguntar.
- Armar el fixture y llevar la tabla a mano lleva mucho tiempo.

Lo que quiere
- Una agenda única, donde no se pueda reservar dos veces la misma cancha.
- Que los jugadores vean los horarios libres y reserven solos, y que el
  mostrador también pueda cargar las reservas que entran por teléfono.
- Registrar la seña y el estado de cada turno (reservado, confirmado, jugado,
  cancelado).
- Organizar torneos y campeonatos: inscripciones, fixture, resultados y tabla.
- Le interesa aparecer en una plataforma junto a otros complejos de la zona,
  pero cada complejo tiene que ver y manejar solo sus propios datos.

Lo que no le interesa por ahora: pagos online, facturación, sueldos, stock del
buffet y contabilidad.
```

## Preguntas de la entrevista

### El negocio
1. ¿Nos cuenta cómo empezó el complejo y a qué se dedica hoy?
2. ¿Qué canchas tienen? ¿De qué deporte, de qué superficie, techadas o descubiertas?
3. ¿Qué días y en qué horarios abren? ¿En qué momentos hay más movimiento?
4. Además de alquilar canchas, ¿qué otros servicios ofrecen?

### Las personas
5. ¿Quiénes trabajan en el complejo y qué hace cada uno?
6. ¿Quién toma las reservas, quién cobra y quién abre y cierra las canchas?
7. ¿Quién decide los precios y los horarios? ¿Qué información mira para decidir?

### Las reservas
8. ¿Cómo hace hoy un jugador para reservar? ¿Nos cuenta cómo fue la última reserva que tomaron?
9. ¿Dónde anotan las reservas?
10. ¿Cuánto dura un turno? ¿Es igual en fútbol y en pádel?
11. ¿Con cuánta anticipación se puede reservar?
12. ¿Cómo manejan los turnos fijos? ¿Qué pasa si un grupo fijo falta una semana?
13. ¿Les pasó que se reservara dos veces la misma cancha? ¿Cómo lo resolvieron?
14. ¿Cómo se entera un jugador de qué horarios están libres?

### Precios, seña y pagos
15. ¿Cómo se fija el precio de un turno? ¿Cambia según la cancha, el día o la hora?
16. ¿Piden seña? ¿Cuánto, cómo la cobran y cómo controlan quién la pagó?
17. ¿Qué medios de pago aceptan?
18. ¿Cómo controlan lo que se cobró en el día?

### Cancelaciones y faltas
19. ¿Hasta cuándo se puede cancelar? ¿Qué pasa con la seña?
20. ¿Qué hacen cuando alguien reserva y no viene?
21. ¿Qué pasa si llueve o hay que cerrar una cancha por mantenimiento?

### Los jugadores
22. ¿Qué datos les piden a los jugadores?
23. ¿Tienen jugadores frecuentes? ¿Les dan algún beneficio?

### Torneos y campeonatos
24. ¿Organizan torneos o campeonatos? ¿De qué deporte?
25. ¿Qué diferencia hay entre un torneo y un campeonato? ¿Cómo se juega cada uno?
26. ¿Cómo se anotan los equipos o parejas? ¿Hay cupo y costo de inscripción?
27. ¿Cómo arman el fixture o la llave? ¿Qué pasa si hay un número impar de equipos?
28. ¿Cómo eligen en qué cancha y horario se juega cada partido? ¿Qué pasa con las reservas de esa cancha?
29. ¿Quién carga los resultados y cómo se enteran los equipos? ¿Llevan tabla de posiciones?
30. ¿Qué pasa si un equipo no se presenta o si hay empate en un partido que necesita ganador?

### Problemas y necesidades
31. ¿Qué es lo que más trabajo o problemas les da hoy?
32. ¿Qué información les gustaría tener y hoy no tienen?
33. Si tuvieran un sistema, ¿qué es lo primero que les gustaría resolver?
34. ¿Hay algo que hoy funcione bien y no quieran cambiar?

### Otros complejos
35. ¿Les interesaría aparecer en una plataforma junto con otros complejos de la zona? ¿Qué les preocuparía?
36. ¿Qué información del complejo les gustaría que vean los jugadores antes de reservar?

## Consejos para la entrevista

- **Anotar las palabras exactas que usa el cliente** (turno, seña, saldo, turno
  fijo, inasistencia, llave, fixture, fecha libre, incomparecencia, encargado):
  son el vocabulario del dominio y sirven para el análisis DDD.
- **Pedir ejemplos concretos**, por ejemplo: "¿nos cuenta cómo fue la última
  reserva que tomaron?".
- **Repreguntar cuando haya excepciones** ("¿y si…?", "¿siempre es así?"): ahí
  aparecen las reglas del negocio.
- **Guardar el chat completo** como respaldo del relevamiento.
