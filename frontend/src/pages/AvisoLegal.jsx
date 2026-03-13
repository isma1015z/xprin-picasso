import { useNavigate } from 'react-router-dom';

export function AvisoLegal() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-black py-20 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="mb-8 text-red-600 font-bold uppercase tracking-widest hover:underline cursor-none">← Volver</button>
        <h1 className="text-4xl font-black uppercase mb-8">Aviso Legal</h1>
        <div className="space-y-6 text-zinc-700 leading-relaxed text-sm">
          <h2 className="text-2xl font-bold text-black mt-8">Información General</h2>
          <p>En cumplimiento con el deber de información recogido en el artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico, le informamos que la URL https://xprin.es/ (en adelante el PORTAL) es un dominio propiedad de SOLUCIONES DIGITALES DE TOLEDO, S.L, con domicilio sito en Calle Rio Jarama, 132 Nave 9.08, 45004 Toledo (Toledo), dirección de correo electrónico sdt@sdtsl.com.</p>
          
          <p>Todas las marcas, nombres comerciales o signos distintivos de cualquier clase que aparecen en el PORTAL son propiedad de SOLUCIONES DIGITALES DE TOLEDO, S.L o de terceros colaboradores, sin que pueda entenderse que el uso o acceso al sitio y/o a los servicios, atribuya al usuario derecho alguno sobre las citadas marcas, nombres comerciales y/o signos distintivos.</p>
          
          <p>Asimismo, los contenidos publicados en la web, su diseño gráfico, imágenes, bases de datos y código fuente son propiedad intelectual de SOLUCIONES DIGITALES DE TOLEDO, S.L o de terceros colaboradores, sin que puedan entenderse cedidos al usuario, en virtud de lo establecido en este Aviso Legal, ninguno de los derechos de explotación que existen o puedan existir sobre dichos contenidos más allá de lo estrictamente necesario para el correcto uso del PORTAL y de los servicios que se prestan a través de él.</p>
          
          <p>El acceso a este website es responsabilidad exclusiva de los usuarios. El simple acceso al PORTAL no supone entablar ningún tipo de relación de carácter comercial entre SOLUCIONES DIGITALES DE TOLEDO, S.L y el usuario. Accediendo a él acepta las Condiciones Generales de Uso.</p>
        </div>
      </div>
    </div>
  );
}
