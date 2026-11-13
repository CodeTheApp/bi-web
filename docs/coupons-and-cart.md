# Cupons e interações da loja

Acesse **Loja → Cupons** no painel. A listagem usa ReUI DataGrid, busca e filtros na URL com nuqs, ordenação e paginação. O cadastro permite desconto percentual ou fixo, valor mínimo de produtos, início/fim e limite de pedidos. Não há promoção ativa de exemplo.

O servidor valida o cupom ao cotar e novamente no fechamento. Preço e disponibilidade vêm do catálogo; valores de desconto enviados pelo navegador são ignorados. Se o total confirmado mudar, a compra exige nova confirmação. O desconto se aplica aos produtos, sem reduzir o frete. O limite para frete grátis e o parcelamento usam o valor após o desconto. O pedido guarda o código, o desconto e os parâmetros da promoção no momento da compra.

Cupons com limite reservam um uso quando o pedido é criado, incluindo pedidos aguardando pagamento. Cancelar o pedido libera a capacidade; o histórico do desconto continua preservado. Cupons com pedidos não podem ser excluídos ou ter o código renomeado; desative-os para encerrar uma promoção. Reenvios com a mesma chave de checkout retornam o mesmo pedido sem criar nova cobrança.

## Persistência e banco

Somente o código do cupom é persistido no navegador, no store Zustand `bi:cupom`. Cartões, documentos, endereço e valores de desconto não entram nesse storage.

No Supabase, aplique `supabase/migrations/20261112000600_shop_coupons.sql`. Ela adiciona cupons, reservas, snapshots nos pedidos e a RPC `create_shop_checkout`, disponível apenas para a chave de serviço. A RPC bloqueia o cupom e cria o pedido e o uso na mesma transação, evitando gastar a última utilização em dois checkouts concorrentes. Pedidos antigos continuam compatíveis; no modo demonstração, a operação preserva o estado existente e faz validação/inserção sem ceder a execução entre elas.

A interface de pagamento existente é preservada. O Slide to Confirm chama a mesma ação de fechamento, com alternativa explícita para teclado e para quem prefere confirmar por botão; Pix é gerado após a confirmação. Nenhum provedor de cobrança externo foi adicionado por essa mudança.

## Componentes Kokonut

Os componentes foram obtidos do registro oficial e adaptados para os fluxos reais, mantendo créditos MIT:

- Particle Button nos favoritos, adicionar à sacola e salvar cupom.
- Tear Button para abrir o campo de cupom.
- Cart Button e seu controle de quantidade na sacola, ligados ao mesmo store de itens.
- Slide to Confirm na confirmação final, com o valor e o método selecionado.
- Hold Button para excluir cupons sem histórico; o modal só fecha depois do sucesso no servidor.

Todos respeitam movimento reduzido e oferecem operação por teclado.
