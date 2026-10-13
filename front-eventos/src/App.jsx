import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { inicioDe, useAuth } from './context/auth'
import Inicio from './pages/Inicio'
import Registro from './pages/Registro'
import RegistroCliente from './pages/RegistroCliente'
import Ingresar from './pages/Ingresar'
import Panel from './pages/Panel'
import GestionTorneo from './pages/GestionTorneo'
import Complejos from './pages/Complejos'
import ComplejoDetalle from './pages/ComplejoDetalle'
import Torneos from './pages/Torneos'
import TorneoDetalle from './pages/TorneoDetalle'
import MisReservas from './pages/MisReservas'
import Empresas from './pages/Empresas'
import EmpresasForm from './pages/EmpresasForm'
import './App.css'

// Solo deja pasar a los usuarios con alguno de esos roles
function RutaRol({ roles, children }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/ingresar" replace />
  return roles.includes(usuario.rol) ? children : <Navigate to={inicioDe(usuario)} replace />
}

// Si ya inició sesión, no tiene sentido mostrar login/registro
function RutaPublica({ children }) {
  const { usuario } = useAuth()
  return usuario ? <Navigate to={inicioDe(usuario)} replace /> : children
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
        {/* Públicas: cualquiera ve los complejos y los torneos */}
        <Route path="/complejos" element={<Complejos />} />
        <Route path="/complejos/:id" element={<ComplejoDetalle />} />
        <Route path="/torneos" element={<Torneos />} />
        <Route path="/torneos/:id" element={<TorneoDetalle />} />

        <Route path="/registro" element={<RutaPublica><Registro /></RutaPublica>} />
        <Route path="/registro-cliente" element={<RutaPublica><RegistroCliente /></RutaPublica>} />
        <Route path="/ingresar" element={<RutaPublica><Ingresar /></RutaPublica>} />

        {/* Cliente (jugador) */}
        <Route path="/mis-reservas" element={<RutaRol roles={['cliente']}><MisReservas /></RutaRol>} />

        {/* Empresa (complejo) */}
        <Route path="/panel" element={<RutaRol roles={['empresa']}><Panel /></RutaRol>} />
        <Route path="/panel/torneos/:id" element={<RutaRol roles={['empresa']}><GestionTorneo /></RutaRol>} />

        {/* Administrador: gestión de empresas */}
        <Route path="/admin" element={<RutaRol roles={['admin']}><Empresas /></RutaRol>} />
        <Route path="/admin/empresas/nueva" element={<RutaRol roles={['admin']}><EmpresasForm /></RutaRol>} />
        <Route path="/admin/empresas/:id/editar" element={<RutaRol roles={['admin']}><EmpresasForm /></RutaRol>} />

        <Route path="*" element={<NoEncontrada />} />
      </Routes>
      <Footer />
    </div>
  )
}
