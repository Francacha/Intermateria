import api from "./api";

// Sesión
export const registrarEmpresa = (datos) => api.post("/auth/registro", datos);
export const iniciarSesion = (email, password) => api.post("/auth/login", { email, password });
export const obtenerSesion = () => api.get("/auth/sesion");

// Canchas del complejo logueado (PostgreSQL)
export const obtenerCanchas = () => api.get("/canchas");
export const crearCancha = (cancha) => api.post("/canchas", cancha);
export const actualizarCancha = (id, cancha) => api.put(`/canchas/${id}`, cancha);
export const eliminarCancha = (id) => api.delete(`/canchas/${id}`);

// Perfil del complejo (MongoDB)
export const obtenerPerfil = () => api.get("/perfil");
export const guardarPerfil = (perfil) => api.put("/perfil", perfil);
