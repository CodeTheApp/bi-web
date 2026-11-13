"use client";
import { getThread, getThreads } from "@/shared/api/admin-reads";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInboxUrlState } from "@/features/manage-inbox/client";
import type { INBOX_FILTERS } from "@/features/manage-inbox";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ThreadStatus } from "@/entities/site-content";
import {
  createAttachmentUpload,
  markThreadRead,
  reply,
  setThreadStatus,
} from "@/server/admin/actions";
import type { Thread } from "@/entities/admin";
import { Icon } from "@/shared/ui/admin/icons";
import {
  ago,
  Chip,
  Choice,
  ControlTooltip,
  initials,
  PageHead,
  Skeleton,
  STATUS_LABEL,
  unwrap,
  useToast,
} from "@/shared/ui/admin/ui";

import "./inbox-responsive.css";

const FILTERS: Array<[(typeof INBOX_FILTERS)[number], string]> = [
  ["todas", "Abertas"],
  ["novo", "Novas"],
  ["andamento", "Em andamento"],
  ["respondido", "Respondidas"],
  ["arquivado", "Arquivadas"],
];
const TPL: Record<string, string> = {
  "Agendar conversa":
    "Olá, {nome}! Obrigada pelo contato. Que tal uma conversa de 30 minutos para eu entender melhor o seu espaço? Tenho horários na quinta e na sexta à tarde. Qual fica melhor para você?\n\nCamila de Lelis\nBrasília Iluminação",
  "Envio de orçamento":
    "Olá, {nome}! Segue o orçamento conforme conversamos. Qualquer dúvida, estou à disposição por aqui ou pelo WhatsApp.\n\nCamila de Lelis\nBrasília Iluminação",
  "Pedido de planta":
    "Olá, {nome}! Para começar, você consegue me enviar a planta baixa (PDF ou DWG) e algumas fotos dos ambientes? Com isso já consigo preparar uma proposta.\n\nCamila de Lelis\nBrasília Iluminação",
};

const noop = () => () => {};

export function Inbox() {
  const { selected, filter, setFilter, q, setQ, open } = useInboxUrlState();
  const threads = useQuery({
    queryKey: ["threads"],
    queryFn: ({ signal }) => unwrap(getThreads({ signal })),
  });
  // a caixa fica dentro de <Suspense> (useSearchParams) e hidrata depois do menu, que já pode ter
  // buscado as conversas; até hidratar, mostra o mesmo esqueleto que veio do servidor
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const data = hydrated ? threads.data : undefined;
  const all = data ?? [];
  const needle = q.trim().toLowerCase();
  const list = all.filter(
    (t) =>
      (filter === "todas" ? t.status !== "arquivado" : t.status === filter) &&
      (!needle ||
        `${t.name} ${t.email} ${t.subject} ${t.preview}`
          .toLowerCase()
          .includes(needle)),
  );
  const count = (f: string) =>
    f === "todas"
      ? all.filter((t) => t.status !== "arquivado").length
      : all.filter((t) => t.status === f).length;

  return (
    <>
      <PageHead
        title="Mensagens"
        sub="Contatos do formulário e e-mails recebidos em contato@, numa só caixa."
      />
      <div
        className={`card inbox admin-inbox-inbox${selected ? " reading" : ""}`}
      >
        <div className="ib-l">
          <div className="inbox-filters">
            <label className="f">
              Caixa
              <Choice<(typeof INBOX_FILTERS)[number]>
                label="Filtrar conversas por status"
                value={filter}
                onChange={setFilter}
                options={FILTERS.map(([value, label]) => [
                  value,
                  `${label} (${count(value)})`,
                ])}
              />
            </label>
            <label className="f">
              Buscar
              <Input
                className="in"
                placeholder="Nome, assunto ou mensagem"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar nesta caixa"
              />
            </label>
          </div>
          <ul>
            {!data &&
              [0, 1, 2].map((i) => (
                <li key={i}>
                  <Skeleton h={60} style={{ flex: 1 }} />
                </li>
              ))}
            {data && list.length === 0 && (
              <div className="empty">Nenhuma conversa aqui.</div>
            )}
            {list.map((t) => (
              <li
                key={t.id}
                className={`${selected === t.id ? "on " : ""}${t.unread ? "un" : ""}`}
                onClick={() => open(t.id)}
              >
                <span className="av">{initials(t.name)}</span>
                <span className="t">
                  <span className="r">
                    <b>{t.name}</b>
                    <time dateTime={t.lastAt}>{ago(t.lastAt)}</time>
                  </span>
                  <div className="s">{t.subject}</div>
                  <div className="p">
                    {t.lastOut ? "Você: " : ""}
                    {t.preview}
                  </div>
                  <div
                    className="row"
                    style={{ marginTop: 6, gap: 6, flexWrap: "wrap" }}
                  >
                    <Chip s={t.status} />
                    {t.interest && <span className="tag">{t.interest}</span>}
                  </div>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ib-r">
          {selected && hydrated ? (
            <ThreadView
              key={selected}
              id={selected}
              onBack={() => open(null)}
            />
          ) : (
            <div className="empty" style={{ margin: "auto" }}>
              <Icon name="mail" size={34} style={{ color: "var(--line-2)" }} />
              <p>Escolha uma conversa para ler e responder.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ThreadView({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["thread", id],
    queryFn: ({ signal }) => unwrap(getThread(id, { signal })),
  });
  const [text, setText] = useState("");
  const [atts, setAtts] = useState<Array<{ name: string; url: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const t = q.data;
  const readRequested = useRef<string | null>(null);

  const markRead = useMutation({
    mutationFn: (threadId: string) => unwrap(markThreadRead(threadId)),
    onSuccess: (_result, threadId) => {
      qc.setQueryData<Thread>(["thread", threadId], (old) =>
        old ? { ...old, unread: false } : old,
      );
      qc.setQueryData<Thread[]>(["threads"], (old) =>
        old?.map((thread) =>
          thread.id === threadId ? { ...thread, unread: false } : thread,
        ),
      );
    },
    onError: (error) => toast.error(error.message),
  });
  const markAsRead = markRead.mutate;
  const threadId = t?.id;
  const threadUnread = t?.unread;
  // Reads are pure GETs. Opening an unread thread performs one explicit write.
  useEffect(() => {
    if (threadId && !threadUnread) readRequested.current = null;
    if (threadId && threadUnread && readRequested.current !== threadId) {
      readRequested.current = threadId;
      markAsRead(threadId);
    }
  }, [threadId, threadUnread, markAsRead]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [t?.messages.length]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["thread", id] });
    qc.invalidateQueries({ queryKey: ["threads"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const status = useMutation({
    mutationFn: (s: ThreadStatus) => unwrap(setThreadStatus(id, s)),
    onSuccess: () => {
      toast("Status atualizado");
      refresh();
    },
    onError: (e) => toast(e.message),
  });
  const send = useMutation({
    mutationFn: () => unwrap(reply(id, text, atts)),
    onSuccess: () => {
      toast(`Resposta enviada para ${t?.email}`);
      setText("");
      setAtts([]);
      refresh();
    },
    onError: (e) => toast(e.message),
  });

  async function attach(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, 5)) {
        const up = await unwrap(
          createAttachmentUpload(f.type || "application/pdf", f.size),
        );
        const r = await fetch(up.uploadUrl, {
          method: "PUT",
          body: f,
          headers: { "Content-Type": f.type || "application/pdf" },
        });
        if (!r.ok) throw new Error("Falha ao enviar o anexo.");
        setAtts((a) => [...a, { name: f.name, url: up.publicUrl }]);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha ao anexar");
    } finally {
      setUploading(false);
    }
  }

  if (!t)
    return q.isFetched ? (
      <div className="empty">Conversa não encontrada.</div>
    ) : (
      <Skeleton h={300} style={{ margin: 22 }} />
    );
  const first = t.name.split(" ")[0];
  const wa = t.phone
    ? `https://wa.me/55${t.phone.replace(/\D/g, "").replace(/^55/, "")}`
    : "";
  return (
    <>
      <div className="hd">
        <ControlTooltip label="Voltar para a lista de mensagens">
          <Button
            variant="ghost"
            size="sm"
            className="burger"
            onClick={onBack}
            aria-label="Voltar para a lista de mensagens"
          >
            <Icon name="back" />
          </Button>
        </ControlTooltip>
        <div className="admin-inbox-identity">
          <h2>{t.subject || "(sem assunto)"}</h2>
          <div className="meta">
            {[t.name, t.email, t.phone, t.city].filter(Boolean).join(" · ")} ·
            via {t.source === "email" ? "e-mail" : "formulário"}
          </div>
        </div>
        <div className="admin-inbox-thread-actions">
          {t.interest && <span className="tag">{t.interest}</span>}
          {wa && (
            <a
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href={wa}
              target="_blank"
              rel="noopener"
            >
              <Icon name="phone" />
              WhatsApp
            </a>
          )}
          <Choice<ThreadStatus>
            label="Status da conversa"
            size="sm"
            className="admin-inbox-status"
            value={t.status}
            options={(
              ["novo", "andamento", "respondido", "arquivado"] as const
            ).map((x) => [x, STATUS_LABEL[x]] as [ThreadStatus, string])}
            onChange={(v) => status.mutate(v)}
          />
        </div>
      </div>
      <div className="thread" ref={box}>
        {t.messages.map((m) => (
          <div key={m.id} className={`msg ${m.direction}`}>
            <div className="w">
              <b>{m.direction === "out" ? "Brasília Iluminação" : t.name}</b>
              {new Date(m.at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {(m.body || "(mensagem sem texto)").split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {m.attachments.map((a) =>
              a.url ? (
                <a
                  className="att"
                  key={a.name}
                  href={a.url}
                  target="_blank"
                  rel="noopener"
                >
                  <Icon name="clip" />
                  {a.name}
                </a>
              ) : (
                <span className="att" key={a.name}>
                  <Icon name="clip" />
                  {a.name}
                </span>
              ),
            )}
            {m.direction === "out" && m.delivery && (
              <div className="st">
                <Icon name="check" size={13} /> {m.delivery}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="reply">
        <div className="tpl">
          <span
            className="muted"
            style={{ fontSize: 12, alignSelf: "center", marginRight: 4 }}
          >
            Respostas prontas:
          </span>
          {Object.keys(TPL).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setText(TPL[k].replace("{nome}", first))}
            >
              {k}
            </button>
          ))}
        </div>
        <label className="f">
          Resposta
          <Textarea
            className="in"
            placeholder={
              t.email
                ? `Escreva sua resposta para ${first}…`
                : "Este contato deixou só telefone: responda pelo WhatsApp."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!t.email}
            aria-label="Resposta"
          />
        </label>
        <div className="tb" style={{ flexWrap: "wrap" }}>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => file.current?.click()}
            disabled={uploading || !t.email}
          >
            <Icon name="clip" />
            {uploading ? "Enviando…" : "Anexar"}
          </Button>
          <input
            ref={file}
            type="file"
            hidden
            multiple
            accept="application/pdf,image/*"
            onChange={(e) => (attach(e.target.files), (e.target.value = ""))}
          />
          <span
            className="muted"
            style={{ fontSize: 11, minWidth: 0, overflowWrap: "anywhere" }}
          >
            {atts.map((a) => a.name).join(", ")}
          </span>
          <span className="sp" />
          <Button
            type="button"
            disabled={!text.trim() || send.isPending || !t.email}
            onClick={() => send.mutate()}
          >
            <Icon name="send" />
            {send.isPending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </div>
    </>
  );
}
