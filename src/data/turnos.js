import { buscarPerfil, horarioDeFecha } from "./perfiles.js";
import {
  ErrorHttp,
  aHora,
  aMinutos,
  ahora,
  cierreEnMinutos,
  fechaValida,
  horaValida,
  idValido
} from "../utils/comun.js";

export const DURACIONES = [60, 90, 120];
const DIAS_ANTICIPACION = 60;

// Turnos con los datos de la cancha y de quién reservó (cliente registrado o contacto cargado a mano)
export const CONSULTA_TURNOS = `
  SELECT r.id_reserva, r.id_empresa, r.id_cancha, r.id_cliente, r.id_partido, r.fecha,
         r.hora_inicio, r.hora_fin, r.estado, r.precio_total, r.sena, r.fecha_creacion,
         c.nombre AS cancha, c.deporte, e.nombre AS complejo, e.direccion,
         COALESCE(cl.nombre || ' ' || cl.apellido, r.contacto_nombre) AS cliente,
         COALESCE(cl.telefono, r.contacto_telefono) AS telefono,
         cl.email
    FROM reservas r
    JOIN canchas c ON c.id_cancha = r.id_cancha
    JOIN empresas e ON e.id_empresa = r.id_empresa
    LEFT JOIN clientes cl ON cl.id_cliente = r.id_cliente`;

const diasEntre = (desde, hasta) =>
  (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;

// Crea un turno validando todo lo que la base no puede validar sola.
// La superposición con otros turnos la controla el EXCLUDE de la tabla reservas.
//   - idEmpresa: lo carga el complejo (solo sus canchas, sin límite de horario)
//   - idCliente: lo saca un cliente (canchas activas, dentro del horario del complejo)
export const crearTurno = async (db, datos) => {
  const { idCancha, fecha, horaInicio, idEmpresa = null, idCliente = null } = datos;
  const duracion = Number(datos.duracion ?? 60);

  if (!idValido(idCancha)) throw new ErrorHttp(400, "Elegí una cancha");
  if (!fechaValida(fecha)) throw new ErrorHttp(400, "La fecha no es válida");
  if (!horaValida(horaInicio) || aMinutos(horaInicio) % 30 !== 0) {
    throw new ErrorHttp(400, "El turno tiene que empezar en punto o y media");
  }
  if (!DURACIONES.includes(duracion)) {
    throw new ErrorHttp(400, "La duración puede ser de 60, 90 o 120 minutos");
  }

  const { rows: canchas } = await db.query(
    `SELECT c.*, e.activo AS empresa_activa
       FROM canchas c JOIN empresas e ON e.id_empresa = c.id_empresa
      WHERE c.id_cancha = $1 AND ($2::int IS NULL OR c.id_empresa = $2)`,
    [idCancha, idEmpresa]
  );
  const cancha = canchas[0];
  if (!cancha || (!idEmpresa && (!cancha.activa || !cancha.empresa_activa))) {
    throw new ErrorHttp(404, "Cancha no encontrada");
  }

  const inicio = aMinutos(horaInicio);
  const fin = inicio + duracion;
  if (fin > 1440) throw new ErrorHttp(400, "El turno no puede pasar de la medianoche");

  const hoy = ahora();
  if (fecha < hoy.fecha || (fecha === hoy.fecha && horaInicio <= hoy.hora)) {
    throw new ErrorHttp(400, "Ese horario ya pasó");
  }

  if (!idEmpresa) {
    if (diasEntre(hoy.fecha, fecha) > DIAS_ANTICIPACION) {
      throw new ErrorHttp(400, `Se puede reservar con hasta ${DIAS_ANTICIPACION} días de anticipación`);
    }
    const perfil = await buscarPerfil(cancha.id_empresa);
    const horario = horarioDeFecha(perfil.horarios, fecha);
    if (!horario.abierto) throw new ErrorHttp(400, "El complejo está cerrado ese día");
    if (inicio < aMinutos(horario.abre) || fin > cierreEnMinutos(horario.abre, horario.cierra)) {
      throw new ErrorHttp(400, `El complejo atiende de ${horario.abre} a ${horario.cierra}`);
    }
  }

  const sena = Number(datos.sena ?? 0);
  if (!(sena >= 0)) throw new ErrorHttp(400, "La seña no puede ser negativa");

  const { rows } = await db.query(
    `INSERT INTO reservas (id_empresa, id_cancha, id_cliente, contacto_nombre, contacto_telefono,
                           fecha, hora_inicio, hora_fin, precio_total, sena, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id_reserva`,
    [
      cancha.id_empresa,
      cancha.id_cancha,
      idCliente,
      datos.contactoNombre || null,
      datos.contactoTelefono || null,
      fecha,
      horaInicio,
      aHora(fin),
      (Number(cancha.precio_hora) * duracion) / 60,
      sena,
      // Los turnos que carga el propio complejo ya están confirmados
      idEmpresa ? "confirmada" : "reservada"
    ]
  );

  const { rows: turno } = await db.query(`${CONSULTA_TURNOS} WHERE r.id_reserva = $1`, [rows[0].id_reserva]);
  return turno[0];
};
