import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TorneoModal from "./TorneoModal";
import { TarjetaTorneo } from "./Torneo";
import { crearTorneo, obtenerTorneos } from "../service/complejoService";
import { mensajeDeError } from "../service/api";
import { esDueno, useAuth } from "../context/auth";

// Torneos y campeonatos que organiza el complejo
export default function TorneosPanel() {
  // Qué torneos se organizan lo decide el dueño
  const dueno = esDueno(useAuth().empresa);
  const navigate = useNavigate();
  const [torneos, setTorneos] = useState(null);
  const [error, setError] = useState("");
  const [nuevo, setNuevo] = useState(false);

  useEffect(() => {
    obtenerTorneos()
      .then(({ data }) => setTorneos(data))
      .catch((err) => setError(mensajeDeError(err, "No se pudieron cargar los torneos")));
  }, []);

  const guardar = async (datos) => {
    try {
      const { data } = await crearTorneo(datos);
      navigate(`/panel/torneos/${data.id_torneo}`);
    } catch (err) {
      throw mensajeDeError(err, "No se pudo crear el torneo");
    }
  };

  return (
    <section>
      <div className="barra">
        <p className="texto-suave sin-margen">
          Armá torneos por eliminación o campeonatos todos contra todos, de fútbol o pádel.
        </p>
        {dueno && <button className="boton" onClick={() => setNuevo(true)}>+ Nuevo torneo</button>}
      </div>

      {error && <p className="alerta">{error}</p>}
      {!torneos ? (
        !error && <p className="texto-suave">Cargando torneos...</p>
      ) : torneos.length === 0 ? (
        <div className="tarjeta vacio">
          <p>Todavía no organizaste torneos.</p>
          {dueno && <button className="boton" onClick={() => setNuevo(true)}>Crear el primero</button>}
        </div>
      ) : (
        <div className="grilla-torneos">
          {torneos.map((t) => (
            <TarjetaTorneo key={t.id_torneo} torneo={t} enlace={`/panel/torneos/${t.id_torneo}`} />
          ))}
        </div>
      )}

      {nuevo && <TorneoModal torneo={null} onGuardar={guardar} onCerrar={() => setNuevo(false)} />}
    </section>
  );
}
