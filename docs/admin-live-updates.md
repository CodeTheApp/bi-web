# Atualizações do painel

`AdminLiveUpdates`, montado uma vez no shell persistente, centraliza a comunicação. Sua API pública fica em `@/features/admin-live-updates/client` e recebe `realtimeEnabled`, `userId` e `initialWorkspace` opcional. O layout captura o ambiente de demonstração antes do primeiro await e o shell repassa esse valor para detectar inclusive uma troca entre o HTML inicial e o primeiro handshake SSE. As consultas HTTP continuam responsáveis por obter os dados e verificar permissões; o transporte de eventos informa apenas quais dados ficaram desatualizados.

## Supabase

Uma conexão nativa usa um canal com assinaturas por tabela. `model/invalidation.ts` associa cada tabela aos tópicos e às query keys afetadas. Os avisos de leitura de notificações recebem o filtro do usuário atual; as permissões RLS existentes continuam determinando as linhas que podem ser recebidas. Os payloads das linhas não são inseridos diretamente no cache.

A migration `20261112001000_admin_live_updates.sql` acrescenta à publicação Realtime somente tabelas que existem e ainda não foram publicadas. Ela não muda policies, grants ou acesso aos dados. Deve ser aplicada ao configurar o Supabase; adicioná-la ao repositório não a executa no banco conectado.

Quando o canal nativo se reconecta depois da primeira conexão, as consultas administrativas ficam desatualizadas para recuperar eventos que podem ter ocorrido durante a desconexão. Os ciclos de foco/reconexão normais do React Query continuam como recuperação adicional. Não há polling periódico no shell, notificações, pedidos ou analytics.

Referência da API: [Postgres Changes do Supabase](https://supabase.com/docs/guides/realtime/postgres-changes).

## Demonstração

O navegador mantém um `EventSource` nativo para `GET /api/admin/events`. A rota exige `demoAllowed()` e um contexto de equipe válido; recusa outra origem, não serve o transporte em instalações Supabase e responde com `no-store` e `text/event-stream`. Os eventos contêm somente identificador do processo, revisão, ambiente e nomes de tópicos.

O event bus fica no processo do servidor, preservado durante HMR. Escritas no repositório administrativo publicam depois do sucesso; arquivos de catálogo, loja e leituras de notificações carregam o ambiente em seu nome. Contatos recebidos e eventos novos de analytics publicam os tópicos correspondentes. Operações capturam o ambiente antes de aguardar trabalho, mantendo uma escrita iniciada no ambiente original mesmo se outra aba mudar a seleção.

Leituras não publicam eventos. Marcar uma conversa como lida publica somente na transição de não lida para lida. Confirmar novamente uma notificação já lida não grava nem publica outra atualização. Isso evita ciclos de evento, refetch e nova escrita.

Há um comentário de heartbeat a cada 25 segundos para manter a conexão aberta; ele não consulta banco ou repositório. Ao desconectar, os listeners e o timer são removidos. O `EventSource` controla a reconexão e envia `Last-Event-ID`. Um histórico limitado a 256 eventos devolve só os tópicos perdidos no ambiente correspondente. Se o processo reiniciou ou o histórico expirou, o cliente recupera as consultas administrativas; a primeira conexão inicia uma linha de base sem reproduzir eventos antigos como notificações.

Esse transporte é destinado à demonstração com um processo. Uma implantação distribuída precisa do Supabase Realtime ou de um barramento compartilhado entre processos; o event bus local não pretende sincronizar servidores diferentes.

## Cache e ambientes

Eventos recebidos em uma janela de 100 ms são agrupados em uma invalidação. Consultas ativas afetadas são atualizadas; consultas inativas ficam stale para a próxima abertura. O cache existente permanece visível enquanto a atualização ocorre. Uma alteração em mídia, por exemplo, não dispara uma consulta de pedidos.

Quando outra aba muda entre “Com exemplos” e “Sem exemplos”, a conexão é encerrada e o evento compartilhado `admin:workspace-changed` cancela sincronamente os autosaves pendentes de Páginas e Depoimentos/FAQ. Páginas também descarta operações ainda na fila e bloqueia o flush de saída; mutations de listas que aguardavam outra gravação verificam o bloqueio antes de executar. Os rascunhos continuam na memória local.

Um AlertDialog nativo bloqueia novos cliques no painel. Ele pede uma atualização explícita e avisa que alterações ainda não salvas serão descartadas. Não há reload silencioso nem substituição automática dos rascunhos locais. A troca iniciada pelo próprio controle de ambiente mantém seu fluxo de atualização existente.

O bloqueio não desfaz uma mutation já iniciada. Operações que já obtiveram seu repositório mantêm o ambiente capturado; novos fluxos de autosave devem ouvir o mesmo evento de ciclo de vida e cancelar trabalho ainda não enviado.

## Verificação

Os testes cobrem agrupamento de eventos, descarte de trabalho pendente, journal e reconexão, separação dos ambientes, cancelamento/abort do stream, heartbeat, permissões/origem da rota e emissões de mutações reais sem ciclos de leitura. Eles não se conectam ao banco nem alteram dados de demonstração do servidor em execução.
