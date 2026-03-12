import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Importar media de fondo
import textureBg from '../assets/images/texture-200.png';
import videoprueba from '../assets/images/videoprueba.mp4';
import videoXp from '../assets/images/videoxp_6206.mp4';
import prueba2 from '../assets/images/prueba2.jpg';
import logoBlanco from '../assets/images/Logo_Blanco.png';
import logoColor from '../assets/images/Picsart_26-03-10_10-02-37-011.png';
import { supabase } from '../lib/supabase';
import { sha256 } from '../lib/security';

export function Registro() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'XPRIN - Registro Corporativo';

    let timer;
    if (currentMediaIndex === 0) {
      // Fase 1: Textura inicial durante 3.5s
      timer = setTimeout(() => {
        setCurrentMediaIndex(1);
      }, 3500);
    } else if (currentMediaIndex === 1) {
      // Fase 2: Arrancar Video 1
      if (video1Ref.current) {
        video1Ref.current.currentTime = 0;
        video1Ref.current.play().catch(e => console.log('Autoplay prevented:', e));
      }
    } else if (currentMediaIndex === 2) {
      // Fase 3: Arrancar Video 2
      if (video2Ref.current) {
        video2Ref.current.currentTime = 0;
        video2Ref.current.play().catch(e => console.log('Autoplay prevented:', e));
      }
    } else if (currentMediaIndex === 3) {
      // Fase 4: Imagen estática final durante 8s, luego reiniciamos el ciclo a textura
      timer = setTimeout(() => {
        setCurrentMediaIndex(0);
      }, 8000);
    }

    return () => clearTimeout(timer);
  }, [currentMediaIndex]);

  const handleLoginClick = (e) => {
    e.preventDefault();
    setIsPrinting(true);
    setTimeout(() => {
      navigate('/login');
    }, 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    
    setLoading(true);
    setError(null);

    console.log('Register attempt:', { fullName, email, password, company, phone, agreeTerms });

    try {
      // Generar validación SHA-256 de los datos sensibles de registro
      const validationString = `${fullName}|${email}|${company}|${phone}`;
      const dataValidationHash = await sha256(validationString);

      // Lógica real de Supabase con 2FA (Email & Phone)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        phone, // Activación de SMS 2FA (Requiere configuración en panel de Supabase)
        options: {
          data: {
            full_name: fullName,
            company: company,
            phone: phone,
            data_validation_hash: dataValidationHash // Validado vía SHA-256
          }
        }
      });

      if (signUpError) throw signUpError;
      
      console.log('Usuario registrado:', data);
      setIsPrinting(true);
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      console.error('Error durante el registro:', err.message);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      {/* CAPA DE TRANSICIÓN "EFECTO IMPRESIÓN" */}
      <div
        className={`fixed inset-0 z-50 bg-brand-white pointer-events-none flex flex-col items-center justify-center transition-transform duration-[1500ms] ease-in-out ${isPrinting ? 'translate-y-0' : '-translate-y-full'}`}
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

          {/* Decoración geométrica sutil (solo en Textura) */}
          <div className={`absolute inset-0 bg-[radial-gradient(#E41C24_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none transition-opacity duration-1000 ease-in-out ${currentMediaIndex === 0 ? 'opacity-20' : 'opacity-0'}`}></div>

          <div className="relative z-10 p-12">
            {/* Logo Clickable back to home with printing transition */}
            <div
              onClick={() => {
                setIsPrinting(true);
                setTimeout(() => navigate('/'), 1500);
              }}
              className="inline-flex items-center group hover:opacity-90 transition-opacity cursor-pointer bg-brand-dark/5 p-2 rounded-lg"
            >
              <img src={logoBlanco} alt="XPRIN Logo" className="h-12 w-auto object-contain group-hover:scale-105 transition-transform" />
            </div>
          </div>

          <div className="relative z-10 p-12 mt-auto">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-brand-white leading-tight mb-2 drop-shadow-md">
              Únete a la red de impresión más avanzada.
            </h1>
            <p className="text-xl font-semibold text-brand-cyan mb-4 tracking-wide drop-shadow-md">
              Marcamos la diferencia
            </p>
            <p className="text-lg text-brand-gray max-w-md opacity-90 drop-shadow-md">
              Crea tu perfil corporativo y empieza a gestionar tus pedidos con precisión industrial.
            </p>
          </div>
        </div>

        {/* Sección Derecha: Formulario de Registro */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 xl:px-32 bg-brand-white/90 backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-10 relative border-l border-brand-white/20 overflow-y-auto">
          <div className="mx-auto w-full max-w-sm lg:max-w-md animate-fade-in-up py-8">
            {/* Logo visible solo en móvil */}
            <Link
              to="/"
              onClick={(e) => {
                e.preventDefault();
                setIsPrinting(true);
                setTimeout(() => navigate('/'), 1500);
              }}
              className="flex lg:hidden items-center mb-8 group cursor-pointer"
            >
              <img src={logoColor} alt="XPRIN Logo" className="h-10 w-auto object-contain group-hover:scale-105 transition-transform" />
            </Link>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-dark mt-3 lg:mt-0 mb-1">
              Crea tu cuenta corporativa
            </h2>
            <p className="text-xs sm:text-sm text-brand-carbon/60 font-medium mb-8 sm:mb-10">
                Crea tu cuenta corporativa para empezar a solicitar pedidos.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-brand-red/10 border border-brand-red text-brand-red text-sm rounded">
                  {error}
                </div>
              )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="group">
                <label htmlFor="fullName" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">
                  Nombre completo
                </label>
                <div className="relative">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    placeholder="Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-3.5 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none sm:text-sm sm:leading-6"
                  />
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>

              <div className="group">
                <label htmlFor="email" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">
                  Correo electrónico profesional
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="juan.perez@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-3.5 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none sm:text-sm sm:leading-6"
                  />
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>

              <div className="group">
                <label htmlFor="phone" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">
                  Número de teléfono
                </label>
                <div className="relative">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+34 600 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-3.5 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none sm:text-sm sm:leading-6"
                  />
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>

              <div className="group">
                <label htmlFor="company" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">
                  Empresa / Organización
                </label>
                <div className="relative">
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    placeholder="XPRIN Solutions"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-3.5 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none sm:text-sm sm:leading-6"
                  />
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>

              <div className="group">
                <label htmlFor="address" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">
                  Dirección de la empresa (Calle)
                </label>
                <div className="relative">
                  <input
                    id="address"
                    name="address"
                    type="text"
                    required
                    placeholder="Calle de la Innovación, N° 45"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-3.5 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none sm:text-sm sm:leading-6"
                  />
                  <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                </div>
              </div>

              {/* GRID COORDINADO PARA CONTRASEÑAS CON DISEÑO PREMIUM */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="group">
                  <label htmlFor="password" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-3.5 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none sm:text-sm sm:leading-6"
                    />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                  </div>
                </div>
                <div className="group">
                  <label htmlFor="confirmPassword" className="block text-xs font-bold text-brand-carbon/60 uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-red">
                    Confirmar
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full bg-brand-white border-brand-gray/30 rounded-sm py-3.5 px-4 text-brand-dark shadow-sm ring-1 ring-inset ring-brand-gray/20 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-brand-red/50 focus:bg-white transition-all outline-none sm:text-sm sm:leading-6"
                    />
                    <div className="absolute bottom-0 left-0 h-0.5 bg-brand-red w-0 group-focus-within:w-full transition-all duration-500"></div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN DE PRODUCTO: SUSCRIPCIÓN (Diseño Minimalista Premium "XPRIN PRO") */}
              <div className="mt-8 pt-6 border-t border-brand-gray/20">
                {/* Tarjeta con Glassmorphism y Elevación Industrial */}
                <div className="bg-brand-white/50 backdrop-blur-sm rounded-xl p-6 border border-brand-gray/10 hover:border-brand-red/20 transition-all group/card shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
                    <div className="flex items-center gap-4">
                      {/* Logo X Circular con efecto Glow */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-brand-red flex items-center justify-center shadow-lg shadow-brand-red/30 group-hover/card:scale-110 transition-transform flex-shrink-0">
                        <span className="text-white font-black text-xl sm:text-2xl leading-none">X</span>
                      </div>
                      <div>
                        <h3 className="font-black text-brand-dark text-base sm:text-lg tracking-tight uppercase">XPRIN PRO</h3>
                        <p className="text-brand-carbon/40 text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">Industrial Standard Subscription</p>
                      </div>
                    </div>
                  </div>

                  {/* Listado de Beneficios con Checkmarks Corporativos */}
                  <ul className="space-y-3 mb-8 text-xs font-bold uppercase tracking-tight text-brand-carbon/70">
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-red/10 flex items-center justify-center">
                        <svg className="w-3 h-3 text-brand-red" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                      <span>Control avanzado <strong>Picasso Engine</strong></span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-red/10 flex items-center justify-center">
                        <svg className="w-3 h-3 text-brand-red" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                      <span>Flujos de producción ilimitados</span>
                    </li>
                  </ul>

                  {/* Botón CTA con Efecto Shimmer y Hover dinámico */}
                  <button
                type="submit"
                disabled={loading}
                className={`group relative flex w-full justify-center rounded-sm bg-brand-red px-3 py-4 text-sm font-bold text-brand-white shadow-xl shadow-brand-red/20 overflow-hidden outline-none transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
              >
                <span className="relative z-10 tracking-widest">
                  {loading ? 'SOLICITANDO ACCESO...' : 'SOLICITAR ACCESO'}
                </span>
                {!loading && <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-25deg] -translate-x-full group-hover:animate-shimmer"></div>}
              </button>
                </div>
              </div>

            </form>

            <div className="mt-10 text-center text-sm text-brand-carbon opacity-80">
              ¿Ya eres miembro?{' '}
              <Link
                to="/login"
                onClick={handleLoginClick}
                className="font-semibold leading-6 text-brand-cyan hover:opacity-80 transition-colors"
              >
                Inicia sesión aquí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
