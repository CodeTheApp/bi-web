"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getList, saveList } from "@/server/admin/actions";
import type { ListItem } from "@/server/admin/types";
import { Icon } from "../icons";
import { Grip, SortableItem, SortableList } from "../Sortable";
import { ErrorBox, PageHead, Skeleton, Switch, unwrap, useDebounced, useToast } from "../ui";

export function Lists() {
  return (
    <>
      <PageHead title="Depoimentos e FAQ" sub="Edite direto na lista. Arraste para reordenar; o interruptor esconde do site." />
      <div className="two">
        <ListCard kind="testimonials" title="Depoimentos" />
        <ListCard kind="faqs" title="Perguntas frequentes" />
      </div>
    </>
  );
}

function ListCard({ kind, title }: { kind: "testimonials" | "faqs"; title: string }) {
  const q = useQuery({ queryKey: ["list", kind], queryFn: () => unwrap(getList(kind)) });
  return (
    <div className="card">
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {q.data ? <Editor kind={kind} title={title} initial={q.data} /> : <Skeleton h={320} />}
    </div>
  );
}

function Editor({ kind, title, initial }: { kind: "testimonials" | "faqs"; title: string; initial: ListItem[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const save = useMutation({
    // em fila: uma gravação por vez, na ordem em que aconteceram
    scope: { id: `list-${kind}` },
    mutationFn: (list: ListItem[]) => unwrap(saveList(kind, list)),
    onSuccess: (saved) => qc.setQueryData(["list", kind], saved),
    onError: (e) => toast(e.message),
  });
  const later = useDebounced((list: ListItem[]) => save.mutate(list), 800);
  const update = (next: ListItem[], now?: string) => {
    setItems(next);
    if (now) {
      save.mutate(next, { onSuccess: () => toast(now) });
    } else later(next);
  };
  const patch = (id: string, p: Partial<ListItem>) => update(items.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const isT = kind === "testimonials";

  return (
    <>
      <div className="row" style={{ padding: "16px 16px 12px" }}>
        <b>{title}</b>
        <span className="muted" style={{ fontSize: 12 }}>{save.isPending ? "Salvando…" : ""}</span>
        <span className="sp" />
        <button className="btn ghost sm" onClick={() => update([...items, { id: crypto.randomUUID(), a: "", b: "", c: "", visible: false }])}>
          <Icon name="plus" />
          Adicionar
        </button>
      </div>
      <SortableList items={items} getId={(i) => i.id} onMove={(next) => update(next, "Ordem salva")}>
        <div>
          {items.length === 0 && <div className="empty">Nada por aqui ainda.</div>}
          {items.map((t) => (
            <SortableItem key={t.id} id={t.id} className={`li${t.visible ? "" : " off"}`}>
              <Grip style={{ marginTop: 8 }} />
              <div className="c">
                {isT ? (
                  <>
                    <textarea className="in" placeholder="Depoimento" value={t.a} onChange={(e) => patch(t.id, { a: e.target.value })} />
                    <div className="grid2">
                      <input className="in" placeholder="Nome" value={t.b} onChange={(e) => patch(t.id, { b: e.target.value })} />
                      <input className="in" placeholder="Bairro / UF" value={t.c ?? ""} onChange={(e) => patch(t.id, { c: e.target.value })} />
                    </div>
                  </>
                ) : (
                  <>
                    <input className="in" placeholder="Pergunta" style={{ fontWeight: 600 }} value={t.a} onChange={(e) => patch(t.id, { a: e.target.value })} />
                    <textarea className="in" placeholder="Resposta" value={t.b} onChange={(e) => patch(t.id, { b: e.target.value })} />
                  </>
                )}
              </div>
              <div className="stack" style={{ gap: 8, alignItems: "center" }}>
                <Switch
                  checked={t.visible}
                  title="Mostrar no site"
                  onChange={(v) => update(items.map((x) => (x.id === t.id ? { ...x, visible: v } : x)), v ? (isT ? "Depoimento visível" : "Pergunta visível") : isT ? "Depoimento oculto" : "Pergunta oculta")}
                />
                <button className="btn ghost sm" aria-label="Excluir" title="Excluir" onClick={() => update(items.filter((x) => x.id !== t.id), "Excluído")}>
                  <Icon name="trash" />
                </button>
              </div>
            </SortableItem>
          ))}
        </div>
      </SortableList>
    </>
  );
}
