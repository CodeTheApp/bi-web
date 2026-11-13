# Visual administrativo

O painel combina tipografia de sistema, densidade compacta, superfícies translúcidas e a cor âmbar da marca. O tema administrativo fica separado do site público e de sua prévia.

## Camadas e arquivos

| Responsabilidade                                | Local                                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| Estrutura das telas e acabamento do vidro       | `src/styles/admin.css`, `src/styles/admin-theme.css`                    |
| Shell, grupos flutuantes, conta e ações rápidas | `src/widgets/admin-shell/`                                              |
| Tema claro, escuro, sistema e lateral recolhida | `src/features/admin-appearance/`                                        |
| Ícones e animações compartilhados               | `src/shared/ui/icons/`                                                  |
| Controles administrativos e tabelas compactas   | `src/shared/ui/admin/`                                                  |
| Componentes de registros                        | `src/shared/ui/reui/`, `src/shared/ui/kokonutui/`                       |
| Prévia ao vivo                                  | `src/features/page-preview/`, `src/widgets/home/ui/LiveHomePreview.tsx` |

O vidro usa transparência, contorno claro e sombras leves na navegação e nas sobreposições. Campos, tabelas e textos usam superfícies mais estáveis. O degradê é fixo no viewport, concentrado à esquerda e abaixo. Textos correntes usam peso 400 e a hierarquia usa principalmente 500. Preferências de maior contraste ou menor transparência ajustam as superfícies.

## Navegação e preferências

A lateral oferece modos expandido e recolhido. Os grupos usam um único [Popover do Base UI](https://base-ui.com/react/components/popover), com múltiplos acionadores, identificação do acionador ativo e `openOnHover`. O Stack Panel do Kokonut mantém os níveis internos dentro do mesmo painel: uma linha abre o próximo nível com transição horizontal, e a ação de voltar retorna ao anterior. O viewport conserva uma altura estável ao navegar entre esses níveis, evitando que uma página mais curta retire a área interativa debaixo do ponteiro. Essa extensão é apenas de dimensionamento; hover, intenção de movimento, foco, clique, toque e fechamento continuam sob controle nativo do Base UI, sem temporizadores ou interceptações para reproduzi-los.

O Account Menu reúne a conta, aparência e saída; o Switch Button alterna o tema. As preferências ficam no store Zustand de aparência administrativa.

O Marking Menu permanece disponível pelo ícone no canto inferior e por `Alt+M`. Sidebar, painéis e ações rápidas usam o mesmo mapa de rotas e a mesma correspondência visual em `src/shared/ui/icons/semantic.ts`.

No celular, a navegação mantém fechamento por Escape/toque externo e gerenciamento de foco. Controles sem texto recebem rótulos acessíveis e tooltips. O provider Radix usa `disableHoverableContent`: a descrição fecha ao sair do acionador, e a camada visual não recebe eventos de ponteiro nem bloqueia controles por baixo. Diálogos de remoção apresentam o alvo e exigem confirmação; fluxos reversíveis usam Undo Button quando aplicável.

## Família de ícones

A entrada `src/shared/ui/icons/lucide.tsx` expõe componentes compatíveis com Lucide. Os desenhos e movimentos vêm de fontes locais de Lucide/Lucide Animated em `animated/`; `AnimatedSvg.tsx` faz o binding no botão, link, label, role interativo ou contêiner `data-icon-scope` mais próximo.

A animação ocorre nos elementos internos do SVG, por hover, foco ou pressão do controle inteiro, respeitando `prefers-reduced-motion`. O root continua sendo um SVG, sem wrappers que alterem alinhamento. Os adaptadores de nomes administrativos e da loja preservam tamanho, classe e estados como o coração preenchido dos favoritos.

Sidebar, submenus e Marking Menu compartilham o mapa semântico. Logotipos de marca, selo decorativo, cobogós, ilustrações de produto, QR codes e gráficos conservam seus desenhos próprios. As fontes e adaptações estão descritas em [Catálogo de ícones](lucide-icons.md). As licenças dos catálogos estão em `src/shared/ui/icons/LICENSE.lucide` e `LICENSE.lucide-animated`.

## Componentes conectados aos fluxos

| Uso                                                       | Implementação                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Listas, estoque, pedidos, clientes, usuários e relatórios | ReUI Data Grid compacto, com cabeçalhos e paginação                    |
| Reordenação de itens                                      | ReUI Sortable/dnd-kit, com mouse, toque e teclado                      |
| Upload de imagens e vídeos                                | Kokonut File Upload com fila, progresso, cancelamento e nova tentativa |
| Galeria pública de projetos                               | Kokonut Lightbox Grid, imagem inteira e acesso ao original             |
| Estado de edição                                          | Kokonut Save Status ligado ao salvamento real                          |
| Alertas de edição                                         | Inline Alert e controles compartilhados                                |
| Exclusão, remoção e ações reversíveis                     | Confirmação, Hold Button e Undo Button conforme o fluxo                |
| Visão geral e analytics                                   | Kokonut Metric Card/Spending Ring, com eventos e pedidos registrados   |
| Feedback global                                           | Sileo, com tema acompanhado pelo provider da aplicação                 |

Os componentes dos registros são adaptados: não devem voltar a usar dados de demonstração internos do catálogo visual. Tabelas mantêm ReUI; os gráficos e as interações usam Kokonut, preservando a hierarquia do painel.

## Prévia de páginas

A prévia compartilha `HomeContentView` com a home, usando fontes e estilos públicos dentro de um iframe autenticado. O editor transmite o rascunho por `postMessage`, validando origem, janela, chave da seção, esquema e revisão. Digitar não depende do salvamento e não remonta o iframe. O painel recolhe/expande com transição suave e mantém modos desktop/celular.

A prévia bloqueia navegação e envio de formulário. Publicação e salvamento automático permanecem separados da renderização ao vivo; a abertura em outra aba mostra a versão salva.

## Manutenção

Use as entradas compartilhadas de ícones e tabelas ao adicionar telas. Consulte [Arquitetura](architecture.md) para as fronteiras de cliente/servidor e execute `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` ao concluir uma alteração. Verificações visuais devem incluir estados vazios, erro, carregamento, teclado, tema escuro, movimento reduzido e largura móvel.
