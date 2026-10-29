import { Link } from "react-router-dom";

const VISIBLES = 4;

// Chips con los próximos horarios libres de una cancha. Cada uno lleva el día y la hora,
// así la reserva abre con ese horario elegido. sinHorarios reemplaza el aviso por defecto.
export default function HorariosLibres({ cancha, idEmpresa, fecha, libres, cerrado = false, sinHorarios }) {
  const base = `/complejos/${idEmpresa}?cancha=${cancha.id_cancha}&fecha=${fecha}`;
  const visibles = libres.slice(0, VISIBLES);
  const resto = libres.length - visibles.length;

  if (cerrado) return <span className="renglon-sin-horarios">Cerrado ese día</span>;
  if (visibles.length === 0) {
    return sinHorarios ?? <Link to={base} className="renglon-sin-horarios">Sin horarios libres · ver otros días</Link>;
  }

  return (
    <ul className="horarios-libres" aria-label={`Horarios libres de ${cancha.nombre}`}>
      {visibles.map((h) => (
        <li key={h}>
          <Link to={`${base}&hora=${h}`} className="horario-libre" aria-label={`Reservar ${cancha.nombre} a las ${h}`}>
            {h}
          </Link>
        </li>
      ))}
      {resto > 0 && (
        <li>
          <Link to={base} className="horario-libre horario-mas" aria-label={`Ver ${resto} horarios más de ${cancha.nombre}`}>
            +{resto} más
          </Link>
        </li>
      )}
    </ul>
  );
}
