exports.translations = {
  'app description': {
    en: 'On this platform you can find many early-stage, home-grown and often open-source grassroots solutions developed by people who are innovating in the margins to solve complex development challenges faced by their communities.',
    // 'en': '<br/><br/>Intriguing solutions are those that, when observed, make you wonder ‘why did they do that?’. You see something happening, but you don’t immediately understand the need behind it. These are solutions that get a mapper to investigate further and dig deeper to understand why.',
    fr: 'Sur cette plate-forme, vous pouvez trouver de nombreuses solutions de base à un stade précoce, développées en interne et souvent open source, développées par des personnes qui innovent en marge pour résoudre les problèmes de développement complexes auxquels sont confrontées leurs communautés.',
    es: 'En esta plataforma, puede encontrar muchas soluciones de base en etapa inicial, locales y, a menudo, de código abierto, desarrolladas por personas que están innovando en los márgenes para resolver los complejos desafíos de desarrollo que enfrentan sus comunidades.',
    pt: 'Nesta plataforma, você pode encontrar muitas soluções de base em estágio inicial, desenvolvidas em casa e muitas vezes de código aberto, desenvolvidas por pessoas que estão inovando nas margens para resolver complexos desafios de desenvolvimento enfrentados por suas comunidades.',
  },
  'app title': {
    'solutions-mapping': {
      en: 'Solutions Mapping Platform',
      es: 'Plataforma de Mapeo de Soluciones',
    },
    experiments: {
      en: 'Experiments Platform',
    },
    consent: {
      en: 'Consent Archive',
    },
    'action-plans': {
      en: 'Action Plans Platform',
    },
  },
  'app desc': {
    'solutions-mapping': {
      en: `
      <p>
      The platform has been designed to systematize the solutions identified
      and share them effectively. Each solution is documented in pads, which are
      organized in tabs according to their publication status.
      </p>
      <p>
      Key Features:<br/>
      <ul>
      <li>
      Tab Organization: Solutions are classified by their publication status,
      providing a clear view of the progress and availability of each initiative.
      </li>
      <li>
      Real-Time Collaboration: The platform facilitates collaborative editing in real
      time through pads, fostering active participation and continuous contribution from team members.
      </li>
      <li>
      Comment System: A comment system is integrated to facilitate the
      feedback and discussion on each solution, promoting collaboration and quality of information.
      </li>
      </ul>
      </p>
      <p>
      Potential Benefits for you:<br/>
      <ul>
      <li>Greater efficiency in the management and documentation of solutions.</li>
      <li>Quick and easy access to relevant information.</li>
      <li>Facilitates collaboration and active participation of team members.</li>
      <li>Improved visibility of solutions in different stages of development.</li>
      </ul>
      </p>
      `,
      es: `
      <p>
      La plataforma ha sido diseñada para sistematizar las soluciones identificadas
      y compartirlas de manera efectiva. Cada solución se documenta en pads, los cuales están
      organizados en pestañas según su estado de publicación.
      </p>
      <p>
      Características Clave:<br/>
      <ul>
      <li>
        Organización por Pestañas: Las soluciones se clasifican por su estado de publicación,
        proporcionando una visión clara del progreso y la disponibilidad de cada iniciativa.
      </li>
      <li>
        Colaboración en Tiempo Real: La plataforma facilita la edición colaborativa en tiempo
        real a través de pads, fomentando la participación activa y la contribución continua de los miembros del equipo.
      </li>
      <li>
        Sistema de Comentarios: Se integra un sistema de comentarios para facilitar la
        retroalimentación y la discusión sobre cada solución, promoviendo la colaboración y la calidad de la información.
      </li>
      </ul>
      </p>
      <p>
      Beneficios Potenciales para usted:<br/>
      <ul>
      <li>Mayor eficiencia en la gestión y documentación de soluciones.</li>
      <li>Acceso rápido y sencillo a la información relevante.</li>
      <li>Facilita la colaboración y la participación activa de los miembros del equipo.</li>
      <li>Mejora la visibilidad de las soluciones en difere|ntes estados de desarrollo.</li>
      </ul>
      </p>
      `,
    },
  },
  'email notifications': {
    'new user subject': {
      en: (appTitle) => `[${appTitle}] An account has been created for you`,
      es: (appTitle) => `[${appTitle}] Se ha creado una cuenta para ti`,
    },
    'new user body': {
      en: (
        newName,
        creator,
        creatorEmail,
        appTitle,
        appDesc,
        resetLink,
        baseURL,
      ) => `
        <p>
        Hello ${newName}!
        </p><p>
        Welcome to the <a href="${baseURL}">${appTitle}</a>.<br/>
        We are excited to share with you the ${appTitle} of the UNDP Accelerator Labs.
        </p>
        ${appDesc}
        <p>
        Next Steps:<br/>
        To log in for the first time, use the following link: <a href="${resetLink}">${resetLink}</a><br/>
        If clicking the link in the email doesn't work, try copying and pasting it directly into the browser's address bar.<br/>
        After 24 hours, the above link will expire.
        In that case, use <a href="${baseURL}forget-password">${baseURL}forget-password</a> to reset your password.
        </p>
        <p>
        You can contact <a href="mailto:${creatorEmail}">${creator}</a> to follow up on how to add more initiatives.
        </p>
        <p>
        We appreciate your interest in advance and look forward to the possibility of collaborating closely on this initiative.
        </p>
      `,
      es: (
        newName,
        creator,
        creatorEmail,
        appTitle,
        appDesc,
        resetLink,
        baseURL,
      ) => `
        <p>
        ¡Hola ${newName}!
        </p><p>
        Bienvenido/a a la <a href="${baseURL}">${appTitle}</a>.<br/>
        Nos emociona compartir con ustedes la ${appTitle} de los Laboratorios de Aceleración del PNUD.
        </p>
        ${appDesc}
        <p>
        Próximos Pasos:<br/>
        Para iniciar sesión por primera vez, utiliza el siguiente enlace: <a href="${resetLink}">${resetLink}</a><br/>
        Si hacer clic en el enlace del correo electrónico no funciona, intenta copiarlo y pegarlo directamente en la barra de direcciones del navegador.<br/>
        Después de 24 horas, el enlace anterior caducará.
        En ese caso, utiliza <a href="${baseURL}forget-password">${baseURL}forget-password</a> para restaurar su contraseña.
        </p>
        <p>
        Puedes contactar a <a href="mailto:${creatorEmail}">${creator}</a> para dar seguimiento a como agregar más iniciativas.
        </p>
        <p>
        Agradecemos de antemano tu interés y esperamos con entusiasmo la posibilidad de colaborar estrechamente en esta iniciativa.
        </p>
      `,
    },
  },
};
