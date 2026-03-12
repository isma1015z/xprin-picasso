import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Importar media de fondo
import textureBg from '../assets/images/texture-200.png';
import videoprueba from '../assets/images/videoprueba.mp4';
import videoXp from '../assets/images/videoxp_6206.mp4';
import prueba2 from '../assets/images/prueba2.jpg';
import logoBlanco from '../assets/images/Logo_Blanco.png';
import logoColor from '../assets/images/Picsart_26-03-10_10-02-37-011.png';
import { supabase } from '../lib/supabase';

export function RecuperarContrasena() {
  const [email, setEmail] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const navigate = useNavigate();

  // LÓGICA DE CARRUSEL MULTIMEDIA
  useEffect(() => {
    document.title = 'XPRIN - Recuperar Acceso';

    let timer;
    if (currentMediaIndex === 0) {
      timer = setTimeout(() => {
        setCurrentMediaIndex(1);
      }, 3500);
    } else if (currentMediaIndex === 1) {
      if (video1Ref.current) {
        video1Ref.current.currentTime = 0;
        video1Ref.current.play().catch(e => console.log('Autoplay prevented:', e));
      }
    } else if (currentMediaIndex === 2) {
      if (video2Ref.current) {
        video2Ref.current.currentTime = 0;
        video2Ref.current.play().catch(e => console.log('Autoplay prevented:', e));
      }
    } else if (currentMediaIndex === 3) {
      timer = setTimeout(() => {
        setCurrentMediaIndex(0);
      }, 8000);
    }

    return () => clearTimeout(timer);
  }, [currentMediaIndex]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Obtener la URL base dinámicamente para la redirección
      const redirectTo = `${window.location.origin}/actualizar-contrasena`;
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo,
      });

      if (resetError) throw resetError;
      
      setSuccess(true);
      setLoading(false);

    } catch (err) {
      console.error('Error enviando correo de recuperación:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-brand-white pointer-events-none flex flex-col items-center justify-center transition-transform duration-[1500ms] ease-in-out ${isPrinting ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-cyan shadow-[0_0_20px_#0085C8] animate-pulse"></div>
        <div className="w-16 h-16 border-4 border-brand-red border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 className="text-2xl font-bold text-brand-dark tracking-[0.2em]">PROCESANDO...</h2>
      </div>

      <div className={`flex min-h-screen bg-brand-white transition-opacity duration-700 ${isPrinting ? 'opacity-0' : 'opacity-100'}`}>
        {/* Sección Izquierda */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden bg-brand-dark">
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 0 ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${textureBg})`, backgroundSize: '600px', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', imageRendering: 'pixelated' }}
          />
          <video ref={video1Ref} muted playsInline onEnded={() => setCurrentMediaIndex(2)} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 1 ? 'opacity-100' : 'opacity-0'}`} src={videoprueba} />
          <video ref={video2Ref} muted playsInline onEnded={() => setCurrentMediaIndex(3)} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 2 ? 'opacity-100' : 'opacity-0'}`} src={videoXp} />
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 3 ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url(${prueba2})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
          />
          <div className="absolute inset-0 bg-brand-dark opacity-10"></div>
          <div className={`absolute inset-0 bg-[radial-gradient(#E41C24_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 0 ? 'opacity-20' : 'opacity-0'}`}></div>

          <div className="relative z-10 p-12">
            <div onClick={() => { setIsPrinting(true); setTimeout(() => navigate('/'), 1500); }} className="inline-flex items-center group hover:opacity-90 transition-opacity cursor-pointer">
              <img src={logoBlanco} alt="XPRIN Logo" className="h-12 w-auto object-contain group-hover:scale-105 transition-transform" />
            </div>
          </div>

          <div className="relative z-10 p-12 mt-auto">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-white leading-tight mb-2 drop-shadow-md">Recupera tu acceso corporativo.</h1>
            <p className="text-xl font-semibold text-brand-red mb-4 tracking-wide drop-shadow-md">Marcamos la diferencia</p>
            <p className="text-lg text-brand-gray max-w-md opacity-90 drop-shadow-md">Introduce tu email para recibir un enlace de recuperación seguro.</p>
          </div>
        </div>

        {/* Sección Derecha */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 bg-brand-white/90 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-10 relative border-l border-brand-white/20">
          <div className="mx-auto w-full max-w-sm lg:max-w-md animate-fade-in-up">
            <div onClick={() => { setIsPrinting(true); setTimeout(() => navigate('/'), 1500); }} className="flex lg:hidden items-center mb-8 group cursor-pointer">
              <img src={logoColor} alt="XPRIN Logo" className="h-10 w-auto object-contain group-hover:scale-105 transition-transform" />
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-brand-cyan/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-brand-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h2 className="text-3xl font-black text-brand-dark mb-4">📧 Verifica tu correo</h2>
                <p className="text-brand-carbon/60 font-medium mb-10 leading-relaxed">
                  Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
                </p>
                <button 
                  onClick={() => { setIsPrinting(true); setTimeout(() => navigate('/login'), 1500); }}
                  className="group relative flex w-full justify-center rounded-sm bg-brand-dark px-3 py-4 text-sm font-bold text-brand-white shadow-xl overflow-hidden outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="relative z-10 tracking-[0.2em]">VOLVER AL LOGIN</span>
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-dark mt-2 lg:mt-0 mb-1 leading-none">Recuperar acceso</h2>
                <p className="text-xs sm:text-sm text-brand-carbon/60 font-medium mb-8 sm:mb-10">Recibe un enlace seguro en tu bandeja de entrada</p>

                {error && (
                  <div className="mb-6 p-3 bg-brand-red/10 border-l-4 border-brand-red text-brand-red text-xs font-bold rounded-sm animate-fade-in-up">{error}</div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="group">
                    <label htmlFor="email" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Correo electrónico profesional</label>
                    <div className="relative">
                      <input id="email" type="email" required placeholder="ejemplo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-4 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none text-sm sm:leading-6" />
                      <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className={`group relative flex w-full justify-center rounded-sm bg-brand-red px-3 py-4 text-sm font-bold text-brand-white shadow-xl shadow-brand-red/20 overflow-hidden outline-none transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}>
                    <span className="relative z-10 tracking-widest">{loading ? 'ENVIANDO...' : 'ENVIAR ENLACE DE RECUPERACIÓN'}</span>
                    {!loading && <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-25deg] -translate-x-full group-hover:animate-shimmer"></div>}
                  </button>
                </form>

                <div className="mt-10 text-center text-sm text-brand-carbon opacity-80">
                  ¿Recordaste tu contraseña?{' '}
                  <Link to="/login" onClick={(e) => { e.preventDefault(); setIsPrinting(true); setTimeout(() => navigate('/login'), 1500); }} className="font-semibold leading-6 text-brand-cyan hover:opacity-80 transition-colors uppercase tracking-widest text-[10px]">Volver al acceso</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
