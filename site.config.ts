/**
 * Tudo o que é pessoal no site fica aqui.
 * Para fazer um fork, troque este arquivo e a pasta src/content/posts/.
 */

export interface SocialLink {
  /** Nome exibido, por exemplo "LinkedIn". */
  label: string;
  url: string;
}

export interface SiteConfig {
  /** Nome do site, usado no título das páginas e no cabeçalho. */
  name: string;
  /** URL canônica, sem barra no fim. */
  url: string;
  /** Descrição padrão das páginas que não têm uma própria (até 160 caracteres). */
  description: string;
  /** Idioma do conteúdo (atributo lang do HTML). */
  lang: string;
  /** Localidade usada para formatar datas. */
  locale: string;
  author: {
    name: string;
    /** Cargo ou ocupação, usado na página Sobre e, mais tarde, no JSON-LD. */
    jobTitle: string;
    /** Uma ou duas frases. */
    bio: string;
  };
  /** Redes do autor; também alimentarão o sameAs do JSON-LD (Etapa 2). */
  social: SocialLink[];
  newsletter: {
    /** URL do Listmonk (Etapa 3). */
    listmonkUrl: string;
  };
  /** Licença dos textos de src/content/. */
  contentLicense: {
    name: string;
    url: string;
  };
}

export const site: SiteConfig = {
  name: 'Leandro Reinaux',
  url: 'https://leoreinaux.org',
  description: 'Textos longos e aprofundados, em português, escritos por Leandro Reinaux.',
  lang: 'pt-BR',
  locale: 'pt-BR',
  author: {
    name: 'Leandro Reinaux',
    jobTitle: 'TODO: cargo',
    bio: 'TODO: bio curta, em uma ou duas frases.',
  },
  social: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/TODO' },
    { label: 'Instagram', url: 'https://www.instagram.com/TODO' },
  ],
  newsletter: {
    listmonkUrl: 'https://newsletter.leoreinaux.org',
  },
  contentLicense: {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/deed.pt-br',
  },
};
