// Página principal del editor — XPRIN-Picasso
import { useState, useEffect } from 'react'
import { Canvas }  from '../components/Canvas'
import { Header }  from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { useStore } from '../store'

export function Editor() {
  const [theme, setTheme] = useState('light')
  const { imagenUrl } = useStore()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-base text-primary font-inter">
      <Header theme={theme} toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
      <div className="flex flex-1 overflow-hidden">
        {imagenUrl && <Sidebar />}
        <Canvas />
      </div>
    </div>
  )
}
