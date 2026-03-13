import { useNavigate } from 'react-router-dom';

export function PoliticaPrivacidad() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-black py-20 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="mb-8 text-red-600 font-bold uppercase tracking-widest hover:underline cursor-none">← Volver</button>
        <h1 className="text-4xl font-black uppercase mb-8">Política de Privacidad</h1>
        <div className="space-y-6 text-zinc-700 leading-relaxed text-sm">
          <p>Le informamos que los datos personales recogidos a través del formulario de contacto de la URL https://xprin.es/ serán tratados por SOLUCIONES DIGITALES DE TOLEDO, S.L., con domicilio en C/ Rio Jarama 136 – Nave 8.13, 45004, Toledo (Toledo), y correo electrónico sdt@sdtsl.com, con el fin de gestionar su consulta o petición.</p>
          <p>Este tratamiento de datos es necesario para atender su consulta, solicitud o sugerencia, y está basado en el consentimiento que usted nos da al contactar voluntariamente con nosotros. Sus datos serán conservados durante el plazo estrictamente necesario para dar contestación a su consulta, solicitud o sugerencia o hasta que se oponga a dicho tratamiento.</p>
          
          <p>Los datos personales que Usted pueda facilitarnos durante su relación contractual, profesional o comercial con SOLUCIONES DIGITALES DE TOLEDO, serán tratados por la misma con la finalidad de mantener dichas relaciones. Para la realización de esta gestión es posible que sus datos sean cedidos a entidades bancarias y a la Administración Tributaria. Este tratamiento de datos es necesario para la ejecución del contrato y/o para el mantenimiento de la relación contractual, profesional o comercial. Igualmente, le informamos que sus datos serán conservados mientras se mantengan estas relaciones y los plazos marcados por la legislación fiscal o durante los plazos establecidos para atender posibles reclamaciones.</p>

          <p>Si Usted nos ha enviado su currículum a las direcciones postales o electrónicas de SOLUCIONES DIGITALES DE TOLEDO o nos lo ha facilitado a través de una oferta de empleo publicada en redes sociales profesionales, como LinkedIn o Infojobs, le informamos que sus datos serán tratados por SOLUCIONES DIGITALES DE TOLEDO para la gestión de sus procesos de selección de personal de puestos vacantes. Sus datos no serán cedidos a terceros. Este tratamiento de datos es necesario para atender su solicitud de empleo y está basado en el consentimiento que Usted nos da al enviarnos su currículum, así como para la ejecución de medidas precontractuales en su caso. Sus datos serán conservados únicamente si hay un proceso de selección abierto y, en este caso, hasta la finalización del proceso.</p>

          <p>SOLUCIONES DIGITALES DE TOLEDO le informa de que en ningún caso está obligado a facilitarnos sus datos personales, y que éstos son los adecuados, pertinentes y estrictamente necesarios para cumplir con la finalidad por la que se recogen, no obstante, estos son imprescindibles para dar respuesta a su solicitud o para proporcionarle los servicios ofertados.</p>

          <p>Es importante que para que podamos mantener sus datos personales actualizados, nos informe siempre que haya habido alguna modificación en ellos, en caso contrario, no respondemos de la veracidad de los mismos. Asimismo, nos certifica que todos los datos que Ud. nos facilita son ciertos, vigentes y pertinentes para la finalidad por la que se los solicitamos, y que los facilita por sí mismo.</p>

          <h2 className="text-2xl font-bold text-black mt-8">Derechos de protección de datos del interesado</h2>
          <p>Ud. puede ejercer sus derechos de acceso, rectificación, supresión, oposición, a no ser objeto de decisiones individuales automatizadas, portabilidad y limitación del tratamiento de sus datos dirigiéndose a SOLUCIONES DIGITALES DE TOLEDO, S.L., con domicilio en C/ Rio Jarama 136 – Nave 8.13, 45004, Toledo (Toledo), o al correo electrónico sdt@sdtsl.com, para lo que podremos solicitar documentación que acredite su identidad en caso de que resulte necesario. En caso de que Ud. considere infringidos sus derechos, tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD).</p>

          <h2 className="text-2xl font-bold text-black mt-8">Garantía de Confidencialidad y Seguridad de los datos</h2>
          <p>SOLUCIONES DIGITALES DE TOLEDO, en respuesta a la confianza depositada en nosotros y teniendo en cuenta la importancia en materia de protección y confidencialidad que requieren sus datos personales, les informa que ha adoptado las medidas, técnicas y organizativas, necesarias para garantizar la confidencialidad, disponibilidad, integridad y resiliencias de sus sistemas y servicios de tratamiento. No obstante, el usuario debe ser consciente de que las medidas de seguridad en Internet no son inexpugnables.</p>

          <p>La presente política de privacidad ha sido actualizada en marzo de 2024. SOLUCIONES DIGITALES DE TOLEDO se reserva el derecho de modificar su política de protección de datos en el supuesto de que exista un cambio de la legislación vigente, doctrina jurisprudencial o por criterios propios empresariales. Si se introdujese algún cambio en esta política, el nuevo texto se publicará en esta misma dirección.</p>
        </div>
      </div>
    </div>
  );
}
