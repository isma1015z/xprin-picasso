import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Páginas públicas
import { Landing }               from './pages/Landing'
import { Login }                 from './pages/Login'
import { Registro }              from './pages/Registro'
import { RecuperarContrasena }   from './pages/RecuperarContrasena'
import { ActualizarContrasena }  from './pages/ActualizarContrasena'

// Páginas protegidas (requieren sesión)
import { ProjectsMenu }          from './pages/ProjectsMenu'
import { Editor }                from './pages/Editor'
import { MiCuenta }              from './pages/MiCuenta'
import { Configuracion }         from './pages/Configuracion'
import { Ayuda }                 from './pages/Ayuda'

// Páginas legales (trabajo de Blanca)
import { PoliticaPrivacidad }    from './pages/PoliticaPrivacidad'
import { AvisoLegal }            from './pages/AvisoLegal'
import { PoliticaCookies }       from './pages/PoliticaCookies'
import { PoliticaCalidad }       from './pages/PoliticaCalidad'

// Guard de autenticación
import { RequireAuth }           from './components/RequireAuth'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Públicas ────────────────────────────────────────────── */}
        <Route path="/"                       element={<Landing />}             />
        <Route path="/login"                  element={<Login />}               />
        <Route path="/registro"               element={<Registro />}            />
        <Route path="/recuperar"              element={<RecuperarContrasena />} />
        <Route path="/actualizar-contrasena"  element={<ActualizarContrasena />}/>

        {/* ── Protegidas ──────────────────────────────────────────── */}
        <Route path="/proyectos" element={<RequireAuth><ProjectsMenu /></RequireAuth>} />
        <Route path="/editor"    element={<RequireAuth><Editor /></RequireAuth>}       />
        <Route path="/mi-cuenta" element={<RequireAuth><MiCuenta /></RequireAuth>}     />
        <Route path="/configuracion" element={<RequireAuth><Configuracion /></RequireAuth>} />
        <Route path="/ayuda"     element={<RequireAuth><Ayuda /></RequireAuth>}        />

        {/* ── Legales (Blanca) ─────────────────────────────────────── */}
        <Route path="/politica-de-privacidad" element={<PoliticaPrivacidad />} />
        <Route path="/aviso-legal"            element={<AvisoLegal />}         />
        <Route path="/politica-de-cookies"    element={<PoliticaCookies />}    />
        <Route path="/politica-de-calidad"    element={<PoliticaCalidad />}    />
      </Routes>
    </BrowserRouter>
  )
}
