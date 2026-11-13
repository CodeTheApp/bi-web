# Carregamento do painel e de imagens

O carregamento acompanha a disponibilidade real de cada rota, consulta ou imagem. Não há espera mínima artificial, temporizador para simular uma resposta lenta ou bloqueio global até todos os dados chegarem.

## Rotas e shell persistente

As boundaries nativas do App Router são:

| Arquivo                                                | Fallback                                                         |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `src/app/admin/(painel)/loading.tsx`                   | Estrutura geral com título, indicadores e área de conteúdo       |
| `src/app/admin/(painel)/loja/pedidos/[id]/loading.tsx` | Estrutura de detalhe do pedido, com duas colunas em telas largas |

Ambas usam `AdminRouteLoading`. O Next coloca `loading.tsx` dentro do layout do segmento: o header, a lateral e os controles do shell permanecem montados durante a navegação. As consultas iniciadas no cliente têm seus próprios estados de carregamento; a boundary de rota não espera por TanStack Query. O detalhe do pedido reutiliza o mesmo fallback enquanto sua primeira consulta ainda não possui dados.

O header é um `motion.header` com `layoutRoot`. As transições compartilhadas do avatar do Account Menu usam esse referencial durante a restauração do scroll, em vez de transformar o deslocamento do documento em movimento do avatar. `AdminAccountMenu` é memoizado para mudanças de rota que não alteram a identidade. Os tamanhos existentes do header e do controle são preservados.

No tablet e no celular, o fundo da lateral usa `var(--glass)` e o texto usa `var(--ink)`. As cores acompanham os tokens do tema. A preferência de lateral recolhida afeta apenas telas a partir de 901px; o drawer móvel mantém os rótulos e a marca expandida.

## Consultas independentes e cache

Dashboard e analytics mostram cada bloco assim que sua consulta tem dados:

- `dashboard` alimenta os contadores e a atividade recente.
- `threads` alimenta as últimas mensagens e é compartilhada com o shell.
- `shop-analytics` alimenta pagamentos, vendas e categorias.
- `site-analytics` alimenta tráfego, visualizações e páginas mais vistas.

Blocos que compartilham uma chave também compartilham a consulta e o cache. Uma resposta lenta de tráfego não impede pagamentos de aparecer, e uma resposta lenta dos totais não esconde mensagens já disponíveis. As consultas de analytics atualizam a cada 30 segundos. O `QueryClient` vive no shell compartilhado, com `staleTime` padrão de 30 segundos.

O placeholder aparece quando o bloco ainda não tem dados. Uma atualização em segundo plano mantém o resultado anterior visível. Erros sem dados mostram uma ação para tentar novamente. O detalhe do pedido e o cadastro de cliente também preservam dados já carregados quando um refetch falha, exibindo o erro junto do conteúdo. A troca explícita do ambiente de demonstração pode invalidar o cache para carregar o conjunto escolhido.

`AdminBlockLoading` fornece versões `card` e `inline`, altura mínima configurável e rótulo opcional. O padrão ASCII é decorativo (`aria-hidden`); os contêineres usam `aria-busy`, e blocos com rótulo usam `role="status"`. As colunas do fallback de detalhe viram uma coluna em até 720px, e os indicadores passam de quatro para duas colunas.

## Revelação por imagem

`AsciiImage` mantém o tamanho definido pelo consumidor e controla cada foto separadamente. As miniaturas existentes reservam seus quadros: produtos, itens de pedido, biblioteca/seletor de mídia e galeria pública. Nenhuma dessas imagens condiciona o carregamento das demais ou a navegação.

O fluxo usa o carregamento nativo de `<img>`:

1. Enquanto a imagem está pendente, um padrão ASCII determinístico preenche o quadro.
2. Após `onLoad`, dois canvases geram uma amostra pixelada e os caracteres derivados da luminosidade da foto. A amostra respeita o recorte central de `object-fit: cover`.
3. CSS faz a passagem de caracteres para pixels e para a foto durante **420ms**. O fim da animação encerra a camada decorativa.

Uma imagem que já está completa no DOM e tem `naturalWidth` válido entra diretamente no estado pronto, sem repetir a revelação. Trocar `src` cria um novo estado por imagem. Com `prefers-reduced-motion`, o padrão fica estático e uma foto carregada aparece diretamente. Se a leitura dos pixels for bloqueada por CORS, a imagem continua sendo exibida normalmente, com a decoração disponível; não há proxy, fetch no servidor nem nova leitura de mídia privada. Uma falha de carregamento mostra “Imagem indisponível”.

As aplicações atuais são:

| Local                       | Conteúdo com revelação                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Biblioteca administrativa   | Fotos; vídeos conservam o player próprio                                            |
| Seletor de mídia            | Miniaturas das imagens disponíveis                                                  |
| Tabela de produtos          | Capa do produto                                                                     |
| Detalhe do pedido           | Miniatura das peças                                                                 |
| Galeria pública de projetos | Miniaturas do Lightbox Grid; a imagem ampliada conserva o fluxo próprio do lightbox |

A ideia visual tem como referência [ASCII Reveal, de aadixc0de no 21st.dev](https://21st.dev/@aadixc0de/components/ascii-reveal). A implementação deste projeto é própria, com React, canvas e CSS; não é uma cópia de código de acesso restrito dessa referência.

## Verificação

`tests/ascii-frame.test.ts` cobre luminosidade, transparência e limites das amostras. `tests/admin-analytics-blocks.test.ts` cobre respostas independentes e dados em cache durante erros de atualização. `tests/admin-detail-cache.test.ts` cobre a preservação do pedido e do cadastro/histórico do cliente, além do erro inicial sem dados. QA visual deve incluir imagens frias e já carregadas, falha de imagem/CORS, movimento reduzido, navegação com scroll e drawer em tema escuro.
