# Envio de e-mail com o Amazon SES

Roteiro para o Listmonk enviar a newsletter pelo [Amazon SES](https://aws.amazon.com/ses/). Os passos acontecem no console da AWS, na Cloudflare (DNS) e no painel do Listmonk; nada daqui vai para o repositório. Contexto em "Newsletter" e "Entregabilidade" em [`docs/arquitetura.md`](../docs/arquitetura.md).

As escolhas abaixo podem ser trocadas; se trocar, troque em todos os passos:

| O quê | Valor |
| --- | --- |
| Região do SES | `sa-east-1` (São Paulo), para os e-mails dos inscritos ficarem no Brasil |
| Domínio de envio | `news.leoreinaux.org`, separado do domínio principal |
| Remetente | `Leandro Reinaux <leandro@news.leoreinaux.org>` |
| MAIL FROM (retorno de bounces) | `bounce.news.leoreinaux.org` |

Todos os registros DNS são criados na zona `leoreinaux.org` da Cloudflare, com o proxy **desligado** (nuvem cinza; registros MX e TXT nem têm proxy).

## 1. Conta da AWS

1. Crie a conta em [aws.amazon.com](https://aws.amazon.com) e ative a autenticação em dois fatores (MFA) no usuário raiz.
2. Em *Billing → Budgets*, crie um alerta de gasto de US$ 5 por mês, para saber logo se algo sair do previsto (o esperado é menos de US$ 1).
3. No canto superior direito do console, escolha a região **América do Sul (São Paulo) `sa-east-1`**. Tudo do SES abaixo é feito nela.

## 2. Domínio de envio e DKIM

1. Em *Amazon SES → Configuration → Identities*, clique em *Create identity*, escolha *Domain* e informe `news.leoreinaux.org`.
2. Em *Advanced DKIM settings*, deixe *Easy DKIM* com chave *RSA_2048_BIT*.
3. Em *Custom MAIL FROM domain*, marque *Use a custom MAIL FROM domain*, informe `bounce` (vira `bounce.news.leoreinaux.org`) e, em *Behavior on MX failure*, escolha *Reject message*.
4. Crie a identidade. O SES mostra os registros que faltam: crie-os na Cloudflare.

| Tipo | Nome | Conteúdo | Para quê |
| --- | --- | --- | --- |
| CNAME (×3) | `<token>._domainkey.news` | `<token>.dkim.amazonses.com` | DKIM: os três valores exatos aparecem no SES |
| MX | `bounce.news` | `feedback-smtp.sa-east-1.amazonses.com`, prioridade 10 | MAIL FROM: recebe os bounces |
| TXT | `bounce.news` | `v=spf1 include:amazonses.com -all` | SPF do MAIL FROM |
| TXT | `_dmarc.news` | `v=DMARC1; p=none; rua=mailto:privacidade@leoreinaux.org; adkim=s; aspf=r` | DMARC do domínio de envio |

Em até uma hora a identidade fica *Verified* e o DKIM e o MAIL FROM ficam *Successful*.

**DMARC em duas fases.** Comece com `p=none`, que só observa e manda relatórios para o `rua`. Depois de duas a quatro semanas de envios sem problemas nos relatórios, troque para `p=quarantine` e, mais tarde, para `p=reject`. Se o domínio principal ainda não tem DMARC, crie também um TXT `_dmarc` (para `leoreinaux.org`) com `v=DMARC1; p=none; rua=mailto:privacidade@leoreinaux.org`.

## 3. Credenciais SMTP para o Listmonk

1. Em *Amazon SES → SMTP settings*, clique em *Create SMTP credentials*. A AWS cria um usuário IAM que só pode enviar e-mail.
2. Guarde o usuário e a senha SMTP num gerenciador de senhas: a senha só aparece uma vez.
3. No Listmonk, em *Settings → SMTP*, configure:

| Campo | Valor |
| --- | --- |
| Host | `email-smtp.sa-east-1.amazonaws.com` |
| Port | `587` |
| Auth protocol | `LOGIN` |
| Username / Password | as credenciais do passo anterior |
| TLS | `STARTTLS` |
| Max. connections | `5` |

4. Em *Settings → General*, use `Leandro Reinaux <leandro@news.leoreinaux.org>` como *Default 'from' email*.
5. Em *Settings → Performance*, deixe *Message rate* igual ou abaixo da taxa de envio da conta (*Account dashboard* do SES: 1 por segundo no sandbox; o valor aprovado depois).
6. Em *Settings → Privacy*, confira que *List-Unsubscribe header* está **ligado**: o Gmail e o Yahoo exigem o descadastro em um clique.

## 4. Bounces e reclamações

Endereços que não existem (bounce) e marcações como spam (reclamação) precisam sair da lista sozinhos; acima de 5% de bounces ou 0,1% de reclamações o SES pode suspender a conta.

1. Em *Amazon SNS* (mesma região), crie um tópico *Standard* chamado `ses-listmonk`.
2. Crie uma *subscription* no tópico com protocolo *HTTPS* e endpoint `https://newsletter.leoreinaux.org/webhooks/service/ses`. O Listmonk confirma a assinatura sozinho.
3. No SES, na identidade `news.leoreinaux.org`, aba *Notifications*, aponte *Bounce* e *Complaint* para o tópico `ses-listmonk` e marque *Include original email headers*. Depois desligue *Email feedback forwarding*.
4. No Listmonk, em *Settings → Bounces*, ligue *Enable bounce processing* e *Enable SES*. Em *Actions*: *Hard* bounce → **Blocklist** na primeira vez, *Soft* → **None**, *Complaint* → **Blocklist** na primeira vez.

## 5. Teste no sandbox

Contas novas começam no sandbox: só enviam para endereços verificados, até 200 por dia.

1. Em *Identities*, crie uma identidade *Email address* com o seu e-mail pessoal e clique no link de confirmação que chega nele.
2. No Listmonk, crie uma lista interna, inscreva o seu e-mail e envie uma campanha de teste.
3. No Gmail, abra a mensagem, *⋮ → Mostrar original* e confira **SPF, DKIM e DMARC: PASS**.
4. Opcional: envie também para o endereço que o [mail-tester.com](https://www.mail-tester.com) mostra e mire em nota 9 ou mais.

## 6. Pedido de saída do sandbox

Em *Amazon SES → Account dashboard*, clique em *Request production access*. A análise leva até um dia útil e é feita em inglês. Sugestão para os campos:

- **Mail type:** Marketing
- **Website URL:** `https://leoreinaux.org`
- **Use case description:**

  > I run a personal, non-commercial website with long-form articles in Portuguese (https://leoreinaux.org). Amazon SES will send a newsletter announcing each new article, about 4 emails per month to each subscriber, through a self-hosted Listmonk instance.
  >
  > Recipients are only people who subscribe on the website form and confirm through a double opt-in email; no lists are bought or imported. Every email has a one-click unsubscribe link and List-Unsubscribe headers. Bounces and complaints are delivered via SNS to Listmonk, which blocklists hard bounces and complaints automatically. The sending domain news.leoreinaux.org is verified with DKIM, a custom MAIL FROM domain with SPF, and DMARC. The privacy policy is at https://leoreinaux.org/privacidade.
  >
  > Expected volume starts below 1,000 emails per month and may grow to about 40,000 per month.

Se a AWS pedir mais detalhes, responda pelo próprio caso de suporte com o que o formulário e a política de privacidade mostram.

## Depois de aprovado

- Confira a nova taxa de envio no *Account dashboard* e ajuste o *Message rate* do Listmonk.
- Acompanhe por algumas semanas, em *Account dashboard → Reputation metrics*, as taxas de bounce e de reclamação, e os relatórios do DMARC no `privacidade@leoreinaux.org`.
- Endureça o DMARC (`p=quarantine`, depois `p=reject`) quando os relatórios estiverem limpos.
