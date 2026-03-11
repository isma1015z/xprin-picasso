import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Landing }  from './pages/Landing'
import { Login }    from './pages/Login'
import { Registro } from './pages/Registro'
import { Editor }   from './pages/Editor'
import { RecuperarContrasena } from './pages/RecuperarContrasena'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Landing />}  />
        <Route path="/login"    element={<Login />}    />
        <Route path="/registro" element={<Registro />} />
        <Route path="/recuperar" element={<RecuperarContrasena />} />
        <Route path="/editor"   element={<Editor />}   />
      </Routes>
    </BrowserRouter>
  )
}
