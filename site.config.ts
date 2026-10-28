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
    /** Cargo ou ocupação, usado no JSON-LD. */
    jobTitle: string;
    /** Uma ou duas frases; aparece na página Sobre e no fim de cada post. */
    bio: string;
    /** Parágrafos da página Sobre que explicam por que o site existe. */
    about: string[];
    /** Foto do autor, na página Sobre e no JSON-LD. `src` é o nome de um arquivo em src/assets/. */
    photo?: {
      src: string;
      alt: string;
    };
  };
  /** Redes do autor; também alimentarão o sameAs do JSON-LD (Etapa 2). */
  social: SocialLink[];
  newsletter: {
    /** URL do Listmonk (Etapa 3). */
    listmonkUrl: string;
    /**
     * UUID da lista pública (double opt-in) no Listmonk, em Lists → a lista → UUID.
     * Enquanto estiver vazio, o formulário de inscrição não aparece no site.
     */
    listUuid: string;
    /** Horário de envio das campanhas, no fuso de sendTimeZone: o dia seguinte à publicação, nessa hora. */
    sendTime: string;
    /** Fuso do horário de envio (nome IANA). */
    sendTimeZone: string;
  };
  /** E-mail para pedidos sobre dados pessoais (LGPD), publicado na política de privacidade. */
  privacyEmail: string;
  /** Repositório público com o código do site (licença MIT). */
  sourceCode: string;
  /** Licença dos textos de src/content/. */
  contentLicense: {
    name: string;
    url: string;
  };
  /**
   * Chave do IndexNow (8 a 128 letras, números ou hífens). É pública: o site a serve em
   * /indexnow.txt para os buscadores confirmarem os avisos. Num fork, gere outra.
   */
  indexNowKey: string;
}

export const site: SiteConfig = {
  name: 'Leandro Reinaux',
  url: 'https://leoreinaux.org',
  description: 'Textos longos e aprofundados, em português, escritos por Leandro Reinaux.',
  lang: 'pt-BR',
  locale: 'pt-BR',
  author: {
    name: 'Leandro Reinaux',
    jobTitle: 'Cofundador da Even3',
    bio: 'Católico, marido de Jamilly, bacharel em Ciência da Computação e cofundador da Even3.',
    about: [
      'Acredito que conhecimento e experiências, quando compartilhados, agregam muito valor à vida das pessoas.',
      'Criei este site para registrar esses conhecimentos e experiências, para que qualquer pessoa possa acessá-los de forma livre e aberta e compartilhá-los também.',
      'Aqui não há nenhum interesse comercial nem de ganhar dinheiro. É apenas uma forma de registrar e compartilhar experiências e conhecimentos, de graça e com liberdade.',
    ],
    photo: {
      src: 'autor.jpg',
      alt: 'Leandro Reinaux sorrindo, de óculos escuros e camiseta preta, sentado sobre uma rocha diante de uma grande pedra de granito.',
    },
  },
  social: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/leandroreinaux' },
    { label: 'Instagram', url: 'https://www.instagram.com/leoreinaux' },
  ],
  newsletter: {
    listmonkUrl: 'https://newsletter.leoreinaux.org',
    listUuid: '',
    sendTime: '07:00',
    sendTimeZone: 'America/Sao_Paulo',
  },
  privacyEmail: 'privacidade@leoreinaux.org',
  sourceCode: 'https://github.com/leoreinaux/leoreinaux.org',
  contentLicense: {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/deed.pt-br',
  },
  indexNowKey: '43c686058ded6381db262d2657afe178',
};
