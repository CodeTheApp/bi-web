"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { useState } from "react";

import { Button } from "@/shared/ui/button";

import { isMediaCsv } from "@/entities/product";
import { importCatalog, importMedia } from "@/server/catalog/actions";

import { Icon } from "@/shared/ui/admin/icons";
import { Modal, unwrap, useToast } from "@/shared/ui/admin/ui";

type Done<T> =
  T extends Promise<{ ok: true; data: infer D } | { ok: false; error: string }>
    ? D
    : never;
type ImportOutcome =
  | { kind: "produtos"; r: Done<ReturnType<typeof importCatalog>> }
  | { kind: "midia"; r: Done<ReturnType<typeof importMedia>> };

/** Uma janela para as duas planilhas: a de produtos (loja antiga) e a de fotos/vídeos (colunas SKU e URL). */
export function ImportCatalogDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const m = useMutation({
    mutationFn: async (f: File): Promise<ImportOutcome> => {
      const buf = await f.arrayBuffer();
      let text = new TextDecoder("utf-8").decode(buf);
      if (text.includes("\uFFFD"))
        text = new TextDecoder("windows-1252").decode(buf); // planilhas salvas no Excel antigo
      return isMediaCsv(text)
        ? { kind: "midia", r: await unwrap(importMedia(text)) }
        : { kind: "produtos", r: await unwrap(importCatalog(text)) };
    },
    onSuccess: (o) => {
      if (o.kind === "produtos")
        toast(
          o.r.created
            ? `${o.r.created} produtos importados`
            : "Planilha importada",
        );
      else
        toast(
          `${o.r.videos + o.r.images} ${o.r.videos + o.r.images === 1 ? "item vinculado" : "itens vinculados"}`,
        );
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast(e.message),
  });
  const close = () => {
    setFile(null);
    m.reset();
    onClose();
  };
  const o = m.data;
  return (
    <Modal
      open={open}
      onClose={close}
      title="Importar planilha"
      description="Planilha de produtos da loja antiga ou planilha de fotos e vídeos (colunas SKU e URL), em .csv."
    >
      {o?.kind === "produtos" ? (
        <div className="stack">
          <div className="imp-res">
            <div>
              <b>{o.r.created}</b>
              <small>produtos novos</small>
            </div>
            <div>
              <b>{o.r.updatedPrices}</b>
              <small>preços atualizados</small>
            </div>
            <div>
              <b>{o.r.addedVariants}</b>
              <small>variantes acrescentadas</small>
            </div>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {o.r.rows} linhas lidas, agrupadas em {o.r.products} produtos
            {o.r.skipped > 0 &&
              ` (${o.r.skipped} linhas ignoradas: item de teste ou SKU repetido)`}
            .
          </p>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {o.r.byCategory.map(([c, n]) => (
              <span className="tag" key={c}>
                {c} · {n}
              </span>
            ))}
          </div>
          <p className="hint" style={{ margin: 0 }}>
            Os nomes foram organizados a partir da planilha (ex.: “PEND GODA
            BEGE 1XE27” vira “Pendente Goda”, com o acabamento como opção).
            Revise os títulos e acrescente fotos e descrições antes de divulgar.
          </p>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button onClick={close}>Ver produtos</Button>
          </div>
        </div>
      ) : o?.kind === "midia" ? (
        <div className="stack">
          <div className="imp-res">
            <div>
              <b>{o.r.videos}</b>
              <small>vídeos vinculados</small>
            </div>
            <div>
              <b>{o.r.images}</b>
              <small>fotos vinculadas</small>
            </div>
            <div>
              <b>{o.r.hidden.length}</b>
              <small>ocultos para conferir</small>
            </div>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {o.r.rows} links lidos
            {o.r.checkedTitles > 0 &&
              `, ${o.r.checkedTitles} vídeos conferidos pelo título`}
            {o.r.already > 0 && `, ${o.r.already} já estavam cadastrados`}
            {o.r.unmatchedCount > 0 &&
              `, ${o.r.unmatchedCount} sem produto correspondente`}
            . Os novos entram no fim da galeria de cada produto.
          </p>
          {o.r.corrected.length > 0 && (
            <div className="imp-list">
              <b>Corrigidos pelo título do vídeo</b>
              <small className="muted">
                O título no YouTube traz o código da peça e apontava para outro
                produto que não o da planilha.
              </small>
              <ul>
                {o.r.corrected.map((c) => (
                  <li key={c.url}>
                    <span>{c.to}</span>
                    <span className="muted">planilha: {c.from}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {o.r.hidden.length > 0 && (
            <div className="imp-list">
              <b>Entraram ocultos para conferir</b>
              <small className="muted">
                Link repetido em produtos diferentes ou vídeo de outra peça.
                Abra, assista e publique só no produto certo.
              </small>
              <ul>
                {o.r.hidden.map((h) => (
                  <li key={h.productId}>
                    <Link href={`/admin/loja/${h.productId}`} onClick={close}>
                      {h.title}
                    </Link>
                    <span className="muted" title={h.note}>
                      {h.note ? "outra peça no vídeo" : h.sku}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {o.r.unmatched.length > 0 && (
            <div className="imp-list">
              <b>Sem produto correspondente</b>
              <ul>
                {o.r.unmatched.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button onClick={close}>Concluir</Button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <label
            className={`drop${file ? " on" : ""}`}
            style={{ minHeight: 120 }}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="stack" style={{ gap: 6, alignItems: "center" }}>
              <Icon name="upload2" />
              {file ? <b>{file.name}</b> : "Escolher arquivo .csv"}
            </span>
          </label>
          <ul className="imp-rules">
            <li>
              <b>Produtos:</b> os itens de uma mesma peça viram um produto com
              variantes; produto novo entra publicado ou como rascunho, como
              estava na loja antiga; SKU que já existe só tem o preço
              atualizado.
            </li>
            <li>
              <b>Fotos e vídeos:</b> cada link é ligado ao produto pelo SKU (ou
              pelo nome) e entra no fim da galeria. Link repetido em produtos
              diferentes entra oculto, para conferir.
            </li>
            <li>Nada é apagado.</li>
          </ul>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button
              disabled={!file || m.isPending}
              onClick={() => file && m.mutate(file)}
            >
              {m.isPending ? "Importando…" : "Importar"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
