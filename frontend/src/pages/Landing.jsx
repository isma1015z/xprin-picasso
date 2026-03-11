import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Landing() {
  const [isPrinting, setIsPrinting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'XPRIN - Soluciones de Impresión';
  }, []);

  const handleNavigate = (path) => {
    setIsPrinting(true);
    setTimeout(() => {
      navigate(path);
    }, 1500);
  };

  return (
    <div className="relative min-h-screen bg-brand-dark overflow-hidden font-['Montserrat',sans-serif]">
      {/* CAPA DE TRANSICIÓN "EFECTO IMPRESIÓN" */}
      <div
        className={`fixed inset-0 z-50 bg-brand-white pointer-events-none flex flex-col items-center justify-center transition-transform duration-[1500ms] ease-in-out ${isPrinting ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-cyan shadow-[0_0_20px_#0085C8] animate-pulse"></div>
        <div className="w-16 h-16 border-4 border-brand-red border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-2xl font-bold text-brand-dark tracking-[0.2em]">
          PREPARANDO SOPORTE...
        </h2>
      </div>

      <div className={`flex flex-col items-center justify-center min-h-screen text-center transition-opacity duration-1000 ${isPrinting ? 'opacity-0' : 'opacity-100'}`}>
        {/* FONDO CON PROFUNDIDAD */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0a0a0a_100%)] pointer-events-none"></div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#E41C24_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none"></div>

        {/* LOGO CON ANIMACIÓN DE ENTRADA */}
        <div className="relative z-10 animate-fade-in-up px-6">
          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black text-brand-white tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            XPRIN<span className="text-brand-red animate-pulse">.</span>
          </h1>
          <p className="text-lg sm:text-xl font-medium text-brand-gray tracking-[0.2em] sm:tracking-[0.4em] mb-12 uppercase opacity-80 max-w-2xl mx-auto leading-relaxed">
            Soluciones de Impresión <br className="hidden sm:block" /> de Alta Precisión
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-4 sm:gap-8 relative z-10 w-full max-w-xs sm:max-w-none px-6">
          <button
            onClick={() => handleNavigate('/login')}
            className="group relative px-6 py-4 sm:px-10 sm:py-4 bg-brand-red text-white font-bold rounded-sm overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(228,28,36,0.3)] hover:shadow-[0_0_30px_rgba(228,28,36,0.5)] w-full sm:w-auto"
          >
            <span className="relative z-10">ACCEDER AL PORTAL</span>
            <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-25deg] -translate-x-full group-hover:animate-shimmer"></div>
          </button>

          <button
            onClick={() => handleNavigate('/registro')}
            className="group relative px-6 py-4 sm:px-10 sm:py-4 bg-transparent border border-brand-white/30 text-brand-white font-bold rounded-sm overflow-hidden transition-all duration-300 hover:border-brand-white hover:scale-105 active:scale-95 backdrop-blur-sm w-full sm:w-auto"
          >
            <span className="relative z-10 uppercase tracking-wider">Solicitar Acceso</span>
            <div className="absolute inset-0 bg-brand-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </div>

        <p className="absolute bottom-8 text-brand-gray text-[8px] sm:text-[10px] tracking-widest opacity-30 font-medium uppercase px-4 text-center">
          v1.0.4 Picasso Engine — Industrial Standard
        </p>
      </div>
    </div>
  );
}

