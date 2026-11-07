"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ThreadStatus } from "@/lib/content/schema";
import { createAttachmentUpload, getThread, getThreads, reply, setThreadStatus } from "@/server/admin/actions";
import type { Thread } from "@/server/admin/types";
import { Icon } from "../icons";
import { ago, Chip, initials, PageHead, Skeleton, STATUS_LABEL, unwrap, useToast } from "../ui";

const FILTERS: Array<[string, string]> = [["todas", "Abertas"], ["novo", "Novas"], ["andamento", "Em andamento"], ["respondido", "Respondidas"], ["arquivado", "Arquivadas"]];
const TPL: Record<string, string> = {
  "Agendar conversa": "Olá, {nome}! Obrigada pelo contato. Que tal uma conversa de 30 minutos para eu entender melhor o seu espaço? Tenho horários na quinta e na sexta à tarde. Qual fica melhor para você?\n\nCamila de Lelis\nBrasília Iluminação",
  "Envio de orçamento": "Olá, {nome}! Segue o orçamento conforme conversamos. Qualquer dúvida, estou à disposição por aqui ou pelo WhatsApp.\n\nCamila de Lelis\nBrasília Iluminação",
  "Pedido de planta": "Olá, {nome}! Para começar, você consegue me enviar a planta baixa (PDF ou DWG) e algumas fotos dos ambientes? Com isso já consigo preparar uma proposta.\n\nCamila de Lelis\nBrasília Iluminação",
};

export function Inbox() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const selected = sp.get("t");
  const [filter, setFilter] = useState("todas");
  const [q, setQ] = useState(sp.get("q") ?? "");
  const threads = useQuery({ queryKey: ["threads"], queryFn: () => unwrap(getThreads()) });
  const all = threads.data ?? [];
  const needle = q.trim().toLowerCase();
  const list = all.filter(
    (t) =>
      (filter === "todas" ? t.status !== "arquivado" : t.status === filter) &&
      (!needle || `${t.name} ${t.email} ${t.subject} ${t.preview}`.toLowerCase().includes(needle)),
  );
  const count = (f: string) => (f === "todas" ? all.filter((t) => t.status !== "arquivado").length : all.filter((t) => t.status === f).length);
  const open = (id: string | null) => router.replace(id ? `${path}?t=${id}` : path, { scroll: false });

  return (
    <>
      <PageHead title="Mensagens" sub="Contatos do formulário e e-mails recebidos em contato@, numa só caixa." />
      <div className={`card inbox${selected ? " reading" : ""}`}>
        <div className="ib-l">
          <div className="flt">
            {FILTERS.map(([k, l]) => (
              <button key={k} className={filter === k ? "on" : undefined} onClick={() => setFilter(k)}>
                {l}
                <span>{count(k)}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>
            <input className="in" placeholder="Buscar nesta caixa" value={q} onChange={(e) => setQ(e.target.value)} style={{ padding: "8px 10px" }} aria-label="Buscar mensagens" />
          </div>
          <ul>
            {!threads.data && [0, 1, 2].map((i) => <li key={i}><Skeleton h={60} style={{ flex: 1 }} /></li>)}
            {threads.data && list.length === 0 && <div className="empty">Nenhuma conversa aqui.</div>}
            {list.map((t) => (
              <li key={t.id} className={`${selected === t.id ? "on " : ""}${t.unread ? "un" : ""}`} onClick={() => open(t.id)}>
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
                  <div className="row" style={{ marginTop: 6, gap: 6 }}>
                    <Chip s={t.status} />
                    {t.interest && <span className="tag">{t.interest}</span>}
                  </div>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="ib-r">
          {selected ? (
            <ThreadView key={selected} id={selected} onBack={() => open(null)} />
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
  const q = useQuery({ queryKey: ["thread", id], queryFn: () => unwrap(getThread(id)) });
  const [text, setText] = useState("");
  const [atts, setAtts] = useState<Array<{ name: string; url: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const t = q.data;

  // abrir marca como lida: atualiza a lista e o contador
  useEffect(() => {
    if (t) {
      qc.setQueryData<Thread[]>(["threads"], (old) => old?.map((x) => (x.id === t.id ? { ...x, unread: false } : x)));
    }
  }, [t, qc]);
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
        const up = await unwrap(createAttachmentUpload(f.type || "application/pdf", f.size));
        const r = await fetch(up.uploadUrl, { method: "PUT", body: f, headers: { "Content-Type": f.type || "application/pdf" } });
        if (!r.ok) throw new Error("Falha ao enviar o anexo.");
        setAtts((a) => [...a, { name: f.name, url: up.publicUrl }]);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Falha ao anexar");
    } finally {
      setUploading(false);
    }
  }

  if (!t) return q.isFetched ? <div className="empty">Conversa não encontrada.</div> : <Skeleton h={300} style={{ margin: 22 }} />;
  const first = t.name.split(" ")[0];
  const wa = t.phone ? `https://wa.me/55${t.phone.replace(/\D/g, "").replace(/^55/, "")}` : "";
  return (
    <>
      <div className="hd">
        <button className="btn ghost sm burger" onClick={onBack} aria-label="Voltar para a lista">
          <Icon name="back" />
        </button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2>{t.subject || "(sem assunto)"}</h2>
          <div className="meta">
            {[t.name, t.email, t.phone, t.city].filter(Boolean).join(" · ")} · via {t.source === "email" ? "e-mail" : "formulário"}
          </div>
        </div>
        {t.interest && <span className="tag">{t.interest}</span>}
        {wa && (
          <a className="btn sec sm" href={wa} target="_blank" rel="noopener">
            <Icon name="phone" />
            WhatsApp
          </a>
        )}
        <select value={t.status} onChange={(e) => status.mutate(e.target.value as ThreadStatus)} aria-label="Status da conversa">
          {(["novo", "andamento", "respondido", "arquivado"] as const).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="thread" ref={box}>
        {t.messages.map((m) => (
          <div key={m.id} className={`msg ${m.direction}`}>
            <div className="w">
              <b>{m.direction === "out" ? "Brasília Iluminação" : t.name}</b>
              {new Date(m.at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
            {(m.body || "(mensagem sem texto)").split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {m.attachments.map((a) =>
              a.url ? (
                <a className="att" key={a.name} href={a.url} target="_blank" rel="noopener">
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
          <span className="muted" style={{ fontSize: 12, alignSelf: "center", marginRight: 4 }}>
            Respostas prontas:
          </span>
          {Object.keys(TPL).map((k) => (
            <button key={k} type="button" onClick={() => setText(TPL[k].replace("{nome}", first))}>
              {k}
            </button>
          ))}
        </div>
        <textarea className="in" placeholder={t.email ? `Escreva sua resposta para ${first}…` : "Este contato deixou só telefone: responda pelo WhatsApp."} value={text} onChange={(e) => setText(e.target.value)} disabled={!t.email} aria-label="Resposta" />
        <div className="tb">
          <button className="btn ghost sm" type="button" onClick={() => file.current?.click()} disabled={uploading || !t.email}>
            <Icon name="clip" />
            {uploading ? "Enviando…" : "Anexar"}
          </button>
          <input ref={file} type="file" hidden multiple accept="application/pdf,image/*" onChange={(e) => (attach(e.target.files), (e.target.value = ""))} />
          <span className="muted" style={{ fontSize: 12 }}>
            {atts.map((a) => a.name).join(", ")}
          </span>
          <span className="sp" />
          <button className="btn pri" type="button" disabled={!text.trim() || send.isPending || !t.email} onClick={() => send.mutate()}>
            <Icon name="send" />
            {send.isPending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </>
  );
}
