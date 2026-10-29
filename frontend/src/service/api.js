import axios from "axios";

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

// Sesión vencida: se avisa a la app para que cierre la sesión
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
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
