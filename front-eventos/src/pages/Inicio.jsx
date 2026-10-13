import { Link } from "react-router-dom";
import { inicioDe, useAuth } from "../context/auth";

const PASOS_JUGADORES = [
  { titulo: "Creá tu cuenta", texto: "Con tu email y teléfono, en un minuto." },
  { titulo: "Elegí complejo y cancha", texto: "Mirá todos los complejos, sus canchas de fútbol y pádel, precios y horarios." },
  { titulo: "Reservá o anotate", texto: "Sacá un turno libre o inscribí a tu equipo en un torneo o campeonato." }
];

const PASOS_COMPLEJOS = [
  { titulo: "Registrá tu complejo", texto: "Cargá tus datos y elegí si manejás canchas de pádel, de fútbol o de las dos." },
  { titulo: "Administrá los turnos", texto: "Mirá la agenda del día, confirmá reservas y cargá turnos por teléfono." },
  { titulo: "Organizá torneos", texto: "Torneos por eliminación o campeonatos todos contra todos, con fixture y tabla." }
];

export default function Inicio() {
  const { usuario } = useAuth();

  return (
    <main>
      <section className="hero">
        <div className="contenedor hero-interno">
          <div className="hero-texto">
            <span className="etiqueta">Fútbol y pádel</span>
            <h1>
              Reservá tu cancha de <span className="resaltado-padel">pádel</span> y{" "}
              <span className="resaltado-futbol">fútbol</span>, en un solo lugar
            </h1>
            <p>
              Todos los complejos, sus turnos libres y sus torneos. Y si tenés un
              complejo, administrá todo desde tu panel.
            </p>
            <div className="hero-acciones">
              {usuario && usuario.rol !== "cliente" ? (
                <Link to={inicioDe(usuario)} className="boton boton-grande">Ir a mi panel</Link>
              ) : (
                <>
                  <Link to="/complejos" className="boton boton-grande">Buscar cancha</Link>
                  <Link to="/torneos" className="boton boton-grande boton-secundario">Ver torneos</Link>
                </>
              )}
            </div>
          </div>

          {/* Dibujo de dos canchas vistas desde arriba */}
          <div className="hero-canchas" aria-hidden="true">
            <div className="cancha-dibujo cancha-futbol">
              <span className="linea-media" />
              <span className="circulo-central" />
              <span className="area area-izq" />
              <span className="area area-der" />
            </div>
            <div className="cancha-dibujo cancha-padel">
              <span className="red" />
              <span className="linea-saque saque-izq" />
              <span className="linea-saque saque-der" />
            </div>
          </div>
        </div>
      </section>

      <Pasos titulo="Para jugadores" pasos={PASOS_JUGADORES}>
        {!usuario && <Link to="/registro-cliente" className="boton">Crear mi cuenta</Link>}
      </Pasos>
      <Pasos titulo="Para complejos" pasos={PASOS_COMPLEJOS}>
        {!usuario && <Link to="/registro" className="boton boton-fantasma">Registrar mi complejo</Link>}
      </Pasos>
    </main>
  );
}

function Pasos({ titulo, pasos, children }) {
  return (
    <section className="contenedor seccion">
      <div className="barra">
        <h2 className="seccion-titulo">{titulo}</h2>
        {children}
      </div>
      <div className="pasos">
        {pasos.map((paso, i) => (
          <article key={paso.titulo} className="tarjeta paso">
            <span className="paso-numero">{i + 1}</span>
            <h3>{paso.titulo}</h3>
            <p>{paso.texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
