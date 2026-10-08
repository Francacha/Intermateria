import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { useAuth } from './context/auth'
import Inicio from './pages/Inicio'
import Registro from './pages/Registro'
import Ingresar from './pages/Ingresar'
import Panel from './pages/Panel'
import Empresas from './pages/Empresas'
import EmpresasForm from './pages/EmpresasForm'
import './App.css'

// Solo deja pasar a una empresa logueada
function RutaPrivada({ children }) {
  const { empresa } = useAuth()
  return empresa ? children : <Navigate to="/ingresar" replace />
}

// Si ya inició sesión, no tiene sentido mostrar login/registro
function RutaPublica({ children }) {
  const { empresa } = useAuth()
  return empresa ? <Navigate to="/panel" replace /> : children
}

function NoEncontrada() {
  return (
    <main className="contenedor vacio">
      <h1>Página no encontrada</h1>
      <Link className="boton" to="/">Volver al inicio</Link>
    </main>
  )
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/registro" element={<RutaPublica><Registro /></RutaPublica>} />
        <Route path="/ingresar" element={<RutaPublica><Ingresar /></RutaPublica>} />
        <Route path="/panel" element={<RutaPrivada><Panel /></RutaPrivada>} />
        {/* CRUD de empresas de la consigna (administración) */}
        <Route path="/empresas" element={<Empresas />} />
        <Route path="/empresas/nueva" element={<EmpresasForm />} />
        <Route path="/empresas/:id/editar" element={<EmpresasForm />} />
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
      <Footer />
    </div>
  )
}
