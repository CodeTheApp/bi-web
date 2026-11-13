"use client";
import {
  getAdminNotificationContext,
  getAdminNotifications,
} from "@/shared/api/admin-reads";

import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Inbox,
  ShoppingBag,
  UserPlus,
  LoaderCircle,
} from "@/shared/ui/icons/lucide";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { ControlTooltip, ago, unwrap } from "@/shared/ui/admin/ui";
import { notify } from "@/shared/lib/notify";
import type {
  AdminNotification,
  AdminNotificationFeed,
} from "@/entities/admin-notification";
import { markAdminNotificationsRead } from "../api/actions";
import { notificationObserver } from "../model/observer";
import {
  showAdminNotification,
  showNotificationOverflow,
} from "../model/toasts";
import "./admin-notifications.css";

const ICONS = { customer: UserPlus, order: ShoppingBag, message: Inbox };

export function AdminNotifications({ userId }: { userId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const context = useQuery({
    queryKey: ["admin-notification-context", userId],
    queryFn: ({ signal }) => unwrap(getAdminNotificationContext({ signal })),
    staleTime: Infinity,
  });
  const scope = context.data?.scope ?? "pending";
  const key = ["admin-notifications", userId, scope];
  const feed = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => unwrap(getAdminNotifications(scope, { signal })),
    enabled: context.data?.userId === userId,
    refetchOnWindowFocus: true,
  });
  const mark = useMutation({
    mutationFn: (ids: string[]) =>
      unwrap(markAdminNotificationsRead(scope, ids)),
    onMutate: async (ids) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<AdminNotificationFeed>(key);
      if (previous) {
        const read = new Set(ids);
        client.setQueryData(key, {
          ...previous,
          items: previous.items.map((item) =>
            read.has(item.id) ? { ...item, read: true } : item,
          ),
        });
      }
      return previous;
    },
    onError: (error, _ids, previous) => {
      if (previous) client.setQueryData(key, previous);
      notify.error(error.message);
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });
  const markRead = (notification: AdminNotification) => {
    if (!notification.read) mark.mutate([notification.id]);
  };

  useEffect(() => {
    if (!feed.data) return;
    const fresh = notificationObserver
      .getState()
      .observe(`${userId}:${feed.data.scope}`, feed.data);
    for (const item of fresh.slice(0, 5)) {
      showAdminNotification(item, { userId, scope: feed.data.scope }, () => {
        void unwrap(markAdminNotificationsRead(feed.data!.scope, [item.id]))
          .then(() =>
            client.invalidateQueries({
              queryKey: ["admin-notifications", userId, feed.data!.scope],
            }),
          )
          .catch((error: Error) => notify.error(error.message));
        router.push(item.href);
      });
    }
    if (fresh.length > 5)
      showNotificationOverflow(
        fresh.length - 5,
        { userId, scope: feed.data.scope },
        () => setOpen(true),
      );
  }, [feed.data, userId, router, client]);

  const items = feed.data?.items ?? [];
  const unread = items.filter((item) => !item.read);
  const visible = onlyUnread ? unread : items;
  const error = context.error || feed.error;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ControlTooltip
        label={
          unread.length
            ? `${unread.length} notificações não lidas`
            : "Notificações"
        }
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="admin-notifications-trigger"
            aria-label={
              unread.length
                ? `Notificações, ${unread.length} não lidas`
                : "Notificações"
            }
          >
            <Bell size={18} strokeWidth={1.5} aria-hidden="true" />
            {unread.length > 0 && (
              <span className="admin-notifications-badge" aria-hidden="true">
                {unread.length > 99 ? "99+" : unread.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
      </ControlTooltip>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="adm admin-popover admin-notifications-popover"
        aria-labelledby={titleId}
      >
        <header className="admin-notifications-header">
          <div>
            <h2 id={titleId}>Notificações</h2>
            <p>Clientes, pedidos e mensagens.</p>
          </div>
          <ControlTooltip label="Marcar todas como lidas">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Marcar todas como lidas"
              disabled={!unread.length || mark.isPending}
              onClick={() => mark.mutate(unread.map((item) => item.id))}
            >
              <Check size={16} aria-hidden="true" />
            </Button>
          </ControlTooltip>
        </header>
        <div
          className="admin-notifications-filters"
          aria-label="Filtrar notificações"
        >
          <button
            type="button"
            aria-pressed={!onlyUnread}
            onClick={() => setOnlyUnread(false)}
          >
            Todas
          </button>
          <button
            type="button"
            aria-pressed={onlyUnread}
            onClick={() => setOnlyUnread(true)}
          >
            Não lidas {unread.length > 0 && <span>{unread.length}</span>}
          </button>
        </div>
        {error ? (
          <div className="admin-notifications-empty" role="alert">
            <p>Não foi possível buscar as notificações.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void context.refetch();
                void feed.refetch();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        ) : feed.isLoading || context.isLoading ? (
          <div className="admin-notifications-empty" role="status">
            <LoaderCircle
              className="admin-notifications-loading"
              size={18}
              aria-hidden="true"
            />
            <p>Buscando notificações…</p>
          </div>
        ) : visible.length ? (
          <ul
            className="admin-notifications-list"
            aria-label="Atividades recentes"
          >
            {visible.map((item) => {
              const Icon = ICONS[item.kind];
              return (
                <li key={item.id} data-unread={!item.read || undefined}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      markRead(item);
                      setOpen(false);
                    }}
                  >
                    <span className="admin-notifications-icon">
                      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className="admin-notifications-copy">
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                      <time dateTime={item.createdAt}>
                        {ago(item.createdAt)}
                      </time>
                    </span>
                    {!item.read && (
                      <span
                        className="admin-notifications-dot"
                        aria-label="Não lida"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="admin-notifications-empty">
            <Bell size={23} strokeWidth={1.3} aria-hidden="true" />
            <p>
              {onlyUnread
                ? "Todas as notificações foram lidas."
                : "Nenhuma notificação por enquanto."}
            </p>
            <span>Novos clientes, pedidos e mensagens aparecerão aqui.</span>
          </div>
        )}
        <footer className="admin-notifications-footer">
          Atividades dos últimos 120 dias.
        </footer>
      </PopoverContent>
    </Popover>
  );
}
