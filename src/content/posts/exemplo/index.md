---
title: Post de exemplo com todos os campos
description: Modelo de post que usa todos os campos do frontmatter. É um rascunho e fica fora do build de produção.
summary: Este post serve de modelo para os próximos. Ele usa todos os campos do frontmatter, inclusive os opcionais. Como está marcado como rascunho, só aparece quando o site roda em modo de desenvolvimento.
pubDate: 2026-10-27
updatedDate: 2026-10-28
cover:
  src: ./capa.jpg
  alt: Ilustração abstrata de uma página de texto, com linhas cinzas sobre fundo creme e um círculo azul à direita.
tags:
  - exemplo
  - modelo
video:
  youtubeId: exemplo0000 # ID fictício: troque pelo ID real do vídeo
  duration: PT2M10S
  uploadDate: 2026-10-27
newsletter: false
draft: true
social:
  linkedin: Trecho para o LinkedIn (reservado para a fase 2).
  instagram: Legenda para o Instagram (reservado para a fase 2).
---

O primeiro parágrafo responde à pergunta central do texto. Aqui, a pergunta é simples: como deve ser um post neste site? A resposta é que cada post é uma pasta em `src/content/posts/`, com um `index.md`, a imagem de capa e, se houver vídeo, a transcrição em `transcricao.md`.

## O que vai no frontmatter?

Os campos obrigatórios são `title`, `description`, `summary`, `pubDate`, `cover` (com `src` e `alt`) e `newsletter`. Se algum faltar, o build quebra e o post não vai para o ar.

Os campos opcionais são `updatedDate`, `tags`, `video`, `draft` e `social`. O campo `social` fica reservado para a automação de redes sociais, prevista para depois do lançamento.

### Rascunhos

Com `draft: true`, o post aparece em `npm run dev` e fica fora de `npm run build`. Este exemplo é um rascunho, então a home publicada não o mostra.

## Como fica o texto corrido?

Um texto longo precisa de respiro. Parágrafos curtos, subtítulos que funcionam como perguntas e listas quando houver passos:

1. Escreva o texto em Markdown.
2. Revise o frontmatter.
3. Faça o commit na branch principal.

Também é possível usar listas simples:

- *itálico* para ênfase;
- **negrito** para termos importantes;
- [links](https://leoreinaux.org) para as fontes citadas.

> Citações aparecem com destaque discreto, para não competir com o texto principal.

Trechos de código ficam em bloco:

```ts
const slug = 'exemplo';
```

## Fontes

Cite as fontes com link e data de consulta, como no documento de arquitetura.
