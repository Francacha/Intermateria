# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences with equal weight in design decisions:

- **Jugador (cliente):** people who play fútbol or pádel and want to find a free court and book it, or sign their team or pair up for a tournament. They mostly use a phone, often on the go.
- **Complejo (empresa):** the owner or encargado of a sports complex. They manage the day's agenda (confirming bookings, marking games as played, cancelling, recording the deposit (seña), taking bookings by phone) along with courts, opening hours, and tournaments. They mostly use a desktop computer at the front counter, every day.

Secondary audience: the **administrador**, who registers, edits, deactivates or reactivates, and deletes complexes.

## Product Purpose

A multi-tenant platform where many sports complexes list their fútbol and pádel courts, players book free slots, and each complex runs its agenda and its tournaments from its own panel. It replaces phone, WhatsApp, and notebook booking with a shared agenda that cannot double-book a court.

The project is a university assignment (Analista en Sistemas, Programación II) that is meant to grow into a real product. It has to demo well with the seeded users and also hold up for real complexes and players.

## Positioning

One place that covers both sides of the court. Players see every complex's open slots and tournaments. Complexes get booking management and tournament organization (knockout brackets and round-robin leagues with standings), and a scheduled tournament match blocks that court slot for public booking.

## Operating Context

- Booking flow: browse complexes → choose a court → pick a free slot from the time grid → book, and cancel later if needed.
- Complex flow: daily agenda of turnos (pending, confirmed, played, cancelled), seña tracking, bookings loaded by phone, court and profile setup (opening hours decide when slots can be booked).
- Tournaments: **torneo** (single elimination; the bracket is drawn when registration closes and byes are assigned if needed) and **campeonato** (round-robin, 3 points for a win and 1 for a draw). Teams for fútbol, pairs for pádel.
- One login for all roles. The API detects the role from the email and the front sends each role to its own home.
- Deployed across 3 DigitalOcean droplets behind Nginx. The footer shows which droplet answered the last request, a deliberate demo feature for the course.

## Capabilities and Constraints

- Stack: React 19 + Vite + react-router (frontend/), Node/Express API, PostgreSQL, Docker. Plain CSS (App.css, index.css). No UI library.
- Domain vocabulary must match how complexes talk: turno, seña, cancha, complejo, torneo, campeonato, fixture, llave, tabla de posiciones, encargado, turno fijo.
- The database rejects overlapping bookings on the same court (an EXCLUDE constraint), so double-booking cannot happen even across droplets.
- A deactivated complex can't log in and doesn't appear on the public site.
- Built from the client interview (docs/entrevista-cliente.md): turnos fijos, payments per turno (seña and saldo, cash or transfer, entered by staff), daily caja, the 24-hour cancellation rule, no-shows, court closures, day/night pricing, owner reports, owner vs encargado roles, and walkovers in tournaments.
- Open (not built yet): online payments (the client does not want the system to charge or verify transfers), promotions and loyalty benefits.

## Brand Commitments

- Language: Spanish, Rioplatense voseo ("Reservá", "Creá tu cuenta", "Sacá un turno").
- Working name: "Reservas de Canchas".
- Fútbol and pádel are the two sports and both are always first-class.

## Evidence on Hand

- Demo accounts and seeded complexes are listed in README.md.
- Business research questions are in docs/relevamiento.md.
- There are no real testimonials, customers, usage numbers, or pricing claims. Do not invent any.

## Product Principles

1. **Two sides, one agenda.** Every booking a player sees and every turno a complex manages come from the same truth, so never design one side in a way that hides the other.
2. **Fast on the phone for players, dense and scannable on a desktop for complexes.** Each role gets the density that fits its device.
3. **Speak the complex's language.** Use the domain words they already use, not generic SaaS terms.
4. **Demo-ready and real-ready.** It has to work with seed data in a class presentation and with real, messy data (empty states, cancellations, deactivated complexes).
