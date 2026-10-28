import api from "./api";

// Sesión (login único para admin, complejo y cliente)
export const registrarEmpresa = (datos) => api.post("/auth/registro", datos);
export const iniciarSesion = (email, password) => api.post("/auth/login", { email, password });
export const obtenerSesion = () => api.get("/auth/sesion");
// La persona logueada cambia su contraseña (cualquier rol)
export const cambiarMiPassword = (actual, nueva) => api.put("/auth/password", { actual, nueva });

// Canchas del complejo logueado
export const obtenerCanchas = () => api.get("/canchas");
export const crearCancha = (cancha) => api.post("/canchas", cancha);
export const actualizarCancha = (id, cancha) => api.put(`/canchas/${id}`, cancha);
export const eliminarCancha = (id) => api.delete(`/canchas/${id}`);

// Perfil del complejo
export const obtenerPerfil = () => api.get("/perfil");
export const guardarPerfil = (perfil) => api.put("/perfil", perfil);

// Turnos
export const obtenerTurnos = (fecha) => api.get("/turnos", { params: { fecha } });
export const crearTurno = (turno) => api.post("/turnos", turno);
export const actualizarTurno = (id, datos) => api.put(`/turnos/${id}`, datos);

// Torneos y campeonatos
export const obtenerTorneos = () => api.get("/torneos");
export const obtenerTorneo = (id) => api.get(`/torneos/${id}`);
export const crearTorneo = (torneo) => api.post("/torneos", torneo);
export const actualizarTorneo = (id, datos) => api.put(`/torneos/${id}`, datos);
export const eliminarTorneo = (id) => api.delete(`/torneos/${id}`);
export const agregarEquipo = (id, equipo) => api.post(`/torneos/${id}/equipos`, equipo);
export const quitarEquipo = (id, idEquipo) => api.delete(`/torneos/${id}/equipos/${idEquipo}`);
export const generarFixture = (id) => api.post(`/torneos/${id}/fixture`);
export const sortearGrupos = (id) => api.post(`/torneos/${id}/grupos/sorteo`);
export const cambiarGrupo = (id, idEquipo, grupo) => api.put(`/torneos/${id}/equipos/${idEquipo}/grupo`, { grupo });
export const armarLlave = (id) => api.post(`/torneos/${id}/llave`);
export const actualizarPartido = (id, idPartido, datos) => api.put(`/torneos/${id}/partidos/${idPartido}`, datos);
