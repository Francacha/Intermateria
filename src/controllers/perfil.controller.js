import { buscarPerfil, DIAS, guardarPerfil, reglasPorDefecto } from "../data/perfiles.js";

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
    },
    reglas: limpiarReglas(body.reglas ?? {})
  };
};

const entero = (valor, min, max, porDefecto) => {
  const n = Number(valor);
  return Number.isInteger(n) && n >= min && n <= max ? n : porDefecto;
};

// Reglas de reserva: lo que no es válido vuelve al valor por defecto
const limpiarReglas = (reglas) => {
  const base = reglasPorDefecto();
  return {
    porcentaje_sena: entero(reglas.porcentaje_sena, 0, 100, base.porcentaje_sena),
    horas_cancelacion: entero(reglas.horas_cancelacion, 0, 168, base.horas_cancelacion),
    hora_noche: HORA.test(reglas.hora_noche) ? reglas.hora_noche : base.hora_noche,
    datos_transferencia: texto(reglas.datos_transferencia, 120)
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
