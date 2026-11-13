"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDashboard, getThreads } from "@/shared/api/admin-reads";
import {
  Timeline,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/shared/ui/reui/timeline";
import { AdminBlockLoading } from "@/shared/ui/admin/AdminBlockLoading";
import { ago, Chip, ErrorBox, initials, unwrap } from "@/shared/ui/admin/ui";
import { buttonVariants } from "@/shared/ui/button";

const useDashboardData = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) => unwrap(getDashboard({ signal })),
    staleTime: 60_000,
  });

export function DashboardCounters() {
  const query = useDashboardData();
  const data = query.data;
  return (
    <div
      className="stats dashboard-counters"
      aria-label="Resumo do conteúdo"
      aria-busy={!data && query.isPending}
    >
      {!data ? (
        query.error ? (
          <div className="card dashboard-counter-error">
            <ErrorBox error={query.error} retry={() => query.refetch()} />
          </div>
        ) : (
          [
            "Carregando mensagens novas",
            "Carregando projetos",
            "Carregando rascunhos",
            "Carregando biblioteca",
          ].map((label) => (
            <AdminBlockLoading key={label} label={label} minHeight={114} />
          ))
        )
      ) : (
        <>
          <div className="card stat hl">
            <small>Mensagens novas</small>
            <b>{data.unread}</b>
            <span>responda em até 24 h</span>
          </div>
          <div className="card stat">
            <small>Projetos publicados</small>
            <b>{data.published}</b>
            <span>de {data.projects} no portfólio</span>
          </div>
          <div className="card stat">
            <small>Rascunhos</small>
            <b>{data.drafts}</b>
            <span>
              {data.drafts ? "seções aguardando publicação" : "tudo publicado"}
            </span>
          </div>
          <div className="card stat">
            <small>Fotos na biblioteca</small>
            <b>{data.media}</b>
            <span>{data.mediaNoAlt} sem texto alternativo</span>
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardMessages() {
  const query = useQuery({
    queryKey: ["threads"],
    queryFn: ({ signal }) => unwrap(getThreads({ signal })),
    staleTime: 60_000,
  });
  const rows = query.data
    ? [...query.data]
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
        .slice(0, 4)
    : null;
  return (
    <section
      className="card dashboard-messages"
      aria-labelledby="dashboard-messages-title"
      aria-busy={!rows && query.isPending}
    >
      <div className="row" style={{ paddingRight: 16 }}>
        <h3 id="dashboard-messages-title">Últimas mensagens</h3>
        <span className="sp" />
        <Link
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          href="/admin/mensagens"
        >
          Ver todas
        </Link>
      </div>
      {!rows ? (
        query.error ? (
          <ErrorBox error={query.error} retry={() => query.refetch()} />
        ) : (
          <AdminBlockLoading
            minHeight={232}
            label="Carregando últimas mensagens"
            variant="inline"
          />
        )
      ) : (
        <ul className="lst">
          {rows.length === 0 && (
            <li className="empty">Nenhuma mensagem ainda.</li>
          )}
          {rows.map((thread) => (
            <li key={thread.id}>
              <Link
                className="dashboard-message-link"
                href={`/admin/mensagens?t=${thread.id}`}
              >
                <span className="av">{initials(thread.name)}</span>
                <span className="t">
                  <b>{thread.name}</b>
                  <span>
                    {thread.subject} · {thread.interest || "—"}
                  </span>
                </span>
                <Chip s={thread.status} />
                <small className="muted">{ago(thread.lastAt)}</small>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DashboardActivity() {
  const query = useDashboardData();
  return (
    <section
      className="card dashboard-activity"
      aria-labelledby="dashboard-activity-title"
      aria-busy={!query.data && query.isPending}
    >
      <h3 id="dashboard-activity-title">Atividade recente</h3>
      {!query.data ? (
        query.error ? (
          <ErrorBox error={query.error} retry={() => query.refetch()} />
        ) : (
          <AdminBlockLoading
            minHeight={205}
            label="Carregando atividade recente"
            variant="inline"
          />
        )
      ) : (
        <Timeline defaultValue={query.data.log.length} className="px-4 pb-4">
          {query.data.log.length === 0 && (
            <p className="muted">Nada por aqui ainda.</p>
          )}
          {query.data.log.map((log, index) => (
            <TimelineItem
              key={`${log.at}:${index}`}
              step={index + 1}
              className="group-data-[orientation=vertical]/timeline:ms-5"
            >
              <TimelineHeader>
                <TimelineSeparator className="group-data-[orientation=vertical]/timeline:-left-5 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.25rem)] group-data-[orientation=vertical]/timeline:translate-y-5" />
                <TimelineDate className="mb-0.5 text-[11px] font-normal">
                  {ago(log.at)}
                </TimelineDate>
                <TimelineTitle className="text-xs font-normal">
                  {log.text}
                </TimelineTitle>
                <TimelineIndicator className="flex size-2 items-center justify-center border-primary bg-primary/20 group-data-[orientation=vertical]/timeline:-left-5" />
              </TimelineHeader>
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </section>
  );
}
