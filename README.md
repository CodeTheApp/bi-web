# Brasília Iluminação — site, loja e painel

Site institucional com animações de rolagem, galeria de projetos e loja com favoritos, sacola, cupons e checkout. O painel reúne conteúdo, mídia, produtos, estoque, pedidos, clientes, mensagens, analytics e relatórios.

| Área                 | Implementação                                                                       |
| -------------------- | ----------------------------------------------------------------------------------- |
| Aplicação            | Next.js 16, App Router, React 19, TypeScript e Tailwind v4                          |
| Movimento            | GSAP, ScrollTrigger e Lenis no site; Motion nos componentes interativos             |
| Interface            | Shadcn/Radix, ReUI e Kokonut UI, com componentes locais em `src/shared/ui`          |
| Ícones               | Lucide e fontes animadas adaptadas de Lucide Animated, por uma facade compartilhada |
| Estado               | nuqs na URL, Zustand persist no navegador e TanStack Query para dados do servidor   |
| Notificações         | Sileo, com um Toaster global e adaptador em `src/shared/lib/notify.ts`              |
| Banco e autenticação | Supabase: Postgres, RLS, Auth e Realtime                                            |
| Arquivos e e-mail    | S3/CloudFront; Resend e React Email                                                 |
| Tipografia           | Belleza e Montserrat no site; fontes de sistema no painel                           |

## Rodar no computador

```bash
npm install
npm run dev        # http://localhost:3000 · painel em /admin
```

Sem Supabase, o painel abre em demonstração no desenvolvimento. Conteúdo, mensagens e analytics de demonstração ficam em memória; catálogo e dados da loja usam arquivos locais em `data/`, fora do Git. O modo demo em produção exige `ADMIN_DEMO=1`. Copie `.env.example` para `.env.local` para configurar os serviços.

Comandos: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run db:seed-sql` e `npm run catalog:import`.

## Estrutura

```text
src/
  app/                  rotas, layouts, providers e endpoints do Next.js
  _pages/               composição das páginas públicas e administrativas
  widgets/              home, header, rodapé, galeria, shell e visão geral de analytics
  features/             edição, biblioteca de mídia, compra, cupons e preferências
  entities/             produto, pedido, conteúdo, carrinho, favoritos e métricas
  shared/
    ui/                 Shadcn, ReUI, Kokonut, controles e ícones compartilhados
    lib/                persistência, parsers, eventos e utilitários
    api/                contratos e clientes Supabase
  server/               autorização, actions, repositórios, cache, arquivos e e-mail
  styles/               estilos públicos e tema administrativo
  emails/               modelos React Email
supabase/migrations/    esquema, políticas, analytics, mídia e checkout com cupons
```

A direção das dependências segue Feature-Sliced Design. `_pages` evita conflito com o Pages Router do Next. Veja [Arquitetura](docs/architecture.md) e [APIs de estado](docs/public-state-apis.md).

## Conteúdo e prévia ao vivo

- **Páginas** edita as 13 seções da home. Ordem e visibilidade são controladas no painel; textos e imagens têm rascunho separado do publicado. As fotos das etapas do Luminotécnico são editáveis e acompanham a etapa na reordenação.
- O salvamento automático usa fila por workspace. Publicar preserva alterações concorrentes e invalida as tags de conteúdo e o HTML da home. O público recebe somente o conteúdo publicado.
- A prévia usa o mesmo `HomeContentView` da home em um iframe autenticado. Cada edição é transmitida por `postMessage`, validando origem, janela, seção, esquema e revisão. Não depende de salvar, não envia o rascunho na URL e mantém o iframe montado ao recolher/expandir. Oferece modos desktop e celular; links e envios ficam desativados nesse quadro.
- O Save Status do Kokonut acompanha o estado real do editor. Remoções de itens abrem confirmação antes de alterar o rascunho.
- O cache usa o modelo clássico (`cacheComponents: false`), com `unstable_cache`, tags e invalidação nas ações de publicação.

Marcação dos textos: `*palavras*` destaca trechos; `[foto:/img/foto.jpg|Legenda]` insere micro-foto no manifesto; `17|anos` separa número e unidade; linhas em branco separam parágrafos.

## Mídia e galerias

A biblioteca permite nome, descrição acessível, categoria cadastrada, busca e filtro entre ativos e arquivados. O cadastro de categorias abre ao lado de **Enviar arquivos**. O upload Kokonut recebe imagens e vídeos; o seletor de capas e fotos mostra apenas imagens, enquanto o editor de produto também aceita vídeos.

A galeria pública de cada projeto usa o **Lightbox Grid** do Kokonut, sem a antiga faixa “Em cena”. Imagens abrem inteiras, com navegação, Escape, gestos e acesso ao original. A biblioteca e as galerias de edição têm visualização ampliada, zoom de imagem e reprodução de vídeo. Arquivar preserva arquivos; exclusões e remoções usam confirmação, Hold Button ou ações reversíveis conforme o fluxo.

## Loja e checkout

Os cards oferecem adição direta à sacola quando existe uma única variante com preço válido. Peças com variantes levam à escolha de opções na página do produto; peças sem preço disponível levam à consulta. A adição usa o mesmo estado persistido da loja e abre a sacola.

- Produtos têm variantes por acabamento, tamanho ou versão, SKU, preço, saldo e política de pronta entrega ou encomenda. Publicação e disponibilidade determinam a presença na vitrine: produtos sem variante vendável saem da loja até voltar a haver saldo ou uma opção sob encomenda.
- A vitrine tem busca, filtros com contagens, ordenação e paginação; variante e foto selecionadas também podem ser restauradas pela URL com nuqs.
- Favoritos, sacola, CEP e código de cupom usam Zustand persist, com validação, migração das chaves anteriores e sincronização entre abas. A sessão do cliente continua sendo validada no servidor.
- O checkout reúne endereço, opção de entrega ou retirada, cupom, revisão e confirmação com Slide to Confirm, incluindo confirmação por teclado. Preços, disponibilidade, frete e desconto são conferidos novamente no servidor; a chave de checkout protege contra pedidos duplicados.
- **Cupons** em `/admin/loja/cupons` podem ser percentuais ou fixos, com período, valor mínimo, ativação e limite de usos. O pedido guarda o desconto e o cupom aplicados. Tear Button, Particle Button e Cart Button estão ligados às ações reais da interface.
- Pedidos, histórico de pagamento, clientes e movimentos de estoque ficam disponíveis no painel. O contato por WhatsApp permanece como alternativa de atendimento.
- **Pagamento atual:** `src/server/shop/payments.ts` usa um provedor simulado. O fluxo de Pix/cartão pode ser demonstrado, mas a cobrança real ainda exige implementar um gateway.

O editor de produto envia fotos e vídeos, seleciona da biblioteca, aceita links de vídeo, ordena mídias e controla capa, variante e visibilidade. A importação de produtos e mídia continua disponível para administradores. `npm run catalog:import -- data/produtos.csv data/videos.csv` gera o catálogo local; `data/` não é versionado.

## Analytics, financeiro e relatórios

`/admin` reúne a visão geral e `/admin/analytics` detalha tráfego e resultados. Os gráficos **Metric Card** e **Spending Ring** do Kokonut recebem eventos e pedidos registrados. Há visualizações por período, páginas mais vistas e interações na loja; períodos sem registros têm estados vazios.

O endpoint `/api/analytics` recebe eventos próprios do site. O coletor usa sessão anônima, remove parâmetros da URL e respeita Do Not Track. As consultas administrativas são autenticadas.

**Loja → Financeiro** mostra pagamentos, estornos e valores aguardando confirmação; **Relatórios** mostra pedidos, produtos e categorias. As tabelas usam ReUI Data Grid compacto, filtros/ordenação/paginação na URL e CSV. Datas usam o horário de Brasília. Totais dos pedidos incluem frete e descontos; rankings de produtos e categorias usam o valor dos itens antes de descontos, sem frete. O modelo não registra custos, taxas ou repasses bancários.

## Interface administrativa

A navegação usa o Stack Panel do Kokonut em um Popover nativo do Base UI, com lateral recolhível, Account Menu e Marking Menu no canto inferior, acessível também por `Alt+M`. Um único `Popover.Root` coordena os acionadores com `openOnHover`; os níveis internos deslizam dentro do mesmo painel, com ação de voltar. O viewport mantém uma altura estável para a navegação interna não retirar o painel debaixo do ponteiro. Sidebar, painéis e ações rápidas compartilham os ícones de `src/shared/ui/icons/semantic.ts`.

O tema claro/escuro/sistema e o estado da lateral são persistidos. Liquid Glass fica nas superfícies de navegação e sobreposição, com bordas definidas; campos e tabelas mantêm fundos legíveis. O degradê do painel permanece fixo à esquerda e abaixo.

Os ícones entram por `src/shared/ui/icons/lucide.tsx`, com fontes locais em `animated/` e binding no controle inteiro: hover, foco e pressão. `data-icon-scope` cobre cartões e outros contêineres. Movimento reduzido é respeitado; marcas legítimas, cobogós, ilustrações e gráficos não são substituídos por ícones. Veja [Visual administrativo](docs/admin-design.md) e [Catálogo de ícones](docs/lucide-icons.md).

Os registros `@reui` e `@kokonutui` estão em `components.json`. Shadcn fornece os controles básicos; ReUI, tabelas, ordenação e componentes de dados; Kokonut, navegação, feedback, upload, galeria, gráficos e interações. Os componentes foram adaptados aos dados e às ações do projeto.

## Configurar os serviços

Aplique as migrações em ordem. Além dos esquemas iniciais de conteúdo, catálogo e loja, as migrações de novembro adicionam metadados/categorias de mídia, coleta de analytics, vídeo/arquivamento e cupons com checkout transacional. Alterar os arquivos SQL locais não aplica as mudanças a uma instância Supabase existente.

## Supabase

1. Crie o projeto (região **São Paulo**).
2. Rode as migrações em `supabase/migrations/` (SQL Editor, na ordem do nome, ou `npx supabase db push`) e depois `supabase/seed.sql` para carregar o conteúdo inicial.
3. **Authentication › Providers › Email:** desligue _Allow new users to sign up_. O acesso ao painel é só por convite.
4. **Primeiro admin:** em _Authentication › Users_ convide o seu e-mail e rode no SQL Editor:
   ```sql
   insert into public.profiles (id, name, role)
   select id, 'Camila de Lelis', 'admin' from auth.users where email = 'camila@brasiliailuminacao.com.br';
   ```
   Depois disso, novos usuários são convidados pelo próprio painel (_Configurações › Usuários_).
5. **Authentication › URL Configuration:** _Site URL_ = `https://www.brasiliailuminacao.com.br`; adicione `https://www.brasiliailuminacao.com.br/admin/auth/confirm` em _Redirect URLs_ (e `http://localhost:3000/admin/auth/confirm` para testes).
6. **Authentication › Email Templates** (convite e redefinição de senha): troque o link por
   `{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin/senha` (no de senha, `type=recovery`).
   Recomendado: configure o SMTP do Supabase com o Resend para esses e-mails saírem do domínio da marca.
7. Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` (esta só no servidor: formulário de contato, webhook e convites).
8. Depois de criar o projeto, gere os tipos reais: `npx supabase gen types typescript --project-id <id> > src/shared/api/supabase/database.types.ts`.

Visitantes leem o conteúdo público e visível. As ações de conteúdo e loja exigem uma pessoa da equipe; configurações, usuários e importação de planilhas têm verificações administrativas próprias. A autorização continua no servidor e nas políticas RLS.

## Amazon S3 + CloudFront (imagens, vídeos e anexos)

1. Bucket `brasilia-iluminacao-media` em `sa-east-1`, **sem acesso público**.
2. Distribuição CloudFront com _Origin Access Control_ para o bucket. A URL dela vai em `NEXT_PUBLIC_MEDIA_BASE_URL` (ou um domínio próprio, ex.: `midia.brasiliailuminacao.com.br`, com certificado do ACM em `us-east-1`).
3. CORS do bucket (o navegador envia direto para o S3):
   ```json
   [
     {
       "AllowedOrigins": [
         "https://www.brasiliailuminacao.com.br",
         "http://localhost:3000"
       ],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. Usuário IAM só para o site, com esta política (`S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::brasilia-iluminacao-media/*"
       }
     ]
   }
   ```
5. Variáveis: `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_MEDIA_BASE_URL`.

O envio usa o File Upload do Kokonut, com fila por arquivo, progresso, cancelamento e nova tentativa. Imagens aceitas: JPG, PNG, WebP e AVIF; são otimizadas no navegador. Vídeos aceitos: MP4, WebM e MOV. Os limites do servidor ficam em `src/shared/lib/upload-policy.ts`: 15 MB para imagens e 100 MB para vídeos com S3. Sem armazenamento, o envio embutido de demonstração aceita até 2,5 MB. As fotos iniciais ficam em `public/img`.

## Resend (e-mail)

1. Adicione e verifique o domínio `brasiliailuminacao.com.br` (registros SPF/DKIM no Route 53). `EMAIL_FROM="Brasília Iluminação <contato@brasiliailuminacao.com.br>"`.
2. `RESEND_API_KEY` e `EMAIL_TEAM_TO` (quem recebe o aviso de novo contato do formulário).
3. **Receber respostas no painel:** ative o recebimento num **subdomínio** (ex.: `respostas.brasiliailuminacao.com.br`, registro MX no Route 53) e preencha `EMAIL_INBOUND_DOMAIN` com ele. As respostas saem com `Reply-To: t-<id>@respostas…`, então o que o cliente responder cai na conversa certa. Usar um subdomínio não mexe na caixa de e-mail atual do domínio principal.
4. **Webhook:** em _Resend › Webhooks_, aponte para `https://www.brasiliailuminacao.com.br/api/email/inbound` com os eventos `email.received`, `email.delivered`, `email.opened` e `email.bounced`. Copie o segredo para `RESEND_WEBHOOK_SECRET`.

O formulário grava a conversa, avisa a equipe e manda uma confirmação para o cliente (quando ele informa e-mail). Anexos recebidos abrem por `/api/email/anexo`, só para quem está logado.

## Formulário: proteção contra spam

Sempre: campo-armadilha (honeypot) e validação no servidor. Opcional: **Cloudflare Turnstile** com `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`.

## AWS Amplify Hosting + Route 53

1. Amplify › _Create app_ › conecte o repositório do GitHub, branch `main`. O `amplify.yml` já está pronto (Node 22, SSR).
2. Em _Environment variables_, cadastre todas as variáveis do `.env.example`. O build copia para `.env.production` as que o servidor precisa (o Amplify só entrega as variáveis do console às funções SSR desse jeito). O Amplify não aceita nomes começando com `AWS_`, por isso a região é `S3_REGION`.
3. _Custom domains_: adicione `brasiliailuminacao.com.br` (zona hospedada no Route 53); o Amplify cria os registros e o certificado. Redirecione o domínio sem `www` para `www`.
4. Defina `NEXT_PUBLIC_SITE_URL=https://www.brasiliailuminacao.com.br`.

Valide SSR, autenticação, publicação e invalidação de cache, checkout e webhooks no ambiente configurado antes de associar o domínio. O arquivo `amplify.yml` contém a configuração de build; sua presença não indica uma implantação realizada.
