import axios from "axios";
import { setDroplet } from "./droplet";

export const CLAVE_SESION = "sesion";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// Si hay sesión iniciada, cada petición lleva el token
api.interceptors.request.use((config) => {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE_SESION));
    if (sesion?.token) config.headers.Authorization = `Bearer ${sesion.token}`;
  } catch {
    // sin sesión guardada
  }
  return config;
});

// Cada respuesta trae la cabecera X-Droplet con el droplet que la atendió
api.interceptors.response.use(
  (respuesta) => {
    setDroplet(respuesta.headers["x-droplet"]);
    return respuesta;
  },
  (error) => {
    setDroplet(error.response?.headers["x-droplet"]);
    // Token vencido o inválido en una ruta protegida: se cierra la sesión
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      window.dispatchEvent(new Event("sesion-expirada"));
    }
    return Promise.reject(error);
  }
);

export const mensajeDeError = (error, porDefecto) =>
  error.response?.data?.mensaje ?? porDefecto;

export default api;
