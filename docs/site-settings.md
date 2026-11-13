# Configurações de empresa, marca e integrações

`/admin/config?aba=empresa|loja|marca|equipe|integracoes` usa abas Radix acessíveis e nuqs. Administradores editam e salvam os campos; editores consultam configurações sem acesso à lista de usuários. A aba de equipe mantém os convites, papéis, perfis e avatares existentes.

O botão de salvar só fica disponível quando há alterações. SaveStatus acompanha edição, gravação, sucesso e erro. A validação indica o campo e abre a aba correspondente. Uma falha de atualização em segundo plano conserva o formulário carregado e o rascunho. Leituras em tempo real atualizam formulários limpos; rascunhos preservam a baseline original. Ao salvar, somente folhas efetivamente editadas são enviadas e mescladas sobre o estado atual no servidor, evitando reverter mudanças independentes de outro editor. Salvar atualiza o cache de conteúdo e os layouts, e `router.refresh()` reaplica a marca do painel sem apagar preferências locais.

## Dados e publicação

As configurações continuam no JSON da tabela `settings`; não é necessária uma migration. `company`, `brand` e `store` são opcionais no tipo legado. `normalizeSettings` completa os padrões nos repositórios e no conteúdo público. `mergeSettings` valida o resultado de um merge de grupos, para que uma atualização parcial não apague contatos ou assets irmãos por causa de defaults do Zod.

- Empresa: nome comercial, razão social opcional, endereço público, cidade, horário e URL de mapa. Contato da home e rodapé usam os mesmos dados. A razão social preenchida identifica o copyright. O e-mail público não altera o endereço de login de nenhum usuário.
- Marca: logos para fundos claro e escuro; símbolos compactos para o menu móvel e o painel; favicon e imagem social padrão. Biblioteca de mídia e URL são suportadas. Campos vazios preservam os arquivos originais. Logos têm limites de tamanho e `object-fit: contain`. Projetos e produtos continuam usando as respectivas imagens sociais específicas.
- Ícone e imagem social precisam de um endereço público: arquivo publicado na biblioteca ou URL HTTP(S)/local. Uploads inline da demonstração podem ser usados nos logos, mas são recusados para esses dois assets porque serviços externos não conseguem buscar uma imagem inline. O painel explica a restrição no campo.
- Loja: o módulo `store-settings` valida e fornece as regras de entrega, retirada e checkout. As alterações são verificadas também no servidor do checkout.

O favicon `.ico` do scaffold foi removido para evitar a prioridade do arquivo de metadata sobre o ícone configurável. O fallback é o símbolo existente `/img/bi-escuro.svg`; nenhum asset da marca foi removido.

## Integrações

O DTO privado devolve somente booleanos: demonstração, Supabase, e-mail de saída, recebimento de e-mails, armazenamento S3, pagamento real/simulado e Turnstile. As chaves e credenciais nunca são devolvidas ao browser. “Configurado” significa que as variáveis exigidas pela implementação atual estão presentes; não é um teste externo de conectividade. O pagamento é identificado como simulado enquanto esse for o provedor implementado. Não há botões que prometam uma conexão inexistente.

## Verificação

`tests/site-settings.test.ts` cobre leitura de JSON legado, fallbacks da marca, metadata efetiva, validação de URLs/inline assets, regras de operação e deep links. `tests/settings-actions.test.ts` cobre permissão administrativa, preservação por updates parciais, bloqueio de input inválido, concorrência entre editores, lista de usuários protegida e DTO de status sem segredos. O teste de arquitetura continua cobrindo os limites FSD e os imports server-only.
