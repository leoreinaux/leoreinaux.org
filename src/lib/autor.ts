import { site } from '../../site.config';

export interface Trecho {
  texto: string;
  /** Presente quando o trecho é o nome da empresa do autor. */
  url?: string;
}

/** Divide um texto (bio, cargo) em trechos, separando o nome da empresa do autor para virar link. */
export function trechosComEmpresa(texto: string): Trecho[] {
  const empresa = site.author.worksFor;
  if (!empresa) return [{ texto }];
  return texto
    .split(empresa.name)
    .flatMap((parte, i) => (i === 0 ? [{ texto: parte }] : [{ texto: empresa.name, url: empresa.url }, { texto: parte }]))
    .filter((trecho) => trecho.texto !== '');
}

/** O mesmo texto em Markdown, com o nome da empresa como link. */
export function comLinkDaEmpresa(texto: string): string {
  return trechosComEmpresa(texto)
    .map(({ texto, url }) => (url ? `[${texto}](${url})` : texto))
    .join('');
}
