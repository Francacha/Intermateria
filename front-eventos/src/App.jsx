import { Link, Route, Routes } from 'react-router-dom'

function Empresas() {
  return (
    <main>
      <h1>Empresas</h1>
      <p>La página de empresas todavía no está implementada.</p>
      <Link to="/empresas/nueva">Crear empresa</Link>
    </main>
  )
}

function EmpresaForm() {
  return (
    <main>
      <h1>Empresa</h1>
      <p>El formulario todavía no está implementado.</p>
      <Link to="/">Volver a empresas</Link>
    </main>
  )
}

function NoEncontrada() {
  return (
    <main>
      <h1>Página no encontrada</h1>
      <Link to="/">Volver al inicio</Link>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Empresas />} />
      <Route path="/empresas/nueva" element={<EmpresaForm />} />
      <Route path="/empresas/:id/editar" element={<EmpresaForm />} />
      <Route path="*" element={<NoEncontrada />} />
    </Routes>
  )
}
