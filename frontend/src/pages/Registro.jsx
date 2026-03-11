// Registro — XPRIN-Picasso
// Responsable: Carlos
// Supabase auth conectado

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

import textureBg   from '../assets/images/texture-200.png';
import videoprueba from '../assets/images/videoprueba.mp4';
import videoXp     from '../assets/images/videoxp_6206.mp4';
import prueba2     from '../assets/images/prueba2.jpg';

export function Registro() {
  const [formData, setFormData] = useState({
    fullName:        '',
    email:           '',
    company:         '',
    password:        '',
    confirmPassword: '',
  });
  const [error,      setError]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);

  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const navigate  = useNavigate();

  useEffect(() => {
    document.title = 'XPRIN - Registro Corporativo';
    let timer;
    if (mediaIndex === 0) {
      timer = setTimeout(() => setMediaIndex(1), 3500);
    } else if (mediaIndex === 1) {
      video1Ref.current?.play().catch(() => {});
    } else if (mediaIndex === 2) {
      video2Ref.current?.play().catch(() => {});
    } else if (mediaIndex === 3) {
      timer = setTimeout(() => setMediaIndex(0), 8000);
    }
    return () => clearTimeout(timer);
  }, [mediaIndex]);

  const navPrint = (path) => {
    setIsPrinting(true);
    setTimeout(() => navigate(path), 1500);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email:    formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company:   formData.company,
          },
        },
      });
      if (authError) throw authError;
      navPrint('/login');
    } catch (err) {
      setError(err.message ?? 'Error al registrar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'block w-full bg-brand-white rounded-sm py-3.5 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/50 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 transition-all outline-none sm:text-sm';

  return (
    <>
      {/* Overlay de transición */}
      <div className={`fixed inset-0 z-50 bg-brand-white pointer-events-none flex flex-col items-center justify-center transition-transform duration-[1500ms] ease-in-out ${isPrinting ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-cyan shadow-[0_0_20px_#0085C8] animate-pulse" />
        <div className="w-16 h-16 border-4 border-brand-red border-t-transparent rounded-full animate-spin mb-8" />
        <h2 className="text-2xl font-bold text-brand-dark tracking-[0.2em]">PROCESANDO...</h2>
      </div>

      <div className={`flex min-h-screen bg-brand-white transition-opacity duration-700 ${isPrinting ? 'opacity-0' : 'opacity-100'}`}>

        {/* ── Columna izquierda: carrusel multimedia ── */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden bg-brand-dark">
          <div className={`absolute inset-0 transition-opacity duration-1000 ${mediaIndex === 0 ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${textureBg})`, backgroundSize: '600px', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', imageRendering: 'pixelated' }}
          />
          <video ref={video1Ref} muted playsInline onEnded={() => setMediaIndex(2)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${mediaIndex === 1 ? 'opacity-100' : 'opacity-0'}`}
            src={videoprueba}
          />
          <video ref={video2Ref} muted playsInline onEnded={() => setMediaIndex(3)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${mediaIndex === 2 ? 'opacity-100' : 'opacity-0'}`}
            src={videoXp}
          />
          <div className={`absolute inset-0 transition-opacity duration-1000 ${mediaIndex === 3 ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${prueba2})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          <div className="absolute inset-0 bg-brand-dark opacity-10" />
          <div className={`absolute inset-0 bg-[radial-gradient(#E41C24_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none transition-opacity duration-1000 ${mediaIndex === 0 ? 'opacity-20' : 'opacity-0'}`} />

          <div className="relative z-10 p-12">
            <div onClick={() => navPrint('/')} className="inline-flex items-center gap-3 group hover:opacity-90 transition-opacity cursor-pointer">
              <div className="w-10 h-10 bg-brand-red rounded-sm flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-brand-white font-bold text-xl">X</span>
              </div>
              <span className="text-2xl font-black text-brand-white tracking-tight drop-shadow-md">XPRIN</span>
            </div>
          </div>

          <div className="relative z-10 p-12 mt-auto">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-white leading-tight mb-2 drop-shadow-md">
              Únete a la red de impresión más avanzada.
            </h1>
            <p className="text-xl font-semibold text-brand-cyan mb-4 tracking-wide drop-shadow-md">Marcamos la diferencia</p>
            <p className="text-lg text-brand-gray max-w-md opacity-90 drop-shadow-md">
              Crea tu perfil corporativo y empieza a gestionar tus pedidos con precisión industrial.
            </p>
          </div>
        </div>

        {/* ── Columna derecha: formulario ── */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 bg-brand-white/90 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-10 relative border-l border-brand-white/20 overflow-y-auto">
          <div className="mx-auto w-full max-w-sm lg:max-w-md animate-fade-in-up py-8">

            {/* Logo móvil */}
            <div onClick={() => navPrint('/')} className="flex lg:hidden items-center gap-3 mb-8 group cursor-pointer">
              <div className="w-10 h-10 bg-brand-red rounded-sm flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-brand-red/20">
                <span className="text-brand-white font-bold text-xl">X</span>
              </div>
              <span className="text-2xl font-black text-brand-dark tracking-tight">XPRIN</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-dark mt-3 lg:mt-0 mb-1">
              Crea tu cuenta corporativa
            </h2>
            <p className="text-xs sm:text-sm text-brand-carbon/60 font-medium mb-8 sm:mb-10">
              Solicitud de acceso a producción
            </p>

            <form className="space-y-5" onSubmit={handleSubmit}>

              {/* Error global */}
              {error && (
                <div className="rounded-sm bg-brand-red/10 border border-brand-red/30 px-4 py-3 text-sm text-brand-red font-medium">
                  {error}
                </div>
              )}

              {/* Nombre */}
              <div className="group">
                <label htmlFor="fullName" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Nombre completo</label>
                <div className="relative">
                  <input id="fullName" name="fullName" type="text" required placeholder="Juan Pérez"
                    value={formData.fullName} onChange={handleChange} className={inputClass} />
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500" />
                </div>
              </div>

              {/* Email */}
              <div className="group">
                <label htmlFor="email" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Correo electrónico profesional</label>
                <div className="relative">
                  <input id="email" name="email" type="email" required placeholder="juan.perez@empresa.com"
                    value={formData.email} onChange={handleChange} className={inputClass} />
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500" />
                </div>
              </div>

              {/* Empresa */}
              <div className="group">
                <label htmlFor="company" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Empresa / Organización</label>
                <div className="relative">
                  <input id="company" name="company" type="text" required placeholder="XPRIN Solutions"
                    value={formData.company} onChange={handleChange} className={inputClass} />
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500" />
                </div>
              </div>

              {/* Contraseñas */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="group">
                  <label htmlFor="password" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Contraseña</label>
                  <div className="relative">
                    <input id="password" name="password" type="password" required placeholder="••••••••"
                      value={formData.password} onChange={handleChange} className={inputClass} />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500" />
                  </div>
                </div>
                <div className="group">
                  <label htmlFor="confirmPassword" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Confirmar</label>
                  <div className="relative">
                    <input id="confirmPassword" name="confirmPassword" type="password" required placeholder="••••••••"
                      value={formData.confirmPassword} onChange={handleChange} className={inputClass} />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500" />
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2">
                <button type="submit" disabled={loading}
                  className="group relative flex w-full justify-center items-center gap-3 rounded-sm bg-brand-red px-4 py-4 text-xs font-black text-brand-white shadow-xl shadow-brand-red/20 overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] outline-none tracking-[0.2em] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10">{loading ? 'CREANDO CUENTA...' : 'CREAR CUENTA CORPORATIVA'}</span>
                  <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-25deg] -translate-x-full group-hover:animate-shimmer" />
                </button>
              </div>
            </form>

            <div className="mt-10 text-center text-sm text-brand-carbon opacity-80">
              ¿Ya eres miembro?{' '}
              <button onClick={() => navPrint('/login')} className="font-semibold text-brand-cyan hover:opacity-80 transition-colors">
                Inicia sesión aquí
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
