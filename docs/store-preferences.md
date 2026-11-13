# Preferências da loja

As opções são persistidas em `Settings.store`. Dados anteriores que não possuem esse objeto continuam usando o comportamento atual. O schema compartilhado é `storePreferencesSchema`, em `entities/store-settings`.

| Preferência             | Padrão   | Efeito                                                                                                                                            |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deliveryEnabled`       | `true`   | Permite receber no endereço; retirada permanece disponível quando a entrega é desativada.                                                         |
| `expressEnabled`        | `true`   | Inclui a opção expressa nas cotações.                                                                                                             |
| `pickupEnabled`         | `true`   | Exibe retirada no checkout e permite confirmá-la no servidor.                                                                                     |
| `pickupAddress`         | vazio    | Mostra o local no checkout e guarda uma cópia com o pedido. Vazio mantém o local combinado por WhatsApp.                                          |
| `pickupReadyDays`       | `1`      | Define o prazo de retirada, em dias úteis.                                                                                                        |
| `preparationDays`       | `0`      | Soma dias úteis de preparação aos prazos padrão e expresso.                                                                                       |
| `freeShippingFromCents` | `300000` | Entrega padrão gratuita a partir de R$ 3.000 em produtos após cupons. `null` desativa essa oferta; `0` torna a padrão gratuita sem compra mínima. |
| `checkoutNotice`        | vazio    | Aviso opcional antes da etapa de pagamento.                                                                                                       |

O schema impede desativar entrega e retirada ao mesmo tempo. Valores monetários são inteiros em centavos; prazos são inteiros e limitados a 60 dias.

`quoteShipping` aceita as preferências como quarto argumento opcional. Chamadas existentes e fixtures históricas continuam com os mesmos valores, métodos e prazos. A tabela regional permanece uma simulação com origem em Brasília/DF: a entrega padrão no DF continua gratuita e a expressa permanece paga. Não há um campo de origem que prometa recalcular uma transportadora inexistente.

`shippingOptions` e `placeOrder` leem as preferências persistidas no servidor e usam a mesma função de cotação. O limiar de frete grátis usa o subtotal após cupons. O checkout não aceita valores de frete, flags ou preferências enviados pelo navegador como autoridade. Quando uma configuração altera o total, a confirmação antiga é rejeitada antes de criar ou cobrar o pedido.

O layout público passa apenas as preferências da loja ao `ShopProvider`. Checkout e medidor da sacola usam essa configuração. Endereço e prazo de retirada são salvos no snapshot de entrega do pedido; mudanças futuras não reescrevem pedidos anteriores.

Parcelamento permanece somente informativo na aba Loja: o provedor atual é simulado, com a regra existente de até 10 parcelas e parcela mínima de R$ 100. Não foi criado um controle que sugira uma integração real de pagamento ou mude limites sem suporte completo do provedor.

Verificação: `tests/store-settings.test.ts`, `tests/store-settings-checkout.test.ts` e `tests/store-settings-ui.test.ts`, além dos testes existentes de cupons, loja e fixtures. A implementação não altera variáveis de ambiente nem grava configurações ou registros reais durante a validação.
