import { Link } from "react-router-dom";
import { useAuth } from "../context/auth";

const PASOS = [
  { titulo: "Registrá tu complejo", texto: "Cargá tus datos y elegí si manejás canchas de pádel, de fútbol o de las dos." },
  { titulo: "Configurá tus canchas", texto: "Superficie, techada o al aire libre, jugadores y precio por hora." },
  { titulo: "Armá tu perfil", texto: "Horarios de cada día, servicios como vestuarios o buffet y tus redes." }
];

export default function Inicio() {
  const { empresa } = useAuth();

  return (
    <main>
      <section className="hero">
        <div className="contenedor hero-interno">
          <div className="hero-texto">
            <span className="etiqueta">Para complejos deportivos</span>
            <h1>
              Tu complejo de <span className="resaltado-padel">pádel</span> y{" "}
              <span className="resaltado-futbol">fútbol</span>, en un solo lugar
            </h1>
            <p>
              Cada complejo gestiona sus propias canchas, precios y horarios. Sin
              planillas, sin mezclar datos con nadie.
            </p>
            <div className="hero-acciones">
              {empresa ? (
                <Link to="/panel" className="boton boton-grande">Ir a mi complejo</Link>
              ) : (
                <>
                  <Link to="/registro" className="boton boton-grande">Registrar mi complejo</Link>
                  <Link to="/ingresar" className="boton boton-grande boton-secundario">Ya tengo cuenta</Link>
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

      <section className="contenedor seccion">
        <h2 className="seccion-titulo">Cómo funciona</h2>
        <div className="pasos">
          {PASOS.map((paso, i) => (
            <article key={paso.titulo} className="tarjeta paso">
              <span className="paso-numero">{i + 1}</span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
