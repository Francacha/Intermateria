import api from "./api";
import { duracionPorDefecto, horariosDelDia } from "../utils/formato";

// Sin login: catálogo de complejos, disponibilidad y torneos
export const obtenerComplejos = (params) => api.get("/publico/complejos", { params });
export const obtenerComplejo = (id) => api.get(`/publico/complejos/${id}`);
export const obtenerDisponibilidad = (idCancha, fecha) =>
  api.get(`/publico/canchas/${idCancha}/disponibilidad`, { params: { fecha } });
export const obtenerTorneosPublicos = (params) => api.get("/publico/torneos", { params });
export const obtenerTorneoPublico = (id) => api.get(`/publico/torneos/${id}`);

// Horarios libres de todas las canchas en un día, en un solo pedido.
// Devuelve un Map id_cancha → { cerrado, libres: ["19:00", ...] } con la duración por defecto de cada deporte.
export const obtenerHorariosLibres = async (canchas, fecha, deporte) => {
  const { data } = await api.get("/publico/disponibilidad", { params: { fecha, deporte: deporte || undefined } });
  const porCancha = new Map(data.map((d) => [d.id_cancha, d]));
  return new Map(
    canchas.map((cancha) => {
      const disponibilidad = porCancha.get(cancha.id_cancha);
      return [
        cancha.id_cancha,
        {
          cerrado: !disponibilidad?.horario.abierto,
          libres: horariosDelDia(disponibilidad, fecha, duracionPorDefecto(cancha.deporte))
            .filter((h) => h.libre)
            .map((h) => h.hora)
        }
      ];
    })
  );
};
