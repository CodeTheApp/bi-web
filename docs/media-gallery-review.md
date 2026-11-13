# Revisão da biblioteca de imagens

A principal limitação era a hierarquia: cada fotografia dividia o card com três campos de formulário. Isso dificultava percorrer e comparar imagens. A miniatura também não oferecia uma ação para examinar a fotografia inteira.

## Mudanças desta revisão

- **Fotografia primeiro:** grade com imagem, nome e categoria visíveis. Os campos de nome e texto alternativo ficam em “Editar informações”. A categoria continua acessível por select em cada imagem.
- **Ampliação identificável:** ação “Ampliar” nas imagens, sem depender de hover, com visualização inteira, zoom, arraste, setas, contador e Escape para fechar.
- **Categorias cadastradas:** registro independente das imagens, criação pelo botão “Categorias”, contagem por categoria e manutenção de categorias ainda vazias. As imagens existentes receberam uma organização inicial sem substituir escolhas já feitas.
- **Busca e filtros separados da edição:** filtrar a biblioteca não altera categorias nem apaga rascunhos dos cards. Nome e descrição acessível permanecem campos distintos.
- **Operação por teclado:** ações nomeadas, foco no visualizador e retorno à galeria ao fechar.

## Referências e interpretação

O [Fotos da Apple](https://support.apple.com/en-ie/guide/photos/pht8b9ba4aa9/mac) documenta a visualização ampliada, zoom, arraste, navegação por setas e Escape. Essa referência orienta os controles do visualizador.

O [Lightroom na web](https://helpx.adobe.com/lightroom/web/get-set-up/learn-the-basics/tour-the-workspace.html) separa os modos de grade e detalhe. Minha interpretação para esta biblioteca foi reduzir formulários abertos na grade e concentrar a inspeção da fotografia em uma visualização dedicada.

O [Pixieset](https://help.pixieset.com/hc/en-us/articles/115003795652-Design-Settings-for-Your-Collections) oferece ajustes de apresentação da grade e controles com ícones acompanhados de texto. Aqui, a ação “Ampliar” mantém a função descobrível, inclusive no celular.

As [galerias fullscreen do Format](https://www.format.com/website-templates/fullscreen) reforçam a direção de dar protagonismo à imagem e manter a navegação discreta. Essa é uma referência visual, sem reproduzir um template específico.

## Organização inicial

Residencial: 7 imagens; Comercial: 12; Equipe: 1; Luminárias: 5; Detalhes arquitetônicos: 1. Paisagismo foi cadastrada vazia para uso futuro. Imagens novas podem permanecer em “Sem categoria” até a escolha de uma categoria cadastrada.

No modo demonstração, os dados seguem o funcionamento em memória do painel. Para Supabase, a migração `20261112000200_media_categories.sql` cria o registro e organiza as imagens existentes.
