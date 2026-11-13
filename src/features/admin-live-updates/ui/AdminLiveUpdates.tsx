"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "@/shared/api/supabase/client";
import { hasSupabase } from "@/shared/api/supabase/env";
import {
  ADMIN_LIVE_TOPICS,
  type AdminLiveWorkspace,
} from "@/shared/model/admin-live";
import { announceAdminWorkspaceChange } from "@/shared/lib/admin-workspace-lifecycle";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { connectDemoEvents } from "../model/demo-connection";
import {
  ALL_ADMIN_QUERY_ROOTS,
  createLiveInvalidator,
  TABLE_TOPICS,
} from "../model/invalidation";

export function AdminLiveUpdates({
  realtimeEnabled,
  userId,
  initialWorkspace,
}: {
  realtimeEnabled: boolean;
  userId: string;
  initialWorkspace?: AdminLiveWorkspace;
}) {
  const client = useQueryClient();
  const reloadButton = useRef<HTMLButtonElement>(null);
  const [workspaceChanged, setWorkspaceChanged] = useState(false);
  useEffect(() => {
    const invalidator = createLiveInvalidator((keys) => {
      const roots = new Set(keys);
      void client.invalidateQueries({
        predicate: (query) => roots.has(String(query.queryKey[0])),
        refetchType: "active",
      });
    });
    if (!realtimeEnabled) {
      const source = new EventSource("/api/admin/events");
      const disconnect = connectDemoEvents(
        source,
        (event) => invalidator.push(event.topics),
        () => {
          invalidator.dispose();
          announceAdminWorkspaceChange();
          const roots = new Set(ALL_ADMIN_QUERY_ROOTS);
          void client.cancelQueries({
            predicate: (query) => roots.has(String(query.queryKey[0])),
          });
          setWorkspaceChanged(true);
        },
        initialWorkspace,
      );
      return () => {
        disconnect();
        invalidator.dispose();
      };
    }
    if (!hasSupabase) return () => invalidator.dispose();
    const db = getSupabaseBrowser();
    const channel = db.channel(`admin-live:${userId}`);
    for (const [table, topics] of Object.entries(TABLE_TOPICS)) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(table === "admin_notification_reads"
            ? { filter: `user_id=eq.${userId}` }
            : {}),
        },
        () => invalidator.push(topics),
      );
    }
    let connected = false;
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (connected) invalidator.push(ADMIN_LIVE_TOPICS);
        connected = true;
      }
    });
    return () => {
      invalidator.dispose();
      void db.removeChannel(channel);
    };
  }, [client, realtimeEnabled, userId, initialWorkspace]);

  return (
    <AlertDialog open={workspaceChanged}>
      <AlertDialogContent
        className="adm admin-popover rounded-2xl p-5"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          reloadButton.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>O ambiente de demonstração mudou</AlertDialogTitle>
          <AlertDialogDescription>
            Outra aba alterou os dados exibidos neste servidor. Atualize antes
            de continuar para manter os ambientes separados. Alterações que
            ainda não foram salvas serão descartadas ao atualizar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button ref={reloadButton} onClick={() => window.location.reload()}>
            Atualizar ambiente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
