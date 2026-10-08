import api from "./api";

export const obtenerEmpresas = () => api.get("/empresas");

export const obtenerEmpresa = (id) => api.get(`/empresas/${id}`);

export const crearEmpresa = (empresa) => api.post("/empresas", empresa);

export const actualizarEmpresa = (id, empresa) =>
  api.put(`/empresas/${id}`, empresa);

export const eliminarEmpresa = (id) => api.delete(`/empresas/${id}`);

export const obtenerInstancia = () => api.get("/instancia");
