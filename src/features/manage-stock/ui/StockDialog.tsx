"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";

import { Button } from "@/shared/ui/button";

import { Input } from "@/shared/ui/input";

import { STOCK_REASON_LABEL, type StockReason } from "@/entities/product";

import { moveStock } from "@/server/catalog/actions";

import { Modal, Seg, unwrap, useToast } from "@/shared/ui/admin/ui";

export type StockTarget = {
  variantId: string;
  productId: string;
  product: string;
  sku: string;
  label: string;
  stock: number;
};

export function StockDialog({
  target,
  onClose,
  onDone,
}: {
  target: StockTarget | null;
  onClose: () => void;
  onDone?: (delta: number) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reason, setReason] =
    useState<Exclude<StockReason, "inicial">>("compra");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [key, setKey] = useState<string | null>(null);
  if (target && key !== target.variantId) {
    setKey(target.variantId);
    setReason("compra");
    setQty("");
    setNote("");
  }
  const n = Number.parseInt(qty, 10);
  const valid = Number.isFinite(n) && (reason === "ajuste" ? n >= 0 : n > 0);
  const delta =
    !target || !valid
      ? 0
      : reason === "ajuste"
        ? n - target.stock
        : reason === "venda"
          ? -n
          : n;
  const m = useMutation({
    mutationFn: () =>
      unwrap(moveStock({ variantId: target!.variantId, delta, reason, note })),
    onSuccess: () => {
      toast("Estoque atualizado");
      onDone?.(delta);
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["stockMoves"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e) => toast(e.message),
  });
  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Movimentar estoque"
      description={
        target
          ? `${target.product}${target.label ? ` · ${target.label}` : ""} · ${target.sku}`
          : undefined
      }
    >
      {target && (
        <div className="stack">
          <Seg<Exclude<StockReason, "inicial">>
            value={reason}
            onChange={setReason}
            options={[
              ["compra", "Entrada"],
              ["venda", "Saída"],
              ["devolucao", "Devolução"],
              ["ajuste", "Inventário"],
            ]}
          />
          <div className="grid2 field-grid">
            <label className="f">
              {reason === "ajuste" ? "Saldo contado" : "Quantidade"}
              <Input
                className="in"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
            </label>
            <div className="stock-preview">
              <small>Saldo</small>
              <b>
                {target.stock} <span>→</span> {target.stock + delta}
              </b>
            </div>
          </div>
          <label className="f">
            Observação
            <small>Opcional. Ex.: nota fiscal 1234, venda para Fulano.</small>
            <Input
              className="in"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {target.stock + delta < 0 && (
            <p className="err" style={{ margin: 0 }}>
              O saldo vai ficar negativo. Confira a quantidade.
            </p>
          )}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              disabled={!valid || delta === 0 || m.isPending}
              onClick={() => m.mutate()}
            >
              {STOCK_REASON_LABEL[reason]}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
