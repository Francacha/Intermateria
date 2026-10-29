// Estados compartidos de las listas: cargando (esqueleto) y error con reintento

export function Cargando({ filas = 3, etiqueta, conHorarios = false }) {
  return (
    <div className="tablero" aria-busy="true" aria-label={etiqueta}>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="renglon renglon-cargando">
          <span className="esqueleto esqueleto-cancha" />
          <span className="esqueleto esqueleto-texto" />
          {conHorarios && <span className="esqueleto esqueleto-horarios" />}
        </div>
      ))}
    </div>
  );
}

export function ConError({ mensaje, onReintentar }) {
  return (
    <div className="tablero tablero-estado" role="alert">
      <p>{mensaje}</p>
      <button className="boton boton-fantasma" onClick={onReintentar}>Reintentar</button>
    </div>
  );
}
