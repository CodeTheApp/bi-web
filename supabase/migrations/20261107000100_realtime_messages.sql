-- Tempo real também nas mensagens (a caixa do painel atualiza a conversa aberta)
alter publication supabase_realtime add table public.messages;

-- Busca rápida das respostas pelo id do Resend (status de entrega)
create index if not exists messages_provider_id_idx on public.messages (provider_id);
