import { useEffect, useState } from "react";
import { guardarPerfil, obtenerPerfil } from "../service/complejoService";
import { mensajeDeError } from "../service/api";

const SERVICIOS = [
  "Vestuarios", "Duchas", "Estacionamiento", "Buffet", "Parrilla",
  "Wi-Fi", "Alquiler de paletas", "Alquiler de pelotas", "Iluminación LED", "Torneos"
];
const DIAS = [
  ["lunes", "Lunes"], ["martes", "Martes"], ["miercoles", "Miércoles"], ["jueves", "Jueves"],
  ["viernes", "Viernes"], ["sabado", "Sábado"], ["domingo", "Domingo"]
];

// Perfil del complejo: se guarda como un documento en MongoDB (base NoSQL)
export default function PerfilComplejo() {
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerPerfil()
      .then(({ data }) => setPerfil(data))
      .catch((err) => setError(mensajeDeError(err, "No se pudo cargar el perfil")));
  }, []);

  if (error && !perfil) return <p className="alerta">{error}</p>;
  if (!perfil) return <p className="texto-suave">Cargando perfil...</p>;

  const alternarServicio = (servicio) => {
    const servicios = perfil.servicios.includes(servicio)
      ? perfil.servicios.filter((s) => s !== servicio)
      : [...perfil.servicios, servicio];
    setPerfil({ ...perfil, servicios });
  };

  const cambiarHorario = (dia, campo, valor) =>
    setPerfil({ ...perfil, horarios: { ...perfil.horarios, [dia]: { ...perfil.horarios[dia], [campo]: valor } } });

  const guardar = async () => {
    setGuardando(true);
    setError("");
    setAviso("");
    try {
      const { data } = await guardarPerfil(perfil);
      setPerfil(data);
      setAviso("Perfil guardado");
    } catch (err) {
      setError(mensajeDeError(err, "No se pudo guardar el perfil"));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="perfil">
      <div className="perfil-columna">
        <label className="campo">
          Descripción
          <textarea
            rows={4}
            maxLength={500}
            placeholder="Contá qué ofrece tu complejo..."
            value={perfil.descripcion}
            onChange={(e) => setPerfil({ ...perfil, descripcion: e.target.value })}
          />
        </label>

        <span className="campo-titulo">Servicios</span>
        <div className="chips">
          {SERVICIOS.map((servicio) => (
            <button
              type="button"
              key={servicio}
              className={`chip ${perfil.servicios.includes(servicio) ? "activo" : ""}`}
              onClick={() => alternarServicio(servicio)}
            >
              {servicio}
            </button>
          ))}
        </div>

        <div className="grilla-campos">
          <label className="campo">
            Instagram
            <input
              placeholder="@micomplejo"
              value={perfil.redes.instagram}
              onChange={(e) => setPerfil({ ...perfil, redes: { ...perfil.redes, instagram: e.target.value } })}
            />
          </label>
          <label className="campo">
            WhatsApp
            <input
              placeholder="351-..."
              value={perfil.redes.whatsapp}
              onChange={(e) => setPerfil({ ...perfil, redes: { ...perfil.redes, whatsapp: e.target.value } })}
            />
          </label>
        </div>
      </div>

      <div className="perfil-columna">
        <span className="campo-titulo">Horarios</span>
        <div className="horarios">
          {DIAS.map(([dia, nombre]) => {
            const h = perfil.horarios[dia];
            return (
              <div key={dia} className={`horario ${h.abierto ? "" : "cerrado"}`}>
                <label className="campo-check">
                  <input type="checkbox" checked={h.abierto} onChange={(e) => cambiarHorario(dia, "abierto", e.target.checked)} />
                  {nombre}
                </label>
                {h.abierto ? (
                  <span className="horario-horas">
                    <input type="time" value={h.abre} onChange={(e) => cambiarHorario(dia, "abre", e.target.value)} />
                    a
                    <input type="time" value={h.cierra} onChange={(e) => cambiarHorario(dia, "cierra", e.target.value)} />
                  </span>
                ) : (
                  <span className="texto-suave">Cerrado</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="perfil-pie">
        {error && <span className="alerta-texto">{error}</span>}
        {aviso && <span className="ok-texto">✓ {aviso}</span>}
        {perfil.actualizado && (
          <span className="texto-suave">Última actualización: {new Date(perfil.actualizado).toLocaleString()}</span>
        )}
        <button className="boton" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar perfil"}
        </button>
      </div>
    </div>
  );
}
