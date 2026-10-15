import { useEffect } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AvisoNavegacion from './components/AvisoNavegacion'
import LimiteDeErrores from './components/LimiteDeErrores'
import { avisoDeRol, conVuelta, destinoTrasIngresar, inicioDe, rutaInterna, useAuth } from './context/auth'
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
import Jugadores from './pages/Jugadores'
import './App.css'

// Si no hay sesión (token) redirige al login, que después vuelve acá; si el rol no corresponde, a su inicio
function RutaProtegida({ roles, children }) {
  const { usuario, vencida } = useAuth()
  const { pathname, search } = useLocation()
  if (!usuario) {
    const login = conVuelta('/ingresar', pathname, search)
    return <Navigate to={vencida ? `${login}${login.includes('?') ? '&' : '?'}vencida=1` : login} replace />
  }
  return roles.includes(usuario.rol) ? children : <Navigate to={inicioDe(usuario)} replace />
}

// Redirige dejando un aviso para la página de destino
function RedirigirConAviso({ to, aviso }) {
  const { avisar } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    avisar(aviso)
    navigate(to, { replace: true })
  }, [to, aviso, avisar, navigate])
  return null
}

// Si ya inició sesión, no tiene sentido mostrar login/registro: va a su inicio
// o, si venía de una reserva, de vuelta a esa reserva. Si su cuenta no puede volver ahí, se le avisa.
function RutaPublica({ children }) {
  const { usuario, aviso } = useAuth()
  const { search } = useLocation()
  if (!usuario) return children
  const destino = destinoTrasIngresar(usuario, search)
  const volver = rutaInterna(new URLSearchParams(search).get('volver'))
  // El login ya dejó su propio aviso: no hace falta otro
  if (volver && destino !== volver && destino === inicioDe(usuario) && !aviso) {
    return <RedirigirConAviso to={destino} aviso={{ texto: avisoDeRol(usuario, volver), volver }} />
  }
  return <Navigate to={destino} replace />
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
  const { pathname } = useLocation()
  return (
    <div className="app">
      <Navbar />
      <AvisoNavegacion />
      {/* Si una página falla, se muestra un aviso en lugar de la pantalla en blanco */}
      <LimiteDeErrores key={pathname}>
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
        <Route path="/mis-reservas" element={<RutaProtegida roles={['cliente']}><MisReservas /></RutaProtegida>} />

        {/* Empresa (complejo) */}
        <Route path="/panel" element={<RutaProtegida roles={['empresa']}><Panel /></RutaProtegida>} />
        <Route path="/panel/torneos/:id" element={<RutaProtegida roles={['empresa']}><GestionTorneo /></RutaProtegida>} />

        {/* Administrador: gestión de empresas */}
        <Route path="/admin" element={<RutaProtegida roles={['admin']}><Empresas /></RutaProtegida>} />
        <Route path="/admin/empresas/nueva" element={<RutaProtegida roles={['admin']}><EmpresasForm /></RutaProtegida>} />
        <Route path="/admin/empresas/:id/editar" element={<RutaProtegida roles={['admin']}><EmpresasForm /></RutaProtegida>} />
        <Route path="/admin/jugadores" element={<RutaProtegida roles={['admin']}><Jugadores /></RutaProtegida>} />

        <Route path="*" element={<NoEncontrada />} />
      </Routes>
      </LimiteDeErrores>
      <Footer />
    </div>
  )
}
