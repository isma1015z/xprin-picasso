import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// Importar media de fondo
import textureBg from '../assets/images/texture-200.png';
import videoprueba from '../assets/images/videoprueba.mp4';
import videoXp from '../assets/images/videoxp_6206.mp4';
import prueba2 from '../assets/images/prueba2.jpg';
import logoBlanco from '../assets/images/Logo_Blanco.png';
import logoColor from '../assets/images/Picsart_26-03-10_10-02-37-011.png';

export function Login() {
  const [authMethod, setAuthMethod] = useState('email'); // 'email' o 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [countryCode, setCountryCode] = useState('+34');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  const [rememberMe, setRememberMe] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Lista de prefijos comunes
  const countryCodes = [
    { code: '+34', name: 'ES' },
    { code: '+1', name: 'US' },
    { code: '+52', name: 'MX' },
    { code: '+54', name: 'AR' },
    { code: '+56', name: 'CL' },
    { code: '+57', name: 'CO' },
    { code: '+33', name: 'FR' },
    { code: '+44', name: 'UK' },
    { code: '+49', name: 'DE' },
  ];

  // FASE 1: Efecto carrusel para el fondo
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);

  // LÓGICA DE CARRUSEL MULTIMEDIA
  useEffect(() => {
    document.title = 'XPRIN - Acceso al Portal';

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

  // Manejador para Login con Email/Password
  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      handleSuccess();
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message);
      setLoading(false);
    }
  };

  // Manejador para enviar Código OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const fullPhone = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (otpError) throw otpError;
      setOtpSent(true);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Manejador para verificar Código OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const fullPhone = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpCode,
        type: 'sms',
      });

      if (verifyError) throw verifyError;
      handleSuccess();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setIsPrinting(true);
    setTimeout(() => {
      setLoading(false);
      navigate('/editor'); 
    }, 1500);
  };

  const handleRegisterClick = (e) => {
    e.preventDefault();
    setIsPrinting(true);
    setTimeout(() => {
      navigate('/registro');
    }, 1500);
  };

  return (
    <>
      {/* CAPA DE TRANSICIÓN "EFECTO IMPRESIÓN" */}
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
            <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-white leading-tight mb-2 drop-shadow-md">Soluciones de impresión de alta precisión.</h1>
            <p className="text-xl font-semibold text-brand-cyan mb-4 tracking-wide drop-shadow-md">Marcamos la diferencia</p>
            <p className="text-lg text-brand-gray max-w-md opacity-90 drop-shadow-md">Gestiona tus proyectos, revisa tus pedidos y accede a nuestra plataforma de producción centralizada.</p>
          </div>
        </div>

        {/* Sección Derecha */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 bg-brand-white/90 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-10 relative border-l border-brand-white/20">
          <div className="mx-auto w-full max-w-sm lg:max-w-md animate-fade-in-up">
            <div onClick={() => { setIsPrinting(true); setTimeout(() => navigate('/'), 1500); }} className="flex lg:hidden items-center mb-8 group cursor-pointer">
              <img src={logoColor} alt="XPRIN Logo" className="h-10 w-auto object-contain group-hover:scale-105 transition-transform" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-dark mt-2 lg:mt-0 mb-1 leading-none">Acceso al portal</h2>
            <p className="text-xs sm:text-sm text-brand-carbon/60 font-medium mb-6">Tu portal exclusivo para la gestión de proyectos de impresión.</p>

            {/* SWITCHER */}
            <div className="flex bg-brand-gray/20 p-1 rounded-sm mb-8 relative">
              <button
                onClick={() => { setAuthMethod('email'); setError(null); }}
                className={`flex-1 py-2 text-[10px] font-black tracking-[0.2em] transition-all duration-300 z-10 ${authMethod === 'email' ? 'text-brand-white' : 'text-brand-carbon/40 hover:text-brand-carbon/70'}`}
              >EMAIL</button>
              <button
                onClick={() => { setAuthMethod('phone'); setError(null); setOtpSent(false); }}
                className={`flex-1 py-2 text-[10px] font-black tracking-[0.2em] transition-all duration-300 z-10 ${authMethod === 'phone' ? 'text-brand-white' : 'text-brand-carbon/40 hover:text-brand-carbon/70'}`}
              >TELÉFONO</button>
              <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-brand-red rounded-sm transition-transform duration-300 ease-out shadow-lg shadow-brand-red/20 ${authMethod === 'email' ? 'translate-x-0' : 'translate-x-full'}`}></div>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-brand-red/10 border-l-4 border-brand-red text-brand-red text-xs font-bold rounded-sm animate-fade-in-up">{error}</div>
            )}

            {authMethod === 'email' ? (
              <form className="space-y-6" onSubmit={handleSubmitEmail}>
                <div className="group">
                  <label htmlFor="email" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Correo electrónico profesional</label>
                  <div className="relative">
                    <input id="email" type="email" required placeholder="ejemplo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-4 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none text-sm leading-6" />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                  </div>
                </div>

                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest transition-colors group-focus-within:text-brand-red">Contraseña</label>
                    <div className="text-xs">
                      <Link to="/recuperar" onClick={(e) => { e.preventDefault(); setIsPrinting(true); setTimeout(() => navigate('/recuperar'), 1500); }} className="font-bold text-brand-cyan hover:text-brand-red transition-colors uppercase tracking-tighter">¿Olvidaste tu contraseña?</Link>
                    </div>
                  </div>
                  <div className="relative">
                    <input id="password" type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-4 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none text-sm leading-6" />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-brand-gray/50 text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red" />
                  <label htmlFor="remember-me" className="text-xs font-bold text-brand-carbon/60 uppercase tracking-tighter cursor-pointer select-none">Mantener sesión iniciada</label>
                </div>

                <button type="submit" disabled={loading} className={`group relative flex w-full justify-center rounded-sm bg-brand-red px-3 py-4 text-sm font-bold text-brand-white shadow-xl shadow-brand-red/20 overflow-hidden outline-none transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}>
                  <span className="relative z-10 tracking-[0.2em]">{loading ? 'ACCEDIENDO...' : 'ACCEDER A LA PLATAFORMA'}</span>
                  {!loading && <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-25deg] -translate-x-full group-hover:animate-shimmer"></div>}
                </button>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
                {!otpSent ? (
                  <div className="group animate-fade-in-up">
                    <label htmlFor="phone" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Número de teléfono móvil</label>
                    <div className="flex gap-2">
                      <div className="relative w-28">
                        <select 
                          value={countryCode} 
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-4 px-3 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none text-sm appearance-none cursor-pointer font-bold"
                        >
                          {countryCodes.map((c) => (
                            <option key={c.code} value={c.code}>{c.name} {c.code}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-brand-carbon/40">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                      <div className="relative flex-1">
                        <input id="phone" type="tel" required placeholder="600 000 000" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-4 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none text-sm leading-6" />
                        <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group animate-fade-in-up">
                    <label htmlFor="otp" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">Código de verificación (Enviado a {countryCode} {phoneNumber})</label>
                    <div className="relative">
                      <input id="otp" type="text" maxLength="6" required placeholder="000000" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-4 px-4 text-center text-2xl font-black tracking-[0.5em] text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-200 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none" />
                      <div className="absolute bottom-0 left-0 h-1 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} className={`group relative flex w-full justify-center rounded-sm bg-brand-red px-3 py-4 text-sm font-bold text-brand-white shadow-xl shadow-brand-red/20 overflow-hidden outline-none transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}>
                  <span className="relative z-10 tracking-[0.2em]">{loading ? 'PROCESANDO...' : (otpSent ? 'VERIFICAR Y ACCEDER' : 'ENVIAR CÓDIGO')}</span>
                  {!loading && <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-25deg] -translate-x-full group-hover:animate-shimmer"></div>}
                </button>
              </form>
            )}

            <div className="mt-10 text-center text-sm text-brand-carbon opacity-80">
              ¿No tienes cuenta corporativa?{' '}
              <a href="/registro" onClick={handleRegisterClick} className="font-semibold leading-6 text-brand-cyan hover:opacity-80 transition-colors">Solicita acceso aquí</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
