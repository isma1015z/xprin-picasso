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

export function ActualizarContrasena() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Muy débil', color: 'bg-brand-red' });
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const navigate = useNavigate();

  // VALIDACIÓN DE FUERZA DE CONTRASEÑA
  useEffect(() => {
    const calculateStrength = (pass) => {
      let score = 0;
      if (pass.length === 0) return { score: 0, label: 'Obligatoria', color: 'bg-brand-gray/20' };
      if (pass.length >= 8) score++;
      if (/[0-9]/.test(pass)) score++;
      if (/[A-Z]/.test(pass)) score++;
      if (/[^A-Za-z0-9]/.test(pass)) score++;

      switch (score) {
        case 0: return { score: 10, label: 'Insegura', color: 'bg-brand-red' };
        case 1: return { score: 25, label: 'Débil', color: 'bg-orange-500' };
        case 2: return { score: 50, label: 'Media', color: 'bg-yellow-500' };
        case 3: return { score: 75, label: 'Fuerte', color: 'bg-brand-cyan' };
        case 4: return { score: 100, label: 'Excelente', color: 'bg-green-500' };
        default: return { score: 0, label: 'Muy débil', color: 'bg-brand-red' };
      }
    };
    setPasswordStrength(calculateStrength(newPassword));
  }, [newPassword]);

  // VERIFICACIÓN DE SESIÓN (Debe venir de un enlace de recuperación)
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("⚠️ ACCESO DENEGADO: No se ha detectado una sesión de recuperación válida. Por favor, utiliza el enlace enviado a tu correo o solicita uno nuevo.");
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
      setCheckingSession(false);
    }
    
    checkSession();
  }, []);

  // LÓGICA DE CARRUSEL MULTIMEDIA
  useEffect(() => {
    document.title = 'XPRIN - Actualizar Contraseña';

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
    
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (passwordStrength.score < 50) {
      setError("La contraseña es demasiado débil. Debe tener al menos 8 caracteres e incluir números.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;
      
      // Activa la transición a blanco
      setIsPrinting(true);
      
      // Redirecciona tras la animación
      setTimeout(() => {
        setLoading(false);
        navigate('/login');
      }, 1500);

    } catch (err) {
      console.error('Error actualizando contraseña:', err.message);
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
        <h2 className="text-2xl font-bold text-brand-dark tracking-[0.2em]">ACTUALIZANDO...</h2>
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
            <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-white leading-tight mb-2 drop-shadow-md">Establece tu nueva seguridad.</h1>
            <p className="text-xl font-semibold text-brand-cyan mb-4 tracking-wide drop-shadow-md">Acceso de alta precisión</p>
            <p className="text-lg text-brand-gray max-w-md opacity-90 drop-shadow-md">Introduce una contraseña fuerte para proteger tu cuenta corporativa.</p>
          </div>
        </div>

        {/* Sección Derecha */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 bg-brand-white/90 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-10 relative border-l border-brand-white/20">
          <div className="mx-auto w-full max-w-sm lg:max-w-md animate-fade-in-up">
            <div onClick={() => { setIsPrinting(true); setTimeout(() => navigate('/'), 1500); }} className="flex lg:hidden items-center mb-8 group cursor-pointer">
              <img src={logoColor} alt="XPRIN Logo" className="h-10 w-auto object-contain group-hover:scale-105 transition-transform" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-dark mt-2 lg:mt-0 mb-1 leading-none">Nueva contraseña</h2>
            <p className="text-xs sm:text-sm text-brand-carbon/60 font-medium mb-8 sm:mb-10">Completa el proceso de recuperación de forma segura</p>

            {error && (
              <div className="mb-6 p-4 bg-brand-red/10 border-l-4 border-brand-red text-brand-red text-xs font-bold rounded-sm animate-fade-in-up leading-relaxed">
                {error}
              </div>
            )}

            {!isAuthorized && !checkingSession ? (
              <div className="mt-8">
                 <button 
                  onClick={() => { setIsPrinting(true); setTimeout(() => navigate('/recuperar'), 1500); }}
                  className="group relative flex w-full justify-center rounded-sm bg-brand-dark px-3 py-4 text-sm font-bold text-brand-white shadow-xl overflow-hidden outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="relative z-10 tracking-[0.2em]">SOLICITAR NUEVO CORREO</span>
                </button>
              </div>
            ) : checkingSession ? (
              <div className="py-10 text-center">
                <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-xs font-bold text-brand-carbon/40 tracking-widest uppercase">Verificando sesión...</p>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="group">
                  <label htmlFor="newPassword" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Nueva Contraseña</label>
                  <div className="relative">
                    <input id="newPassword" type="password" required placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-4 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none text-sm sm:leading-6" />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                  </div>
                  
                  {/* MEDIDOR DE FUERZA */}
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] uppercase font-bold tracking-tighter opacity-40">Seguridad:</span>
                      <span className={`text-[10px] uppercase font-black tracking-widest ${passwordStrength.color.replace('bg-', 'text-')}`}>{passwordStrength.label}</span>
                    </div>
                    <div className="h-1 w-full bg-brand-gray/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-700 ease-out ${passwordStrength.color}`} 
                        style={{ width: `${passwordStrength.score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="confirmPassword" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Confirmar Contraseña</label>
                  <div className="relative">
                    <input id="confirmPassword" type="password" required placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-4 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none text-sm sm:leading-6" />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                  </div>
                </div>

                <button type="submit" disabled={loading} className={`group relative flex w-full justify-center rounded-sm bg-brand-red px-3 py-4 text-sm font-bold text-brand-white shadow-xl shadow-brand-red/20 overflow-hidden outline-none transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}>
                  <span className="relative z-10 tracking-widest">{loading ? 'ACTUALIZANDO...' : 'GUARDAR NUEVA CONTRASEÑA'}</span>
                  {!loading && <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-25deg] -translate-x-full group-hover:animate-shimmer"></div>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
