import { buscarPerfil, DIAS, guardarPerfil } from "../data/perfiles.js";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const texto = (valor, max) => String(valor ?? "").trim().slice(0, max);

// Se arma el perfil solo con los campos conocidos, para no guardar cualquier cosa
const limpiarPerfil = (body) => {
  const horarios = {};
  for (const dia of DIAS) {
    const h = body.horarios?.[dia] ?? {};
    const abre = HORA.test(h.abre) ? h.abre : "09:00";
    const cierra = HORA.test(h.cierra) ? h.cierra : "23:00";
    horarios[dia] = { abierto: h.abierto !== false, abre, cierra };
  }

  return {
    descripcion: texto(body.descripcion, 500),
    servicios: Array.isArray(body.servicios)
      ? [...new Set(body.servicios.map((s) => texto(s, 40)).filter(Boolean))].slice(0, 20)
      : [],
    horarios,
    redes: {
      instagram: texto(body.redes?.instagram, 60),
      whatsapp: texto(body.redes?.whatsapp, 30)
    }
  };
};

export const obtenerPerfil = async (req, res) => {
  try {
    res.json(await buscarPerfil(req.empresa.id_empresa));
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al obtener el perfil" });
  }
};

export const actualizarPerfil = async (req, res) => {
  try {
    const perfil = await guardarPerfil(req.empresa.id_empresa, limpiarPerfil(req.body ?? {}));
    res.json(perfil);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al guardar el perfil" });
  }
};
