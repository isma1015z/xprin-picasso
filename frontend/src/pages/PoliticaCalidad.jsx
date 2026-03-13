import { useNavigate } from 'react-router-dom';

export function PoliticaCalidad() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-black py-20 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="mb-8 text-red-600 font-bold uppercase tracking-widest hover:underline cursor-none">← Volver</button>
        <h1 className="text-4xl font-black uppercase mb-8">Política de Calidad</h1>
        <div className="space-y-6 text-zinc-700 leading-relaxed text-sm">
          <p>
            SDT persigue el objetivo de convertirse en el principal fabricante/importador de impresoras 
            en España, mejorando continuamente para alcanzar una mayor calidad en sus sistemas de 
            impresión mediante investigación, innovación y desarrollo de nuevos conceptos dirigidos al 
            campo de la impresión, proporcionando equipos fiables de alta calidad y rendimiento, además 
            de un servicio y soporte posventa directo. Se compromete a mantener todos los requisitos 
            legales y reglamentarios vigentes.
          </p>
          <p>
            El sistema de Gestión de calidad diseñado se basa en la norma ISO 9001, con un enfoque y 
            mentalidad hacia:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>La calidad en toda la organización en cada puesto de trabajo, de todos nuestros técnicos y empleados.</li>
            <li>Aumentar de manera progresiva el control y el servicio a clientes, asegurando el nivel de confianza adecuado en todos los procesos, garantizando la calidad total.</li>
            <li>Satisfacer las necesidades de nuestros clientes y el cumplimiento de todas las exigencias legales relacionadas con el medioambiente.</li>
            <li>Mejorar el aseguramiento de la Calidad en todos los trabajos, para brindar a los clientes la máxima calidad y fiabilidad posible.</li>
            <li>Establecer los objetivos a corto y medio plazo para la empresa mediante los indicadores.</li>
          </ul>
          <p className="mt-8 font-bold text-black italic">Dirección de Soluciones Digitales de Toledo.</p>
        </div>
      </div>
    </div>
  );
}
