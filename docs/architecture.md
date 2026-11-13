# Arquitetura

O projeto usa o App Router do Next.js e organiza o código de interface por domínio e responsabilidade, seguindo Feature-Sliced Design. `src/app` continua sendo o diretório de rotas e layouts do framework. A camada de composição de páginas se chama `src/_pages`, para não ativar o Pages Router por acidente.

## Camadas

| Diretório | Responsabilidade | Exemplos |
| --- | --- | --- |
| `src/app` | Rotas, layouts, providers e integração com Next.js | Loja pública e painel administrativo |
| `src/_pages` | Composição de páginas | Produtos, mídia, financeiro e relatórios |
| `src/widgets` | Blocos compostos de interface | Header, navegação administrativa, editor de produto e home |
| `src/features` | Ações e fluxos de uso | Compra, filtros do catálogo, gestão de pedidos e categorias de mídia |
| `src/entities` | Dados e regras de domínio | Produto, pedido, carrinho, favoritos, conteúdo e analytics da loja |
| `src/shared` | Componentes, integrações e utilitários sem dependência das camadas acima | Shadcn, ReUI, Kokonut, notificações, URL state e Supabase |

As dependências seguem a ordem da tabela: uma camada pode usar a própria camada e as camadas abaixo. Por exemplo, uma feature usa entidades e componentes compartilhados; uma entidade não importa uma feature. Imports de tipos seguem a mesma direção.

`src/server` mantém autenticação, autorização, actions, repositórios e infraestrutura no servidor. `src/emails`, `src/styles` e `src/proxy.ts` preservam suas responsabilidades de framework. Esses diretórios não formam novas camadas de interface. A autorização de uma operação permanece na action ou serviço do servidor, independentemente de quem renderiza seu botão.

Os arquivos usam segmentos como `model`, `ui`, `api` e `lib` conforme a necessidade de cada domínio. Não é necessário criar segmentos vazios.

## APIs públicas e fronteira entre servidor e cliente

Exponha contratos pequenos por segmento ou slice, usando exports explícitos. Código externo deve preferir essas entradas públicas; código da própria slice pode importar arquivos internos diretamente. A migração ainda contém imports diretos entre segmentos e slices, portanto o teste de arquitetura não exige essa regra em todos os módulos.

Uma entrada importável pelo cliente não deve reexportar repositórios, credenciais ou módulos marcados com `server-only`. Quando uma slice precisa oferecer os dois ambientes, mantenha entradas separadas:

```text
entities/example/
  index.ts         # Tipos e regras compatíveis com cliente e servidor
  index.server.ts  # Leitura de dados e componentes exclusivos do servidor
```

```ts
// index.ts: contrato compatível com o cliente
export type { Example } from "./model/types";
export { exampleSchema } from "./model/schema";

// index.server.ts: importar apenas em código do servidor
import "server-only";
export { getExample } from "./api/read";
```

Evite juntar essas entradas em outro barrel. Até uma reexportação indireta pode levar `server-only` ao grafo de um Client Component. Use `import type` e `export type` para contratos que não precisam existir em runtime.

Server Actions com a diretiva `"use server"` são uma fronteira específica do Next.js: um Client Component pode importar a função e recebe uma referência de chamada ao servidor. Isso não libera imports de um repositório ou de um utilitário arbitrário do servidor. Preserve essas actions em módulos próprios e não misture suas exportações com componentes ou valores de runtime compartilhados.

## Estado

- **nuqs:** filtros, pesquisa, ordenação, paginação e seleção que devem sobreviver a reload e compartilhamento de URL. Parsers sem dependência de React podem vir de `nuqs/server`; hooks de edição ficam no cliente.
- **Zustand:** estado persistido do carrinho, favoritos e preferências locais, com validação do conteúdo recuperado do storage.
- **TanStack Query:** dados consultados no servidor, carregamento, erros e invalidação após mutações. Não substitui autorização nem validação no servidor.
- **Sileo:** feedback de operações, exposto pelo adaptador compartilhado de notificações.

Valores de compra, estoque e total do pedido continuam sendo conferidos no servidor. O conteúdo do storage ou da URL não constitui autorização para uma operação.

## Verificação automática

Execute `npx vitest run tests/architecture.test.ts` para verificar a estrutura. O teste usa a AST do TypeScript, resolve os aliases `@/` e imports relativos e verifica:

- Presença de `_pages` e `app`, sem `src/pages`.
- Ausência de módulos e imports nos antigos diretórios `components`, `lib`, `hooks` e `views`.
- Direção das camadas em imports, reexports, imports dinâmicos literais e referências de tipos.
- Ausência de dependências de runtime em `server-only`, `src/server` e módulos nativos de Node no grafo iniciado por `"use client"`, inclusive quando passam por barrels.

O rastreamento de runtime ignora imports explicitamente de tipos e para em módulos com `"use server"`. Arquivos `._*`, criados pelo Finder em volumes externos, não são código da aplicação e são ignorados.

O teste não substitui o build do Next.js: não interpreta imports calculados, não inspeciona a implementação de pacotes externos e não infere quais símbolos sem `import type` são usados apenas como tipos. Também não aplica isolamento entre slices da mesma camada nem exige APIs públicas para cada import. Esses são limites atuais da migração; não devem ser descritos como garantias já implantadas.

## Referências

- [Feature-Sliced Design com Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs): nomes reservados do framework e entradas públicas separadas por ambiente.
- [Camadas e direção dos imports](https://feature-sliced.design/docs/reference/layers).
- [Contratos de API pública](https://feature-sliced.design/docs/reference/public-api).
