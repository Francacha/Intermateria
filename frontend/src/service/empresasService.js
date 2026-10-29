import api from "./api";

// Administración de empresas (rol admin)
export const obtenerEmpresas = () => api.get("/empresas");

export const obtenerResumen = () => api.get("/empresas/resumen");

export const obtenerEmpresa = (id) => api.get(`/empresas/${id}`);

export const crearEmpresa = (empresa) => api.post("/empresas", empresa);

export const actualizarEmpresa = (id, empresa) =>
  api.put(`/empresas/${id}`, empresa);

export const eliminarEmpresa = (id) => api.delete(`/empresas/${id}`);

export const cambiarPasswordEmpresa = (id, password) => api.put(`/empresas/${id}/password`, { password });

// Jugadores (rol admin): buscar y ponerles una contraseña nueva
export const obtenerJugadores = (q) => api.get("/clientes", { params: { q: q || undefined } });
export const cambiarPasswordJugador = (id, password) => api.put(`/clientes/${id}/password`, { password });

export const obtenerInstancia = () => api.get("/instancia");
