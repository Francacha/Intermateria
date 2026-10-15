import { useEffect, useState } from "react";
import { useDroplet } from "../service/droplet";
import { obtenerInstancia } from "../service/empresasService";
import Icono from "./Icono";

export default function Footer() {
  const droplet = useDroplet();
  // "consultando" hasta que responde la API; "error" solo si la consulta falló
  const [estado, setEstado] = useState("consultando");

  const consultar = () => {
    setEstado("consultando");
    obtenerInstancia()
      .then(() => setEstado("ok"))
      .catch(() => setEstado("error"));
  };

  // Al abrir la app se consulta qué droplet atiende, aunque la página no pida datos
  useEffect(() => {
    obtenerInstancia()
      .then(() => setEstado("ok"))
      .catch(() => setEstado("error"));
  }, []);

  const sinConexion = !droplet && estado === "error";

  return (
    <footer className="footer">
      <div className="contenedor footer-interno">
        <span className="footer-marca">Reservas de Canchas · pádel y fútbol</span>
        <span className="droplet" aria-live="polite">
          <span className={`droplet-punto ${droplet ? "activo" : sinConexion ? "caido" : ""}`} aria-hidden="true" />
          Atendido por <strong>{droplet || (sinConexion ? "sin conexión" : "consultando…")}</strong>
          <button
            className="droplet-boton"
            onClick={consultar}
            aria-label="Consultar otra vez qué droplet atiende"
            title="Consultar otra vez"
          >
            <Icono nombre="recargar" tamano={16} />
          </button>
        </span>
      </div>
    </footer>
  );
}
