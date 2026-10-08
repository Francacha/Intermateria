import { useEffect } from "react";
import { useDroplet } from "../service/droplet";
import { obtenerInstancia } from "../service/empresasService";

const consultar = () => obtenerInstancia().catch(() => {});

export default function Footer() {
  const droplet = useDroplet();

  // Al abrir la app se consulta qué droplet atiende, aunque la página no pida datos
  useEffect(() => {
    consultar();
  }, []);

  return (
    <footer className="footer">
      <div className="contenedor footer-interno">
        <span className="footer-marca">Reservas de Canchas · pádel y fútbol</span>
        <span className="droplet">
          <span className={`droplet-punto ${droplet ? "activo" : ""}`} />
          Atendido por <strong>{droplet || "sin conexión"}</strong>
          <button className="droplet-boton" onClick={consultar} title="Consultar otra vez">
            ↻
          </button>
        </span>
      </div>
    </footer>
  );
}
