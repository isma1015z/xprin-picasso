import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Landing }  from './pages/Landing'
import { Login }    from './pages/Login'
import { Registro } from './pages/Registro'
import { Editor }   from './pages/Editor'
import { ProjectsMenu } from './pages/ProjectsMenu'
import { useStore } from './store'

export default function App() {
  const rehidratarStore = useStore((s) => s.rehidratarStore);

  useEffect(() => {
    rehidratarStore();
  }, [rehidratarStore]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Landing />}  />
        <Route path="/login"    element={<Login />}    />
        <Route path="/registro" element={<Registro />} />
        <Route path="/proyectos" element={<ProjectsMenu />} />
        <Route path="/editor"   element={<Editor />}   />
      </Routes>
    </BrowserRouter>
  )
}
  
