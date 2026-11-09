# Brasília Iluminação — site e painel

Site institucional com movimento discreto (rolagem suave, revelações por esmaecimento, uma cena fixada no Luminotécnico), uma loja (`/loja`) e um painel para editar textos, projetos, fotos, depoimentos, produtos e estoque e responder os contatos por e-mail.

| Camada | Escolha |
| --- | --- |
| Front-end | Next.js 16 (App Router, React 19), TypeScript, Tailwind v4 |
| Movimento | GSAP + ScrollTrigger e Lenis, em tom contido (sem cursor personalizado, preloader ou 3D) |
| Painel | TanStack Query + Server Actions; componentes [shadcn/ui](https://ui.shadcn.com) (Radix) e [ReUI](https://reui.io) |
| Back-end e banco | Supabase (Postgres com RLS, Auth, Realtime) |
| Arquivos | Amazon S3 + CloudFront (envio direto do navegador com URL assinada) |
| E-mail | Resend + React Email (envio, recebimento e status de entrega) |
| Hospedagem | AWS Amplify Hosting (SSR) · DNS no Route 53 |
| Tipografia | Belleza (títulos, no lugar da Monterchi do manual) + Montserrat |

### Componentes do painel (shadcn/ui + ReUI)

O painel usa os componentes da ReUI onde eles resolvem algo de verdade, sobre a base do shadcn/ui, tudo no tema da marca (`src/app/globals.css`):

| Onde | Componente |
| --- | --- |
| Ordenar itens, projetos, galeria, depoimentos e FAQ | ReUI **Sortable** (dnd-kit: mouse, toque e teclado) |
| Envio de fotos (botão e área de soltar) | ReUI **useFileUpload** |
| Status (novo, publicado, rascunho…) | ReUI **Badge** |
| Aviso do modo demonstração e erros | ReUI **Alert** |
| Atividade recente no Início | ReUI **Timeline** |
| Usuários em Configurações | ReUI **Data Grid** (TanStack Table) |
| WhatsApp em Configurações | ReUI **Phone Input** |
| Botões, campos, seletores, diálogos, interruptores, avisos | shadcn/ui (Radix) + Sonner |

Os arquivos ficam em `src/components/ui` e `src/components/reui` e vêm da CLI: `npx shadcn@latest add @reui/<nome>` (o registro `@reui` já está em `components.json`). O site público não usa esses componentes: ele mantém o visual e as animações do protótipo aprovado.

## Rodar no computador

```bash
npm install
npm run dev        # http://localhost:3000  ·  painel em /admin
```

Sem nenhuma variável de ambiente o projeto já funciona:

- o **site** usa o conteúdo inicial (`src/lib/content/seed.ts`, os textos do protótipo aprovado);
- o **painel** abre em **modo demonstração**: dados de exemplo em memória, sem login e sem envio de e-mail. O que for publicado no painel aparece no site enquanto o servidor estiver de pé. Bom para apresentar e testar a interface.

Copie `.env.example` para `.env.local` e preencha as chaves para ligar cada serviço.

Outros comandos: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run db:seed-sql` (regera `supabase/seed.sql` a partir do conteúdo inicial).

## Estrutura

```
src/
  app/(site)/            home, /projetos/[slug], /loja, /loja/[slug], 404 — site público
  app/admin/             painel: login, senha, (painel)/… telas, auth/confirm
  app/api/email/         webhook do Resend (inbound + status) e anexos recebidos
  components/site/       Nav, rodapé, hero editorial, cenas de rolagem
  components/admin/      shell do painel, telas (views/), mídia, ordenação
  lib/content/           schema (zod) e conteúdo inicial
  lib/catalog/           produtos e variantes (zod), importador da planilha antiga, amostras de acabamento
  lib/cobogo.ts          gramática das peças de cobogó (mesma regra no SVG e no 3D)
  server/content.ts      leitura do conteúdo publicado, em cache com tags
  server/admin/          ações do painel + repositório (Supabase ou demonstração)
  server/catalog/        loja: vitrine em cache (tag catalog), ações e repositório de produtos e estoque
  server/actions/        formulário de contato
  emails/                modelos do React Email
  styles/                site.css e admin.css, portados do protótipo
supabase/migrations/     esquema, RLS, tempo real
```

### Como o conteúdo chega ao site

- Cada seção da home tem **rascunho** e **publicado** (`sections.draft` / `sections.published`). O público só consegue ler a coluna `published` (permissão por coluna no Postgres).
- O site lê tudo com `unstable_cache` marcado com as tags `content` e `projects`. Ao publicar, o painel chama `updateTag()` e a próxima visita já vê a versão nova. As páginas continuam estáticas (rápidas) entre uma publicação e outra.
- Usamos o modelo clássico de cache (`cacheComponents: false`) por previsibilidade no Amplify. Dá para migrar para `"use cache"` depois que o adaptador do Amplify suportar o Next 16 por completo.

### Marcação nos textos do painel

- `*palavras*` → destaque (âmbar no manifesto “Quem somos”, negrito nos outros textos)
- `[foto:/caminho/da/foto.jpg|Legenda]` → micro-foto dentro do manifesto (abre ao passar o mouse)
- Números de “Quem somos”: `17|anos` no título; `Título — descrição` no texto
- Parágrafos: separe com uma linha em branco

## Supabase

1. Crie o projeto (região **São Paulo**).
2. Rode as migrações em `supabase/migrations/` (SQL Editor, na ordem do nome, ou `npx supabase db push`) e depois `supabase/seed.sql` para carregar o conteúdo inicial.
3. **Authentication › Providers › Email:** desligue *Allow new users to sign up*. O acesso ao painel é só por convite.
4. **Primeiro admin:** em *Authentication › Users* convide o seu e-mail e rode no SQL Editor:
   ```sql
   insert into public.profiles (id, name, role)
   select id, 'Camila de Lelis', 'admin' from auth.users where email = 'camila@brasiliailuminacao.com.br';
   ```
   Depois disso, novos usuários são convidados pelo próprio painel (*Configurações › Usuários*).
5. **Authentication › URL Configuration:** *Site URL* = `https://www.brasiliailuminacao.com.br`; adicione `https://www.brasiliailuminacao.com.br/admin/auth/confirm` em *Redirect URLs* (e `http://localhost:3000/admin/auth/confirm` para testes).
6. **Authentication › Email Templates** (convite e redefinição de senha): troque o link por
   `{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin/senha` (no de senha, `type=recovery`).
   Recomendado: configure o SMTP do Supabase com o Resend para esses e-mails saírem do domínio da marca.
7. Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` (esta só no servidor: formulário de contato, webhook e convites).
8. Depois de criar o projeto, gere os tipos reais: `npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts`.

Quem pode o quê (RLS): visitantes leem só o publicado/visível; **editor** edita conteúdo, projetos, mídia e mensagens; **admin** também altera configurações e usuários.

## Amazon S3 + CloudFront (fotos e anexos)

1. Bucket `brasilia-iluminacao-media` em `sa-east-1`, **sem acesso público**.
2. Distribuição CloudFront com *Origin Access Control* para o bucket. A URL dela vai em `NEXT_PUBLIC_MEDIA_BASE_URL` (ou um domínio próprio, ex.: `midia.brasiliailuminacao.com.br`, com certificado do ACM em `us-east-1`).
3. CORS do bucket (o navegador envia direto para o S3):
   ```json
   [{ "AllowedOrigins": ["https://www.brasiliailuminacao.com.br", "http://localhost:3000"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
   ```
4. Usuário IAM só para o site, com esta política (`S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`):
   ```json
   { "Version": "2012-10-17", "Statement": [{ "Effect": "Allow", "Action": ["s3:PutObject", "s3:DeleteObject"], "Resource": "arn:aws:s3:::brasilia-iluminacao-media/*" }] }
   ```
5. Variáveis: `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_MEDIA_BASE_URL`.

O painel reduz as fotos no navegador (lado maior até 2400 px, WebP) antes de enviar. As fotos do conteúdo inicial ficam em `public/img`.

## Resend (e-mail)

1. Adicione e verifique o domínio `brasiliailuminacao.com.br` (registros SPF/DKIM no Route 53). `EMAIL_FROM="Brasília Iluminação <contato@brasiliailuminacao.com.br>"`.
2. `RESEND_API_KEY` e `EMAIL_TEAM_TO` (quem recebe o aviso de novo contato do formulário).
3. **Receber respostas no painel:** ative o recebimento num **subdomínio** (ex.: `respostas.brasiliailuminacao.com.br`, registro MX no Route 53) e preencha `EMAIL_INBOUND_DOMAIN` com ele. As respostas saem com `Reply-To: t-<id>@respostas…`, então o que o cliente responder cai na conversa certa. Usar um subdomínio não mexe na caixa de e-mail atual do domínio principal.
4. **Webhook:** em *Resend › Webhooks*, aponte para `https://www.brasiliailuminacao.com.br/api/email/inbound` com os eventos `email.received`, `email.delivered`, `email.opened` e `email.bounced`. Copie o segredo para `RESEND_WEBHOOK_SECRET`.

O formulário grava a conversa, avisa a equipe e manda uma confirmação para o cliente (quando ele informa e-mail). Anexos recebidos abrem por `/api/email/anexo`, só para quem está logado.

## Formulário: proteção contra spam

Sempre: campo-armadilha (honeypot) e validação no servidor. Opcional: **Cloudflare Turnstile** com `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`.

## AWS Amplify Hosting + Route 53

1. Amplify › *Create app* › conecte o repositório do GitHub, branch `main`. O `amplify.yml` já está pronto (Node 22, SSR).
2. Em *Environment variables*, cadastre todas as variáveis do `.env.example`. O build copia para `.env.production` as que o servidor precisa (o Amplify só entrega as variáveis do console às funções SSR desse jeito). O Amplify não aceita nomes começando com `AWS_`, por isso a região é `S3_REGION`.
3. *Custom domains*: adicione `brasiliailuminacao.com.br` (zona hospedada no Route 53); o Amplify cria os registros e o certificado. Redirecione o domínio sem `www` para `www`.
4. Defina `NEXT_PUBLIC_SITE_URL=https://www.brasiliailuminacao.com.br`.

**Atenção à versão:** o projeto usa Next.js 16. Antes de apontar o domínio, publique numa branch de teste e confira no Amplify: páginas de projeto, publicação pelo painel (cache por tags), login e o webhook. Se o Amplify ainda não suportar algum recurso do Next 16, a alternativa sem mudar o código é hospedar com o OpenNext (SST) na mesma conta AWS.

## Loja (fase 1: catálogo, estoque e compra pelo WhatsApp)

- **Produto** tem nome, categoria, descrição, ficha técnica, fotos e vídeos; o cliente escolhe por **acabamento**, **tamanho** e/ou **versão**. Cada combinação é uma **variante** com SKU, preço (vazio = “sob consulta”), saldo e forma de venda: **só pronta entrega** (padrão) ou **sob encomenda** (com prazo opcional).
- **Regra de estoque:** só aparece na loja o que pode ser vendido. Variante “só pronta entrega” sem saldo aparece esgotada; produto sem nenhuma variante vendável **sai da loja sozinho**, mesmo publicado, e volta quando entra estoque (o painel mostra “Sem estoque”).
- **Estoque** é um livro-razão (`stock_movements`): entradas, saídas, devoluções e inventários ficam registrados com quem fez; o saldo da variante (`stock_on_hand`) é atualizado por gatilho. O site só sabe se há pronta entrega, nunca o número exato (permissão por coluna).
- **Fotos e vídeos:** no editor do produto dá para enviar fotos, puxar da biblioteca, colar link de vídeo (YouTube, inclusive Shorts, Vimeo ou .mp4), arrastar para ordenar, tornar capa, ligar a uma variante e **publicar ou ocultar** cada item. Na loja, o vídeo só carrega o player (youtube-nocookie) quando a pessoa clica.
- **Vitrine** em `/loja`: filtros por categoria, acabamento, faixa de preço, pronta entrega e vídeo (com contagens), busca enquanto digita, ordem e paginação numerada; no celular os filtros abrem numa gaveta. `/loja/[slug]`: galeria por variante, preço e prazo da variante escolhida, ficha técnica e dados estruturados para o Google. A compra é concluída com uma consultora: o botão abre o WhatsApp com produto, variante, SKU e preço.
- **Importar planilhas:** *Loja › Produtos › Importar planilha* (só admin) aceita a planilha de produtos da loja antiga e a de fotos/vídeos (colunas `SKU` e `URL`). Produtos: itens da mesma peça viram um produto com variantes, os nomes são organizados e a quantidade vira saldo inicial; importar de novo só atualiza preços e acrescenta variantes. Mídia: cada link é ligado pelo SKU, pela família do SKU ou pelo nome; o mesmo link em produtos diferentes entra oculto, para conferir. Nada é apagado.
- **Modo demonstração:** `npm run catalog:import -- data/produtos.csv data/videos.csv` gera `data/catalogo.json`, que o painel e a vitrine usam sem Supabase. A pasta `data/` fica fora do git: o repositório é público e o catálogo é do cliente.
- Próximas fases (ver o plano): pedidos no painel, pagamento (AbacatePay atrás de uma interface própria), frete e nota fiscal.

## Decisões e pendências

- Hero: a foto escolhida em *Páginas › Hero* alterna com as capas de dois projetos publicados; na entrada, a luz acende como um dimmer.
- Movimento: revelações só por opacidade e poucos pixels; se o visitante pede menos movimento no sistema, tudo fica estático.
- As fotos dos produtos da seção Curadoria e das etapas do Luminotécnico ainda são fixas no código; dá para torná-las editáveis no painel numa próxima etapa.
- O painel em modo demonstração nunca liga em produção, a não ser com `ADMIN_DEMO=1`.
- Navegação do site com `<a>` (carga completa entre home e projetos) de propósito: as cenas do GSAP ficam mais previsíveis assim.
