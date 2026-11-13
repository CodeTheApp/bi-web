"use client";
import { getList } from "@/shared/api/admin-reads";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import HoldButton from "@/shared/ui/kokonutui/hold-button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/shared/ui/alert-dialog";
import { deleteListItem, saveList } from "@/server/admin/actions";
import type { ListItem } from "@/entities/admin";
import { Icon } from "@/shared/ui/admin/icons";
import { Grip, SortableItem, SortableList } from "@/shared/ui/admin/Sortable";
import {
  ControlTooltip,
  ErrorBox,
  PageHead,
  Skeleton,
  Switch,
  unwrap,
  useDebounced,
  useToast,
} from "@/shared/ui/admin/ui";

import "./lists-responsive.css";
import { onAdminWorkspaceChange } from "@/shared/lib/admin-workspace-lifecycle";

export function Lists() {
  return (
    <>
      <PageHead
        title="Depoimentos e FAQ"
        sub="Alterações são salvas automaticamente. Use os interruptores para escolher o que aparece no site."
      />
      <div className="two">
        <ListCard kind="testimonials" title="Depoimentos" />
        <ListCard kind="faqs" title="Perguntas frequentes" />
      </div>
    </>
  );
}

function ListCard({
  kind,
  title,
}: {
  kind: "testimonials" | "faqs";
  title: string;
}) {
  const q = useQuery({
    queryKey: ["list", kind],
    queryFn: ({ signal }) => unwrap(getList(kind, { signal })),
  });
  return (
    <div className="card">
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {q.data ? (
        <Editor kind={kind} title={title} initial={q.data} />
      ) : (
        <Skeleton h={320} />
      )}
    </div>
  );
}

function Editor({
  kind,
  title,
  initial,
}: {
  kind: "testimonials" | "faqs";
  title: string;
  initial: ListItem[];
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const itemsRef = useRef(initial);
  const createdIds = useRef(new Set<string>());
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const workspaceChanged = useRef(false);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const save = useMutation({
    // em fila: uma gravação por vez, na ordem em que aconteceram
    scope: { id: `list-${kind}` },
    mutationFn: ({ items }: { items: ListItem[] }) => {
      if (workspaceChanged.current)
        throw new Error("O ambiente mudou. Atualize antes de continuar.");
      return unwrap(
        saveList(kind, items, {
          createIds: items
            .filter((item) => createdIds.current.has(item.id))
            .map((item) => item.id),
        }),
      );
    },
    onSuccess: (saved, submitted) => {
      if (workspaceChanged.current) return;
      // This runs before the next queued mutation. A successful creation must
      // never be replayed as a creation by a later autosave.
      for (const item of submitted.items) createdIds.current.delete(item.id);
      const serverIds = new Set(saved.map((item) => item.id));
      const localIds = new Set(itemsRef.current.map((item) => item.id));
      const merged = [
        ...itemsRef.current.filter(
          (item) => serverIds.has(item.id) || createdIds.current.has(item.id),
        ),
        ...saved.filter((item) => !localIds.has(item.id)),
      ];
      itemsRef.current = merged;
      setItems(merged);
      qc.setQueryData(["list", kind], saved);
    },
    onError: (e) => {
      if (!workspaceChanged.current) toast.error(e.message);
    },
  });
  const later = useDebounced((list: ListItem[]) => {
    if (!workspaceChanged.current) save.mutate({ items: list });
  }, 800);
  useEffect(
    () =>
      onAdminWorkspaceChange(() => {
        workspaceChanged.current = true;
        later.cancel();
      }),
    [later],
  );
  const update = (next: ListItem[], now?: string) => {
    if (workspaceChanged.current) return;
    itemsRef.current = next;
    setItems(next);
    if (now) {
      later.cancel();
      save.mutate({ items: next }, { onSuccess: () => toast(now) });
    } else later(next);
  };
  const patch = (id: string, p: Partial<ListItem>) =>
    update(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const isT = kind === "testimonials";
  const target = items.find((item) => item.id === removeId);
  const deleteOne = useMutation({
    scope: { id: `list-${kind}` },
    mutationFn: (id: string) => {
      if (workspaceChanged.current)
        throw new Error("O ambiente mudou. Atualize antes de continuar.");
      return unwrap(deleteListItem(kind, id, id));
    },
  });
  const remove = async () => {
    if (!removeId || removing || workspaceChanged.current) return;
    const id = removeId;
    later.cancel();
    setRemoving(true);
    setRemoveError(null);
    try {
      const currentServer = await deleteOne.mutateAsync(id);
      if (workspaceChanged.current) return;
      createdIds.current.delete(id);
      const latest = itemsRef.current.filter((item) => item.id !== id);
      const localById = new Map(latest.map((item) => [item.id, item]));
      const serverIds = new Set(currentServer.map((item) => item.id));
      // Keep local field edits, include rows recovered in another tab, and do not
      // resurrect rows that another client removed while this dialog was open.
      const merged = [
        ...currentServer.map((item) => localById.get(item.id) ?? item),
        ...latest.filter(
          (item) => !serverIds.has(item.id) && createdIds.current.has(item.id),
        ),
      ];
      itemsRef.current = merged;
      setItems(merged);
      qc.setQueryData(["list", kind], currentServer);
      if (JSON.stringify(merged) !== JSON.stringify(currentServer))
        save.mutate({ items: merged });
      setRemoveId(null);
      toast.success(isT ? "Depoimento excluído" : "Pergunta excluída");
    } catch (error) {
      if (workspaceChanged.current) return;
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir. Tente novamente.";
      setRemoveError(message);
      toast.error(message);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <div className="row admin-lists-heading">
        <b>{title}</b>
        <span className="muted" style={{ fontSize: 12 }}>
          {save.isPending ? "Salvando…" : ""}
        </span>
        <span className="sp" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const id = crypto.randomUUID();
            createdIds.current.add(id);
            update([...items, { id, a: "", b: "", c: "", visible: false }]);
          }}
        >
          <Icon name="plus" />
          Adicionar
        </Button>
      </div>
      {items.length === 0 && <div className="empty">Nada por aqui ainda.</div>}
      <SortableList
        items={items}
        getId={(i) => i.id}
        onMove={(next) => update(next, "Ordem salva")}
      >
        {items.map((t) => (
          <SortableItem
            key={t.id}
            value={t.id}
            className={`li${t.visible ? "" : " off"}`}
          >
            <Grip style={{ marginTop: 8 }} />
            <div className="c">
              {isT ? (
                <>
                  <label className="f">
                    Depoimento
                    <Textarea
                      className="in"
                      placeholder="Escreva o depoimento"
                      value={t.a}
                      onChange={(e) => patch(t.id, { a: e.target.value })}
                    />
                  </label>
                  <div className="grid2 field-grid">
                    <label className="f">
                      Nome
                      <Input
                        className="in"
                        placeholder="Nome da pessoa"
                        value={t.b}
                        onChange={(e) => patch(t.id, { b: e.target.value })}
                      />
                    </label>
                    <label className="f">
                      Bairro / UF
                      <Input
                        className="in"
                        placeholder="Bairro / UF"
                        value={t.c ?? ""}
                        onChange={(e) => patch(t.id, { c: e.target.value })}
                      />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <label className="f">
                    Pergunta
                    <Input
                      className="in"
                      placeholder="Escreva a pergunta"
                      value={t.a}
                      onChange={(e) => patch(t.id, { a: e.target.value })}
                    />
                  </label>
                  <label className="f">
                    Resposta
                    <Textarea
                      className="in"
                      placeholder="Escreva a resposta"
                      value={t.b}
                      onChange={(e) => patch(t.id, { b: e.target.value })}
                    />
                  </label>
                </>
              )}
            </div>
            <div className="list-item-actions">
              <Switch
                checked={t.visible}
                title={`${t.visible ? "Ocultar" : "Publicar"} ${isT ? "este depoimento" : "esta pergunta"} no site`}
                onChange={(v) =>
                  update(
                    items.map((x) =>
                      x.id === t.id ? { ...x, visible: v } : x,
                    ),
                    v
                      ? isT
                        ? "Depoimento visível"
                        : "Pergunta visível"
                      : isT
                        ? "Depoimento oculto"
                        : "Pergunta oculta",
                  )
                }
              />
              <ControlTooltip
                label={isT ? "Excluir depoimento" : "Excluir pergunta"}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={isT ? "Excluir depoimento" : "Excluir pergunta"}
                  onClick={() => {
                    setRemoveId(t.id);
                    setRemoveError(null);
                  }}
                >
                  <Icon name="trash" />
                </Button>
              </ControlTooltip>
            </div>
          </SortableItem>
        ))}
      </SortableList>
      <AlertDialog
        open={removeId !== null}
        onOpenChange={(open) => {
          if (!open && !removing) setRemoveId(null);
        }}
      >
        <AlertDialogContent className="adm admin-popover rounded-2xl p-5">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isT ? "Excluir depoimento?" : "Excluir pergunta?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target ? (
                <>
                  <span className="block font-medium">
                    {(isT ? target.b || target.a : target.a) ||
                      "Item sem título"}
                  </span>
                  <span className="mt-2 block">
                    {isT
                      ? "O depoimento será removido do site e desta lista."
                      : "A pergunta e a resposta serão removidas do site e desta lista."}{" "}
                    Segure o botão para confirmar.
                  </span>
                </>
              ) : (
                "Confirme a exclusão deste item. Segure o botão para continuar."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeError && (
            <p className="text-sm text-destructive" role="alert">
              {removeError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <HoldButton
              variant="red"
              disabled={removing}
              holdingLabel="Continue pressionando…"
              completeLabel="Solicitado"
              resetAfter={1800}
              onHoldComplete={() => {
                void remove();
              }}
            >
              Segure para excluir
            </HoldButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
