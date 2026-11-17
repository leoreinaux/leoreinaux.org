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
  analytics: {
    /** URL do Umami (Etapa 3). */
    umamiUrl: string;
    /**
     * ID do site no Umami, em Settings → Websites → o site → Website ID.
     * Enquanto estiver vazio, o script de estatísticas não entra nas páginas.
     */
    websiteId: string;
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
  /** Versão em áudio dos posts e tutoriais, gerada por `npm run audio` (scripts/audio.ts). */
  audio: {
    /** Voz do Piper (nome do modelo, sem .onnx), baixada com `python3 -m piper.download_voices <voz>`. */
    voz: string;
    /**
     * Como a voz deve ler palavras que ela pronuncia errado, por exemplo nomes próprios.
     * Chave: o texto como está escrito (palavra inteira, maiúsculas e minúsculas contam). Valor: como falar.
     */
    pronuncia: Record<string, string>;
  };
  /** Feed de podcast (/podcast.xml) com o áudio dos posts, para Apple Podcasts, Spotify e outros apps. */
  podcast: {
    /** Descrição do programa nos apps (até 4 mil caracteres). */
    descricao: string;
    /** E-mail de contato do feed; as plataformas mandam para ele o código de verificação e podem exibi-lo. */
    email: string;
    /** Categoria do Apple Podcasts, em inglês, como na lista oficial (por exemplo, Technology). */
    categoria: string;
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
    jobTitle: 'Cofundador da Even3',
    bio: 'Bacharel em ciência da computação e cofundador da Even3.',
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
    { label: 'X', url: 'https://x.com/leoreinaux' },
  ],
  newsletter: {
    listmonkUrl: 'https://newsletter.leoreinaux.org',
    listUuid: '2b1f377c-ce84-40a1-b2e5-00dab902089b',
    sendTime: '07:00',
    sendTimeZone: 'America/Sao_Paulo',
  },
  analytics: {
    umamiUrl: 'https://analytics.leoreinaux.org',
    websiteId: '0e25fcec-c76a-4e0a-8e41-b530b8fdb6bf',
  },
  privacyEmail: 'privacidade@leoreinaux.org',
  sourceCode: 'https://github.com/leoreinaux/leoreinaux.org',
  contentLicense: {
    name: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/deed.pt-br',
  },
  indexNowKey: '43c686058ded6381db262d2657afe178',
  audio: {
    voz: 'pt_BR-cadu-medium',
    pronuncia: {
      'leoreinaux.org': 'Léo Reinô ponto órg',
      Reinaux: 'Reinô',
      // Siglas que a voz lê como palavra, mas se falam letra por letra (ou o contrário).
      AASM: 'A A S M',
      DPO: 'D P O',
      ECA: 'Éca',
      ID: 'I D',
      OUP: 'O U P',
      UBC: 'U B C',
    },
  },
  podcast: {
    descricao:
      'Os textos de Leandro Reinaux em áudio, lidos por uma voz sintética: tecnologia, privacidade e o efeito das telas na vida da gente, com dados, pesquisas e experiências pessoais. O texto completo, com as fontes, está em leoreinaux.org.',
    email: 'privacidade@leoreinaux.org',
    categoria: 'Technology',
  },
};
