import { useEffect, useState } from "react";
import { obtenerInstancia } from "../service/empresasService";
import Icono from "./Icono";

// Muestra qué droplet atiende. Se consulta al abrir o recargar la página y con
// el botón: Nginx manda cada consulta al droplet siguiente (round-robin).
export default function Footer() {
  const [droplet, setDroplet] = useState("");
  // "consultando" hasta que responde la API; "error" solo si la consulta falló
  const [estado, setEstado] = useState("consultando");

  const consultar = () => {
    setEstado("consultando");
    return obtenerInstancia()
      .then(({ data }) => {
        setDroplet(data.droplet);
        setEstado("ok");
      })
      .catch(() => setEstado("error"));
  };

  useEffect(() => {
    let vigente = true;
    obtenerInstancia()
      .then(({ data }) => {
        if (!vigente) return;
        setDroplet(data.droplet);
        setEstado("ok");
      })
      .catch(() => vigente && setEstado("error"));
    return () => {
      vigente = false;
    };
  }, []);

  const sinConexion = estado === "error";
  const texto = sinConexion ? "sin conexión" : estado === "consultando" && !droplet ? "consultando…" : droplet;

  return (
    <footer className="footer">
      <div className="contenedor footer-interno">
        <span className="footer-marca">Reservas de Canchas · pádel y fútbol</span>
        <span className="droplet" aria-live="polite">
          <span className={`droplet-punto ${sinConexion ? "caido" : droplet ? "activo" : ""}`} aria-hidden="true" />
          Atendido por <strong>{texto}</strong>
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
