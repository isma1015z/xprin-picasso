import { useNavigate } from 'react-router-dom';

export function PoliticaCookies() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-black py-20 px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="mb-8 text-red-600 font-bold uppercase tracking-widest hover:underline cursor-none">← Volver</button>
        <h1 className="text-4xl font-black uppercase mb-8">Política de Cookies</h1>
        <div className="space-y-6 text-zinc-700 leading-relaxed text-sm">
          <h2 className="text-2xl font-bold text-black mt-8">1. ¿Qué son las cookies?</h2>
          <p>Una cookie es un pequeño archivo que se almacena en el ordenador, móvil o tablet de los usuarios al acceder a determinadas páginas web, aplicación o plataforma y que permiten a éstas reconocer a sus usuarios.</p>
          <p>Las cookies actualmente son esenciales para el funcionamiento de internet, aportando innumerables ventajas en la prestación de servicios interactivos, facilitándole la navegación y su usabilidad.</p>
          <p>Las cookies ayudan a adaptar las webs, aplicaciones o plataformas a sus necesidades personales.</p>
          <p>Las cookies no pueden dañar su equipo. En cambio, el que estén activadas pueden ayudar a identificar y resolver errores, así como a mejorar la navegabilidad del usuario.</p>
          <p>Las cookies permiten, entre otras cosas, almacenar y recuperar información sobre las preferencias de navegación de un usuario o de su equipo.</p>
          <p>Este sitio web, aplicación o plataforma utiliza cookies y/o tecnologías similares que almacenan y recuperan información cuando navegas. En general, estas tecnologías pueden servir para finalidades muy diversas, como, por ejemplo, reconocerte como usuario, obtener información sobre tus hábitos de navegación, o personalizar la forma en que se muestra el contenido.</p>
          <p>Los usos concretos que hacemos de estas tecnologías se describen a continuación.</p>

          <h2 className="text-2xl font-bold text-black mt-8">2. ¿Qué cookies utilizamos?</h2>
          <p>En https://xprin.es/ utilizamos cookies, logs, enlaces y otras tecnologías para almacenar las preferencias del usuario con el fin de mejorar la calidad de nuestros servicios, asegurar el funcionamiento técnico tanto del portal como de las transacciones realizadas, medir la audiencia de la web y desarrollar nuevas y mejores prestaciones, productos y servicios ofertados.</p>
          <p><strong>Propietario de las cookies:</strong></p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Utilizamos cookies propias que enviamos al equipo terminal del usuario desde un equipo o dominio gestionado por nosotros y desde el que se presta el servicio solicitado por el usuario.</li>
            <li>Utilizamos cookies de terceros (por ejemplo, cookies de Facebook, Google, X…) usadas por empresas externas, redes sociales o por complementos externos de contenido (como, por ejemplo, Google Maps). Son enviadas al equipo terminal del usuario desde un equipo o dominio de una entidad tercera que trata los datos obtenidos través de las cookies.</li>
          </ul>

          <p><strong>Uso de las cookies:</strong></p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Utilizamos cookies técnicas</strong> que son estrictamente necesarias para que el usuario acceda y navegue en https://xprin.es/. Son aquellas que permiten al usuario la navegación a través de una página web, plataforma o aplicación y la utilización de las diferentes opciones o servicios que en ella existan. Estas cookies no requieren el consentimiento informado del usuario.</li>
            <li><strong>Utilizamos cookies de preferencias o personalización</strong> que son aquellas que, tratadas por nosotros o por terceros, nos permiten recordar información para que el usuario acceda al servicio con determinadas características que pueden diferenciar su experiencia de la de otros usuarios. Estas cookies pueden requerir el consentimiento informado del usuario.</li>
            <li><strong>Utilizamos cookies de análisis o medición</strong> que son aquellas que, tratadas por nosotros o por terceros, nos permiten el seguimiento y análisis del comportamiento de los usuarios de los sitios web a los que están vinculadas, incluida la cuantificación de los impactos de los anuncios. Estas cookies requieren el consentimiento informado del usuario.</li>
            <li><strong>Utilizamos cookies de publicidad comportamental</strong> que son aquellas que, tratadas por nosotros o por terceros, almacenan información del comportamiento de los usuarios obtenida a través de la observación continuada de sus hábitos de navegación, lo que permite desarrollar un perfil específico de navegación de los usuarios para mostrarles publicidad en función del mismo. Estas cookies requieren el consentimiento informado del usuario.</li>
          </ul>

          <p><strong>Tiempo de conservación de las cookies:</strong></p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Utilizamos cookies de sesión</strong> que son cookies diseñadas para recabar y almacenar datos mientras el usuario accede a una página web. Se suelen emplear para almacenar información que solo interesa conservar para la prestación del servicio solicitado por el usuario en una sola ocasión y desaparecen al terminar la sesión.</li>
            <li><strong>Utilizamos cookies persistentes</strong> que son aquellas en las que los datos siguen almacenados en el terminal y pueden ser accedidos y tratados durante un periodo definido por el responsable de la cookie, y que puede ir de unos minutos a varios años.</li>
          </ul>
          <p>Este tipo de información obtenida a través de las cookies no será comunicado a terceros, ni utilizado para comunicaciones no solicitadas.</p>

          <h2 className="text-2xl font-bold text-black mt-8">3. ¿Cómo pueden nuestros usuarios gestionar las cookies que utilizamos?</h2>
          <p>Los usuarios de https://xprin.es/ pueden gestionar las cookies y, por lo tanto, rechazarlas de forma unitaria o en su totalidad, en el Panel de Configuración. Si se desactivan o rechazan las cookies, puede ocurrir que algunas de las funciones y/o servicios no funcionen adecuadamente.</p>
          <p>El portal no ejerce control sobre los sitios web mostrados como resultado de su búsqueda, enlaces o accesos desde nuestro directorio. Estos otros sitios web pueden colocar sus propias cookies o solicitarle información personal.</p>

          <h2 className="text-2xl font-bold text-black mt-8">4. ¿Cómo pueden nuestros usuarios deshabilitar las cookies en los principales navegadores?</h2>
          <p>Normalmente es posible dejar de aceptar las cookies del navegador, o dejar de aceptar las cookies de un servicio en particular. Todos los navegadores modernos permiten cambiar la configuración de cookies. Estos ajustes normalmente se encuentran en las 'opciones' o 'Preferencias' del menú de su navegador.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Internet Explorer:</strong> Herramientas {'>'} Opciones de Internet {'>'} Privacidad {'>'} Configuración.</li>
            <li><strong>Firefox:</strong> Preferencias {'>'} Privacidad y Seguridad</li>
            <li><strong>Chrome:</strong> Preferencias {'>'} Configuración {'>'} Mostrar opciones avanzadas {'>'} Privacidad y Seguridad</li>
            <li><strong>Safari:</strong> Preferencias {'>'} Privacidad.</li>
            <li><strong>Opera:</strong> Configuración {'>'} Privacidad y seguridad.</li>
          </ul>

          <h2 className="text-2xl font-bold text-black mt-8">5. ¿Cómo puedo deshabilitar las cookies de terceros?</h2>
          <p>Tenga en cuenta que, si acepta las cookies de terceros, deberá eliminarlas desde las opciones del navegador o desde el sistema ofrecido por el propio tercero.</p>

          <h2 className="text-2xl font-bold text-black mt-8">6. ¿Qué ocurre si no acepto las cookies de la web?</h2>
          <p>En caso de que el usuario no permita la instalación de cookies en su navegador es posible que no pueda acceder a alguna de las secciones de nuestro sitio web.</p>

          <h2 className="text-2xl font-bold text-black mt-8">7. ¿Se realizan transferencias internacionales de mis datos?</h2>
          <p>Le informamos que SOLUCIONES DIGITALES DE TOLEDO, S.L. no realiza transferencias internacionales de sus datos. En cuanto a las cookies de terceros, puedes informarte de las transferencias a terceros países que, en su caso, realizan los terceros identificados en esta política de cookies en sus correspondientes políticas.</p>

          <h2 className="text-2xl font-bold text-black mt-8">8. ¿Se elabora un perfil de mi navegación y se toman decisiones automatizadas?</h2>
          <p>Le informamos que SOLUCIONES DIGITALES DE TOLEDO, S.L. no realiza elaboración de perfiles de su navegación que lleven a la toma de decisiones automatizadas que puedan afectarle jurídica o significativamente.</p>

          <h2 className="text-2xl font-bold text-black mt-8">9. Tratamiento de datos sensibles</h2>
          <p>Le informamos que SOLUCIONES DIGITALES DE TOLEDO, S.L. no realiza tratamientos de datos sensibles.</p>
        </div>
      </div>
    </div>
  );
}
