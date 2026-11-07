"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDashboard } from "@/server/admin/actions";
import { Icon } from "../icons";
import { ago, Chip, ErrorBox, initials, Skeleton, unwrap } from "../ui";
import { NewProjectButton } from "./Projects";

export function Dashboard({ name }: { name: string }) {
  const router = useRouter();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => unwrap(getDashboard()) });
  const h = new Date().getHours();
  const hi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const d = q.data;
  return (
    <>
      <div className="ph">
        <div>
          {/* a saudação depende do relógio de quem abre; o servidor pode estar em outro fuso */}
          <h1 suppressHydrationWarning>
            {hi}, {name.split(" ")[0]}
          </h1>
          <p>Um resumo do site e dos contatos de hoje.</p>
        </div>
        <NewProjectButton />
      </div>
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {!d ? (
        <div className="stats">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={110} />)}</div>
      ) : (
        <>
          <div className="stats">
            <div className="card stat hl">
              <small>Mensagens novas</small>
              <b>{d.unread}</b>
              <span>responda em até 24 h</span>
            </div>
            <div className="card stat">
              <small>Projetos publicados</small>
              <b>{d.published}</b>
              <span>de {d.projects} no portfólio</span>
            </div>
            <div className="card stat">
              <small>Rascunhos</small>
              <b>{d.drafts}</b>
              <span>{d.drafts ? "seções aguardando publicação" : "tudo publicado"}</span>
            </div>
            <div className="card stat">
              <small>Fotos na biblioteca</small>
              <b>{d.media}</b>
              <span>{d.mediaNoAlt} sem texto alternativo</span>
            </div>
          </div>
          <div className="dash">
            <div className="card">
              <div className="row" style={{ paddingRight: 16 }}>
                <h3>Últimas mensagens</h3>
                <span className="sp" />
                <Link className="btn ghost sm" href="/admin/mensagens">
                  Ver todas
                </Link>
              </div>
              <ul className="lst">
                {d.recent.length === 0 && <li className="empty" style={{ cursor: "default" }}>Nenhuma mensagem ainda.</li>}
                {d.recent.map((t) => (
                  <li key={t.id} onClick={() => router.push(`/admin/mensagens?t=${t.id}`)}>
                    <span className="av">{initials(t.name)}</span>
                    <span className="t">
                      <b>{t.name}</b>
                      <span>
                        {t.subject} · {t.interest || "—"}
                      </span>
                    </span>
                    <Chip s={t.status} />
                    <small className="muted">{ago(t.lastAt)}</small>
                  </li>
                ))}
              </ul>
            </div>
            <div className="stack">
              <div className="card">
                <h3>Atalhos</h3>
                <div className="quick">
                  <Link href="/admin/paginas"><Icon name="pen" />Editar textos</Link>
                  <Link href="/admin/projetos"><Icon name="folder" />Projetos</Link>
                  <Link href="/admin/midia"><Icon name="upload" />Enviar fotos</Link>
                  <Link href="/admin/depoimentos"><Icon name="quote" />Depoimentos</Link>
                </div>
              </div>
              <div className="card">
                <h3>Atividade recente</h3>
                <ul className="lst log">
                  {d.log.map((l, i) => (
                    <li key={i}>
                      <Icon name="clock" />
                      <span className="t">
                        <span style={{ color: "var(--ink)" }}>{l.text}</span>
                      </span>
                      <small className="muted">{ago(l.at)}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
