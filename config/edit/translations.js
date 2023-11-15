exports.translations = {
  'app description': {
    en: 'On this platform you can find many early-stage, home-grown and often open-source grassroots solutions developed by people who are innovating in the margins to solve complex development challenges faced by their communities.',
    // 'en': '<br/><br/>Intriguing solutions are those that, when observed, make you wonder ‘why did they do that?’. You see something happening, but you don’t immediately understand the need behind it. These are solutions that get a mapper to investigate further and dig deeper to understand why.',
    fr: 'Sur cette plate-forme, vous pouvez trouver de nombreuses solutions de base à un stade précoce, développées en interne et souvent open source, développées par des personnes qui innovent en marge pour résoudre les problèmes de développement complexes auxquels sont confrontées leurs communautés.',
    es: 'En esta plataforma, puede encontrar muchas soluciones de base en etapa inicial, locales y, a menudo, de código abierto, desarrolladas por personas que están innovando en los márgenes para resolver los complejos desafíos de desarrollo que enfrentan sus comunidades.',
    pt: 'Nesta plataforma, você pode encontrar muitas soluções de base em estágio inicial, desenvolvidas em casa e muitas vezes de código aberto, desenvolvidas por pessoas que estão inovando nas margens para resolver complexos desafios de desenvolvimento enfrentados por suas comunidades.',
  },
  'email notifications': {
    'new user subject': {
      en: (appTitle) => `[${appTitle}] An account has been created for you`,
    },
    'new user body': {
      en: (creator, appTitle, resetLink, baseURL) => `
        ${creator} has created an account for you to access the
        <a href="${resetLink}">${appTitle}</a> application.

        If the above link has expired you can <a href="${baseURL}forget-password">reset password</a>
      `,
    },
  },
};
