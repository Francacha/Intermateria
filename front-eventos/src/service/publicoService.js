import api from "./api";

// Sin login: catálogo de complejos, disponibilidad y torneos
export const obtenerComplejos = (params) => api.get("/publico/complejos", { params });
export const obtenerComplejo = (id) => api.get(`/publico/complejos/${id}`);
export const obtenerDisponibilidad = (idCancha, fecha) =>
  api.get(`/publico/canchas/${idCancha}/disponibilidad`, { params: { fecha } });
export const obtenerTorneosPublicos = (params) => api.get("/publico/torneos", { params });
export const obtenerTorneoPublico = (id) => api.get(`/publico/torneos/${id}`);
