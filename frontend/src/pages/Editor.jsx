// Página principal del editor — XPRIN-Picasso
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Canvas } from '../components/Canvas'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { useStore } from '../store'

export function Editor() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('xprin-theme') || 'light'
  )
  const [windowWidth, setWindowWidth] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth : 1280)
  )
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const { imagenUrl, hydrate, hydrated } = useStore()
  const isMobile = windowWidth < 768
  const sidebarWidth = isMobile ? Math.min(Math.round(windowWidth * 0.82), 280) : 240

  useEffect(() => {
    hydrate()
  }, [])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('xprin-theme', theme)
  }, [theme])

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (isMobile) setShowSidebar(false)
    if (!isMobile) setMobileMenuOpen(false)
  }, [isMobile])

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base text-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
          <p className="text-lg font-medium">Recuperando sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-base text-primary font-inter">
      <Header
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
        toggleMobileMenu={() => setMobileMenuOpen((v) => !v)}
      />
      <div className="relative flex flex-1 overflow-hidden">
        {imagenUrl && !isMobile && (
          <div
            className="relative h-full shrink-0 transition-[width] duration-300 ease-out"
            style={{ width: showSidebar ? sidebarWidth : 0 }}
          >
            <div className={`absolute inset-y-0 left-0 transition-transform duration-300 ease-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
              <Sidebar />
            </div>
          </div>
        )}

        {imagenUrl && isMobile && (
          <>
            {showSidebar && (
              <button
                className="absolute inset-0 z-20 bg-black/35"
                onClick={() => setShowSidebar(false)}
                aria-label="Cerrar panel de capas"
              />
            )}
            <div
              className={`absolute inset-y-0 left-0 z-30 transition-transform duration-300 ease-out ${showSidebar ? 'translate-x-0' : '-translate-x-full'
                }`}
              style={{ width: sidebarWidth }}
            >
              <Sidebar />
            </div>
          </>
        )}

        {imagenUrl && (
          <button
            onClick={() => setShowSidebar((v) => !v)}
            style={{
              top: isMobile ? 'calc(50% - 30px)' : '50%',
              left: showSidebar ? sidebarWidth + (isMobile ? 8 : 12) : (isMobile ? 10 : 14),
              transform: 'translateY(-50%)',
            }}
            className={`group absolute top-1/2 z-30 rounded-full
              border border-border-strong/65 bg-surface/95 backdrop-blur
              text-secondary shadow-[0_8px_22px_rgba(0,0,0,0.16)]
              transition-[left,box-shadow,background-color,color,transform] duration-300 ease-out
              hover:text-primary hover:bg-surface-elevated hover:shadow-[0_12px_26px_rgba(0,0,0,0.2)] hover:scale-[1.02]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35
              ${isMobile ? 'h-12 w-8' : 'h-16 w-10'}`}
            title={showSidebar ? 'Ocultar panel' : 'Mostrar panel'}
          >
            <span className="flex h-full w-full items-center justify-center">
              {showSidebar
                ? <ChevronLeft size={isMobile ? 14 : 16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
                : <ChevronRight size={isMobile ? 14 : 16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              }
            </span>
          </button>
        )}
        <Canvas />
      </div>
    </div>
  )
}
