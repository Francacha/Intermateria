import { Component } from "react";
import { Link } from "react-router-dom";

// Si una página falla al dibujarse (por ejemplo, por una URL con datos raros),
// se muestra este aviso en lugar de dejar la pantalla en blanco.
// App.jsx le pone de key la ruta actual, así al navegar a otra página se reinicia.
export default class LimiteDeErrores extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="contenedor panel">
        <div className="tablero tablero-estado" role="alert">
          <h1 className="seccion-titulo sin-margen">Algo salió mal en esta página</h1>
          <p>Probá volver al inicio. Si vuelve a pasar, avisale al administrador del sitio.</p>
          <div className="acciones-vacio">
            <Link className="boton" to="/">Volver al inicio</Link>
          </div>
        </div>
      </main>
    );
  }
}
