import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Landing }              from './pages/Landing'
import { Login }                from './pages/Login'
import { Registro }             from './pages/Registro'
import { RecuperarContrasena }  from './pages/RecuperarContrasena'
import { ActualizarContrasena } from './pages/ActualizarContrasena'
import { Editor }               from './pages/Editor'
import { ProjectsMenu }         from './pages/ProjectsMenu'
import { Ayuda }                from './pages/Ayuda'
import { MiCuenta }             from './pages/MiCuenta'
import { Configuracion }        from './pages/Configuracion'
import { RequireAuth }          from './components/RequireAuth'
import { useStore } from './store'
import { supabase } from './lib/supabase'

export default function App() {
  const rehidratarStore = useStore((s) => s.rehidratarStore);

  useEffect(() => {
    rehidratarStore();
  }, [rehidratarStore]);

  useEffect(() => {
    // Refrescar la sesión de Supabase al cargar la app para asegurar persistencia
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('Sesión recuperada:', session.user.email);
      }
    });
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const sessionActive = sessionStorage.getItem('xprin-session-active');
      if (!sessionActive) {
        console.log('Nueva sesión detectada. Limpiando estado persistido...');
        const { useStore } = await import('./store');
        await useStore.getState().resetEditor();
        sessionStorage.setItem('xprin-session-active', 'true');
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const { proyectoId } = useStore.getState();
      if (proyectoId) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                      element={<Landing />}              />
        <Route path="/login"                 element={<Login />}                />
        <Route path="/registro"              element={<Registro />}             />
        <Route path="/recuperar"             element={<RecuperarContrasena />}  />
        <Route path="/actualizar-contrasena" element={<ActualizarContrasena />} />
        <Route path="/proyectos"             element={<ProjectsMenu />}         />
        <Route
          path="/mi-cuenta"
          element={(
            <RequireAuth>
              <MiCuenta />
            </RequireAuth>
          )}
        />
        <Route
          path="/configuracion"
          element={(
            <RequireAuth>
              <Configuracion />
            </RequireAuth>
          )}
        />
        <Route
          path="/ayuda"
          element={(
            <RequireAuth>
              <Ayuda />
            </RequireAuth>
          )}
        />
        <Route
          path="/editor"
          element={(
            <RequireAuth>
              <Editor />
            </RequireAuth>
          )}
        />
      </Routes>
    </BrowserRouter>
  )
}
