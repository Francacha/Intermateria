import api from "./api";

// Jugador registrado
export const registrarCliente = (datos) => api.post("/auth/registro-cliente", datos);

export const obtenerMisReservas = () => api.get("/reservas");
export const reservar = (datos) => api.post("/reservas", datos);
export const cancelarReserva = (id) => api.put(`/reservas/${id}/cancelar`);

export const obtenerMisInscripciones = () => api.get("/inscripciones");
export const inscribirEquipo = (datos) => api.post("/inscripciones", datos);
export const darseDeBaja = (id) => api.delete(`/inscripciones/${id}`);
