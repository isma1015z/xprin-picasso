import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Importar media de fondo
import textureBg from '../assets/images/texture-200.png';
import videoprueba from '../assets/images/videoprueba.mp4';
import videoXp from '../assets/images/videoxp_6206.mp4';
import prueba2 from '../assets/images/prueba2.jpg';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const navigate = useNavigate();

  // LÓGICA DE CARRUSEL MULTIMEDIA: Controla la secuencia de Textura -> Video 1 -> Video 2 -> Imagen
  useEffect(() => {
    document.title = 'XPRIN - Acceso al Portal';

    let timer;
    if (currentMediaIndex === 0) {
      // Fase 1: Textura inicial durante 3.5s para asentar la marca
      timer = setTimeout(() => {
        setCurrentMediaIndex(1);
      }, 3500);
    } else if (currentMediaIndex === 1) {
      // Fase 2: Arrancar Video 1 y esperar a que termine (onEnded)
      if (video1Ref.current) {
        video1Ref.current.currentTime = 0;
        video1Ref.current.play().catch(e => console.log('Autoplay prevented:', e));
      }
    } else if (currentMediaIndex === 2) {
      // Fase 3: Arrancar Video 2 y esperar a que termine (onEnded)
      if (video2Ref.current) {
        video2Ref.current.currentTime = 0;
        video2Ref.current.play().catch(e => console.log('Autoplay prevented:', e));
      }
    } else if (currentMediaIndex === 3) {
      // Fase 4: Imagen estática final durante 8s, luego reinicia el ciclo
      timer = setTimeout(() => {
        setCurrentMediaIndex(0);
      }, 8000);
    }

    return () => clearTimeout(timer);
  }, [currentMediaIndex]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();
    setIsPrinting(true);

    // Simula el tiempo de "impresión" antes de navegar
    setTimeout(() => {
      navigate('/registro');
    }, 1500); // 1.5s
  };

  return (
    <>
      {/* 
        CAPA DE TRANSICIÓN "EFECTO IMPRESIÓN"
        Simula una hoja que "baja" escaneando/imprimiendo
      */}
      <div
        className={`fixed inset-0 z-50 bg-brand-white pointer-events-none flex flex-col items-center justify-center transition-transform duration-[1500ms] ease-in-out ${isPrinting ? 'translate-y-0' : '-translate-y-full'
          }`}
      >
        <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-cyan shadow-[0_0_20px_#0085C8] animate-pulse"></div>
        <div className="w-16 h-16 border-4 border-brand-red border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-2xl font-bold text-brand-dark tracking-[0.2em]">
          PROCESANDO...
        </h2>
      </div>

      <div className={`flex min-h-screen bg-brand-white transition-opacity duration-700 ${isPrinting ? 'opacity-0' : 'opacity-100'}`}>
        {/* Sección Izquierda: Marca e Imagen (visible solo en pantallas medianas o mayores) */}
        <div
          className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden bg-brand-dark"
        >
          {/* Capas de Fondo Mixto (Textura + 2 Videos + Imagen Final) */}

          {/* Capa 0: Textura inicial */}
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 0 ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundImage: `url(${textureBg})`,
              backgroundSize: '600px',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              imageRendering: 'pixelated'
            }}
          />

          {/* Capa 1: Video 1 (videoprueba) */}
          <video
            ref={video1Ref}
            muted
            playsInline
            onEnded={() => setCurrentMediaIndex(2)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 1 ? 'opacity-100' : 'opacity-0'}`}
            src={videoprueba}
          />

          {/* Capa 2: Video 2 (videoxp_6206) */}
          <video
            ref={video2Ref}
            muted
            playsInline
            onEnded={() => setCurrentMediaIndex(3)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 2 ? 'opacity-100' : 'opacity-0'}`}
            src={videoXp}
          />

          {/* Capa 3: Imagen estática 1 (prueba2) */}
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 3 ? 'opacity-100' : 'opacity-0'}`}
            style={{
              backgroundImage: `url(${prueba2})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />

          {/* Overlay oscuro suave */}
          <div className="absolute inset-0 bg-brand-dark opacity-10"></div>

          {/* Decoración geométrica o patrón sutil alusivo a impresión (solo en Textura) */}
          <div className={`absolute inset-0 bg-[radial-gradient(#E41C24_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 0 ? 'opacity-20' : 'opacity-0'}`}></div>

          <div className="relative z-10 p-12">
            {/* Logo Placeholder - Now triggers printing transition back to home */}
            <div
              onClick={() => {
                setIsPrinting(true);
                setTimeout(() => navigate('/'), 1500);
              }}
              className="inline-flex items-center gap-3 group hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div className="w-10 h-10 bg-brand-red rounded-sm flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-brand-white font-bold text-xl">X</span>
              </div>
              <span className="text-2xl font-black text-brand-white tracking-tight drop-shadow-md">XPRIN</span>
            </div>
          </div>

          <div className="relative z-10 p-12 mt-auto">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-white leading-tight mb-2 drop-shadow-md">
              Soluciones de impresión de alta precisión.
            </h1>
            <p className="text-xl font-semibold text-brand-cyan mb-4 tracking-wide drop-shadow-md">
              Marcamos la diferencia
            </p>
            <p className="text-lg text-brand-gray max-w-md opacity-90 drop-shadow-md">
              Gestiona tus proyectos, revisa tus pedidos y accede a nuestra plataforma de producción centralizada.
            </p>
          </div>
        </div>

        {/* COLUMNA DERECHA: SECCIÓN DE ACCESO CON GLASSMORPHISM (Premium Look) */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 bg-brand-white/90 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-10 relative border-l border-brand-white/20">
          <div className="mx-auto w-full max-w-sm lg:max-w-md animate-fade-in-up">
            {/* Logo para dispositivos móviles (oculto en escritorio) */}
            <div
              onClick={() => {
                setIsPrinting(true);
                setTimeout(() => navigate('/'), 1500);
              }}
              className="flex lg:hidden items-center gap-3 mb-8 group cursor-pointer"
            >
              <div className="w-10 h-10 bg-brand-red rounded-sm flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-brand-red/20">
                <span className="text-brand-white font-bold text-xl">X</span>
              </div>
              <span className="text-2xl font-black text-brand-dark tracking-tight">XPRIN</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-dark mt-2 lg:mt-0 mb-1">
              Acceso al portal
            </h2>
            <p className="text-xs sm:text-sm text-brand-carbon/60 font-medium mb-8 sm:mb-10">
              Credenciales corporativas de alta seguridad
            </p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Form Group para Email con subrayado animado al hacer focus */}
              <div className="group">
                <label htmlFor="email" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">
                  Correo electrónico profesional
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="ejemplo@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-3.5 sm:py-4 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none text-sm sm:leading-6"
                  />
                  {/* Línea decorativa que se expande al enfocar el campo */}
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>

              {/* Form Group para Contraseña con recuperación de acceso */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest transition-colors group-focus-within:text-brand-red">
                    Contraseña
                  </label>
                  <div className="text-xs">
                    <a href="#" className="font-bold text-brand-cyan hover:text-brand-red transition-colors uppercase tracking-tighter">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-3.5 sm:py-4 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none text-sm sm:leading-6"
                  />
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>

              {/* Opciones de sesión persistente */}
              <div className="flex items-center gap-2 py-2">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-brand-gray/50 text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red"
                />
                <label htmlFor="remember-me" className="text-xs font-bold text-brand-carbon/60 uppercase tracking-tighter cursor-pointer select-none">
                  Mantener sesión iniciada
                </label>
              </div>

              {/* Botón Principal con Efecto Shimmer (Brillo recorriendo el fondo) */}
              <button
                type="submit"
                className="group relative flex w-full justify-center rounded-sm bg-brand-red px-3 py-4 text-sm font-bold text-brand-white shadow-xl shadow-brand-red/20 overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] outline-none"
              >
                <span className="relative z-10 tracking-widest">ACCEDER A LA PLATAFORMA</span>
                <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-25deg] -translate-x-full group-hover:animate-shimmer"></div>
              </button>
            </form>

            <div className="mt-10 text-center text-sm text-brand-carbon opacity-80">
              ¿No tienes cuenta corporativa?{' '}
              <a
                href="/registro"
                onClick={handleRegisterClick}
                className="font-semibold leading-6 text-brand-cyan hover:opacity-80 transition-colors"
              >
                Solicita acceso aquí
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
