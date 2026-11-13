"use client";
import { getProductAdmin } from "@/shared/api/admin-reads";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/reui/alert";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { ConfirmRemove } from "@/shared/ui/admin/ConfirmRemove";
import InlineAlert from "@/shared/ui/kokonutui/inline-alert";
import UndoButton from "@/shared/ui/kokonutui/undo-button";
import HoldButton from "@/shared/ui/kokonutui/hold-button";
import ParticleButton from "@/shared/ui/kokonutui/particle-button";
import {
  canSell,
  coverOf,
  CATEGORIES,
  OPTION_TYPES,
  optionName,
  SPEC_FIELDS,
  variantLabel,
  type CategorySlug,
  type Product,
  type ProductStatus,
  type Variant,
} from "@/entities/product";

import { deleteProduct, saveProduct, setProductsStatus } from "@/server/catalog/actions";

import {
  ProductMediaManager,
  withIds,
  type MediaItemState,
} from "@/widgets/product-editor/ui/ProductMediaManager";
import { Icon } from "@/shared/ui/admin/icons";
import {
  Chip,
  Choice,
  ControlTooltip,
  ErrorBox,
  Skeleton,
  Switch,
  unwrap,
  useToast,
} from "@/shared/ui/admin/ui";

import { MoneyInput } from "@/features/manage-products/client";
import { StockDialog, type StockTarget } from "@/features/manage-stock/client";

export function ProductEditor({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["product", id],
    queryFn: ({ signal }) => unwrap(getProductAdmin(id, { signal })),
  });
  if (q.error) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  if (!q.data)
    return q.isFetched ? (
      <div className="card pad">
        <b>Produto não encontrado.</b>
        <p className="muted">
          <Link href="/admin/loja">Voltar para Produtos</Link>
        </p>
      </div>
    ) : (
      <Skeleton h={500} />
    );
  return <ProductForm key={q.data.id} initial={q.data} />;
}

const blankVariant = (options: string[]): Variant => ({
  id: crypto.randomUUID(),
  sku: "",
  options: Object.fromEntries(options.map((o) => [o, ""])),
  priceCents: null,
  compareAtCents: null,
  stockPolicy: "encomenda",
  leadTimeDays: null,
  stock: 0,
  active: true,
  legacyName: "",
});

function ProductForm({ initial }: { initial: Product }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [p, setP] = useState<Product>(initial);
  const [media, setMedia] = useState<MediaItemState[]>(() =>
    withIds(initial.media),
  );
  const [saved, setSaved] = useState(
    () => new Set(initial.variants.map((v) => v.id)),
  );
  const [dirty, setDirty] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProductStatus | null>(
    null,
  );
  const [confirm, setConfirm] = useState(false);
  const [stockFor, setStockFor] = useState<StockTarget | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };
  const setV = (id: string, patch: Partial<Variant>) =>
    set(
      "variants",
      p.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    );
  const setMedia2 = (next: MediaItemState[]) => {
    setMedia(next);
    setDirty(true);
  };
  const toggleOption = (o: string, on: boolean) => {
    const options = OPTION_TYPES.map((t) => t.id as string).filter((t) =>
      t === o ? on : p.options.includes(t),
    );
    setP((x) => ({
      ...x,
      options,
      variants: x.variants.map((v) => ({
        ...v,
        options: Object.fromEntries(
          options.map((k) => [k, v.options[k] ?? ""]),
        ),
      })),
    }));
    setDirty(true);
  };

  // salva o produto como está na tela, ou uma versão já ajustada (ex.: "vender sob encomenda")
  type SaveArg = ProductStatus | { status: ProductStatus; product: Product };
  const argOf = (a: SaveArg) =>
    typeof a === "string" ? { status: a, product: p } : a;
  const save = useMutation({
    mutationFn: (arg: SaveArg) => {
      const { status, product } = argOf(arg);
      return unwrap(
        saveProduct({
          ...product,
          status,
          media: media.map(({ url, kind, alt, variantId, visible }) => ({
            url,
            kind,
            alt,
            variantId,
            visible,
          })),
        }),
      );
    },
    onSuccess: (r, arg) => {
      const { status, product } = argOf(arg);
      setP((x) => ({ ...x, status, slug: r.slug }));
      setSaved(new Set(product.variants.map((v) => v.id)));
      setDirty(false);
      toast(
        status === "publicado"
          ? product.variants.some(canSell)
            ? "Produto publicado na loja"
            : product.variants.some((v) => v.active)
              ? "Publicado, mas fora da loja: sem estoque. Lance uma entrada ou venda sob encomenda."
              : "Publicado, mas fora da loja: nenhuma variante está ativa."
          : status === "arquivado"
            ? "Produto arquivado"
            : "Rascunho salvo",
      );
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast(e.message),
  });
  const changeStatus = useMutation({
    mutationFn: (status: ProductStatus) =>
      unwrap(setProductsStatus([p.id], status)),
    onSuccess: (_data, status) => {
      setP((current) => ({ ...current, status }));
      toast(
        status === "arquivado"
          ? "Produto arquivado"
          : "Produto movido para rascunho",
      );
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", p.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const del = useMutation({
    mutationFn: () => unwrap(deleteProduct(p.id)),
    onSuccess: () => {
      setDirty(false);
      toast("Produto excluído");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/admin/loja");
    },
    onError: (e) => toast.error(e.message),
  });

  const slugFromTitle = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const activeVariants = p.variants.filter((variant) => variant.active);
  const productCover = coverOf(media);
  const review = [
    {
      name: "Nome do produto",
      ok: p.title.trim().length >= 2 && p.title.trim().length <= 140,
      detail:
        p.title.trim().length >= 2
          ? p.title.trim()
          : "Use pelo menos dois caracteres.",
    },
    {
      name: "Foto de capa",
      ok: Boolean(productCover),
      detail: productCover
        ? "Há uma capa visível disponível para a vitrine."
        : "Escolha uma imagem e mantenha-a visível para apresentar a peça.",
    },
    {
      name: "Variantes ativas",
      ok: activeVariants.length > 0,
      detail: `${activeVariants.length} ${activeVariants.length === 1 ? "variante ativa" : "variantes ativas"}.`,
    },
    {
      name: "Preço",
      ok:
        activeVariants.length > 0 &&
        activeVariants.every(
          (variant) => variant.priceCents !== null && variant.priceCents > 0,
        ),
      detail: "Variantes sem preço aparecem como sob consulta.",
    },
    {
      name: "Disponibilidade",
      ok: activeVariants.some(canSell),
      detail: activeVariants.some(canSell)
        ? "Há estoque disponível ou venda sob encomenda."
        : "Sem estoque ou encomenda, o produto fica fora da vitrine.",
    },
  ];
  const otherSpecs = Object.keys(p.specs).filter(
    (k) => !SPEC_FIELDS.some((f) => f.key === k),
  );
  const variantChoices: Array<[string, string]> = [
    ["", "Todas as variantes"],
    ...p.variants.map(
      (v) => [v.id, variantLabel(v, p.options) || v.sku] as [string, string],
    ),
  ];

  return (
    <>
      <div className="ph">
        <div style={{ minWidth: 0 }}>
          <Link
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href="/admin/loja"
            style={{ marginLeft: -10 }}
          >
            <Icon name="back" />
            Produtos
          </Link>
          <h1 style={{ marginTop: 6 }}>{p.title || "Sem nome"}</h1>
        </div>
        <div className="row">
          <Chip
            s={
              p.status === "publicado" && !p.variants.some(canSell)
                ? "fora"
                : p.status
            }
          />
          {dirty && (
            <span className="muted" style={{ fontSize: 12 }}>
              Alterações não salvas
            </span>
          )}
          {initial.status === "publicado" &&
            p.status === "publicado" &&
            p.variants.some(canSell) && (
              <a
                className={buttonVariants({ variant: "outline" })}
                href={`/loja/${p.slug}`}
                target="_blank"
                rel="noopener"
              >
                <Icon name="eye" />
                Ver na loja
              </a>
            )}
          <Button
            variant="outline"
            disabled={
              save.isPending || changeStatus.isPending || pendingStatus !== null
            }
            onClick={() => save.mutate("rascunho")}
          >
            Salvar rascunho
          </Button>
          <ParticleButton
            variant="dark"
            disabled={
              save.isPending || changeStatus.isPending || pendingStatus !== null
            }
            pendingLabel="Publicando…"
            successLabel="Publicado"
            errorLabel="Falha ao publicar"
            onClick={() => save.mutateAsync("publicado")}
          >
            <Icon name="check" />
            {p.status === "publicado" ? "Atualizar publicação" : "Publicar"}
          </ParticleButton>
        </div>
      </div>

      <div className="ped">
        <div className="stack">
          <div className="card pad stack">
            <label className="f">
              Nome do produto
              <Input
                className="in"
                value={p.title}
                onChange={(e) => {
                  set("title", e.target.value);
                  if (!slugEdited && initial.status !== "publicado")
                    setP((x) => ({
                      ...x,
                      title: e.target.value,
                      slug: slugFromTitle(e.target.value),
                    }));
                }}
              />
            </label>
            <div className="grid2 field-grid">
              <div className="f admin-field">
                Categoria
                <Choice<CategorySlug>
                  label="Categoria"
                  value={p.category}
                  options={CATEGORIES.map((c) => [c.slug, c.name])}
                  onChange={(v) => set("category", v)}
                />
              </div>
              <label className="f">
                Endereço na loja
                <div className="money">
                  <span>/loja/</span>
                  <input
                    aria-label="Endereço"
                    value={p.slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      set(
                        "slug",
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]+/g, "-"),
                      );
                    }}
                  />
                </div>
              </label>
            </div>
            <label className="f">
              Descrição
              <small>
                Conte o que a peça tem de especial: desenho, materiais, onde
                fica bem.
              </small>
              <Textarea
                className="in"
                rows={5}
                value={p.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="stack">
          <InlineAlert
            checks={review}
            target={p.title.trim() || "Novo produto"}
          />
          <div className="card pad stack">
            <b>Status</b>
            <Chip s={p.status} />
            <div className="row" style={{ flexWrap: "wrap" }}>
              {p.status === "publicado" && (
                <UndoButton
                  label="Despublicar"
                  doneLabel="Retirado da loja"
                  disabled={
                    save.isPending ||
                    changeStatus.isPending ||
                    (pendingStatus !== null && pendingStatus !== "rascunho")
                  }
                  onAction={() => setPendingStatus("rascunho")}
                  onUndo={() => setPendingStatus(null)}
                  onCommit={async () => {
                    try {
                      await changeStatus.mutateAsync("rascunho");
                    } finally {
                      setPendingStatus(null);
                    }
                  }}
                />
              )}
              {p.status !== "arquivado" && (
                <UndoButton
                  label="Arquivar"
                  doneLabel="Produto arquivado"
                  disabled={
                    save.isPending ||
                    changeStatus.isPending ||
                    (pendingStatus !== null && pendingStatus !== "arquivado")
                  }
                  onAction={() => setPendingStatus("arquivado")}
                  onUndo={() => setPendingStatus(null)}
                  onCommit={async () => {
                    try {
                      await changeStatus.mutateAsync("arquivado");
                    } finally {
                      setPendingStatus(null);
                    }
                  }}
                />
              )}
              {p.status === "arquivado" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={changeStatus.isPending}
                  onClick={() => changeStatus.mutate("rascunho")}
                >
                  Restaurar como rascunho
                </Button>
              )}
            </div>
            {p.status === "publicado" && !p.variants.some(canSell) ? (
              <Alert variant="warning" className="p-3">
                <AlertTitle>
                  {p.variants.some((v) => v.active)
                    ? "Fora da loja: sem estoque"
                    : "Fora da loja: nenhuma variante ativa"}
                </AlertTitle>
                <AlertDescription>
                  {p.variants.some((v) => v.active)
                    ? "Publicado, mas nenhuma variante ativa tem saldo. Volta sozinho para a loja quando entrar estoque, ou se a venda for sob encomenda."
                    : "Publicado, mas todas as variantes estão desligadas (chave “Ativa” na tabela de variantes), como estavam na loja antiga."}
                  <div
                    className="row"
                    style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}
                  >
                    <Button
                      size="sm"
                      onClick={() => {
                        // sem nenhuma variante ativa, liga todas; com alguma ativa, mantém a escolha da equipe
                        const anyActive = p.variants.some((v) => v.active);
                        const next = {
                          ...p,
                          variants: p.variants.map((v) => ({
                            ...v,
                            active: anyActive ? v.active : true,
                            stockPolicy: "encomenda" as const,
                          })),
                        };
                        setP(next);
                        save.mutate({ status: "publicado", product: next });
                      }}
                      disabled={save.isPending}
                    >
                      {p.variants.some((v) => v.active)
                        ? "Vender sob encomenda"
                        : "Ativar e vender sob encomenda"}
                    </Button>
                    {p.variants.some((v) => saved.has(v.id) && v.active) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const v = p.variants.find(
                            (x) => saved.has(x.id) && x.active,
                          )!;
                          setStockFor({
                            variantId: v.id,
                            productId: p.id,
                            product: p.title,
                            sku: v.sku,
                            label: variantLabel(v, p.options),
                            stock: v.stock,
                          });
                        }}
                      >
                        Lançar estoque
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <small className="hint">
                Publicado aparece em /loja enquanto houver estoque (ou variante
                sob encomenda); sem estoque, sai sozinho e volta quando entrar.
                Arquivados saem da lista principal sem perder o histórico.
              </small>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <ProductMediaManager
          media={media}
          onChange={setMedia2}
          variants={variantChoices}
          title={p.title}
        />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h">
          <b>Variantes</b>
          <span className="muted" style={{ fontSize: 12 }}>
            O cliente escolhe por
          </span>
          {OPTION_TYPES.map((o) => (
            <label key={o.id} className="opt-t">
              <Checkbox
                checked={p.options.includes(o.id)}
                onCheckedChange={(v) => toggleOption(o.id, v === true)}
              />
              {o.name}
            </label>
          ))}
        </div>
        <div className="tw">
          <table className="vtbl">
            <thead>
              <tr>
                {p.options.map((o) => (
                  <th key={o}>{optionName(o)}</th>
                ))}
                <th>SKU</th>
                <th>Preço</th>
                <th>Venda</th>
                <th>Estoque</th>
                <th title="Aparece na loja">Ativa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {p.variants.map((v) => (
                <tr key={v.id} className={v.active ? undefined : "off"}>
                  {p.options.map((o) => (
                    <td key={o}>
                      <input
                        className="cell"
                        aria-label={optionName(o)}
                        value={v.options[o] ?? ""}
                        onChange={(e) =>
                          setV(v.id, {
                            options: { ...v.options, [o]: e.target.value },
                          })
                        }
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      className="cell mono"
                      aria-label="SKU"
                      value={v.sku}
                      onChange={(e) =>
                        setV(v.id, { sku: e.target.value.toUpperCase() })
                      }
                    />
                  </td>
                  <td>
                    <MoneyInput
                      label="Preço"
                      value={v.priceCents}
                      onChange={(c) => setV(v.id, { priceCents: c })}
                    />
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Choice<Variant["stockPolicy"]>
                        label="Venda"
                        size="sm"
                        className="w-[172px]"
                        value={v.stockPolicy}
                        options={[
                          ["estoque", "Só pronta entrega"],
                          ["encomenda", "Sob encomenda"],
                        ]}
                        onChange={(s) => setV(v.id, { stockPolicy: s })}
                      />
                      {v.stockPolicy === "encomenda" && (
                        <input
                          className="cell days"
                          aria-label="Prazo em dias úteis"
                          title="Prazo em dias úteis"
                          placeholder="prazo"
                          inputMode="numeric"
                          value={v.leadTimeDays ?? ""}
                          onChange={(e) => {
                            const d = e.target.value.replace(/\D/g, "");
                            setV(v.id, {
                              leadTimeDays: d ? Math.min(365, Number(d)) : null,
                            });
                          }}
                        />
                      )}
                    </div>
                  </td>
                  <td>
                    <ControlTooltip
                      label={
                        saved.has(v.id)
                          ? "Movimentar o estoque desta variante"
                          : "Salve o produto para movimentar o estoque"
                      }
                    >
                      <button
                        type="button"
                        className="stk"
                        disabled={!saved.has(v.id)}
                        aria-label="Movimentar o estoque desta variante"
                        onClick={() =>
                          setStockFor({
                            variantId: v.id,
                            productId: p.id,
                            product: p.title,
                            sku: v.sku,
                            label: variantLabel(v, p.options),
                            stock: v.stock,
                          })
                        }
                      >
                        <b>{v.stock}</b>
                        <Icon name="pen" size={13} />
                      </button>
                    </ControlTooltip>
                  </td>
                  <td>
                    <Switch
                      checked={v.active}
                      onChange={(a) => setV(v.id, { active: a })}
                      title="Aparece na loja"
                    />
                  </td>
                  <td>
                    <ConfirmRemove
                      label={
                        p.variants.length === 1
                          ? "O produto precisa de pelo menos uma variante"
                          : "Remover esta variante do produto"
                      }
                      title={`Remover variante ${v.sku || variantLabel(v, p.options) || "sem SKU"}?`}
                      description="A variante será retirada do rascunho. Salve o produto para aplicar a alteração."
                      disabled={p.variants.length === 1}
                      onConfirm={() => {
                        if (p.variants.length <= 1)
                          throw new Error(
                            "O produto precisa de pelo menos uma variante.",
                          );
                        setP((current) =>
                          current.variants.length <= 1
                            ? current
                            : {
                                ...current,
                                variants: current.variants.filter(
                                  (variant) => variant.id !== v.id,
                                ),
                              },
                        );
                        setDirty(true);
                      }}
                    >
                      <button
                        type="button"
                        className="rm"
                        aria-label="Remover variante"
                        disabled={p.variants.length === 1}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </ConfirmRemove>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-f">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set("variants", [...p.variants, blankVariant(p.options)])
            }
          >
            <Icon name="plus" />
            Adicionar variante
          </Button>
          <span className="hint">
            Preço vazio aparece como “sob consulta”. O estoque muda só por
            movimentos (lápis), para ficar registrado. Variante “só pronta
            entrega” sem saldo aparece esgotada; se nenhuma puder ser vendida, o
            produto sai da loja.
          </span>
        </div>
      </div>

      <div className="ped" style={{ marginTop: 18 }}>
        <div className="card pad stack">
          <b>Ficha técnica</b>
          <div className="grid2 field-grid">
            {SPEC_FIELDS.map((f) => (
              <label className="f" key={f.key}>
                {f.label}
                <Input
                  className="in"
                  value={p.specs[f.key] ?? ""}
                  onChange={(e) =>
                    set("specs", { ...p.specs, [f.key]: e.target.value })
                  }
                />
              </label>
            ))}
            {otherSpecs.map((k) => (
              <label className="f" key={k}>
                {k}
                <Input
                  className="in"
                  value={p.specs[k] ?? ""}
                  onChange={(e) =>
                    set("specs", { ...p.specs, [k]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <small className="hint">Campos vazios não aparecem na loja.</small>
        </div>
        <div className="stack">
          {p.legacy.names.length > 0 && (
            <details className="card pad legacy">
              <summary>
                <b>Na planilha da loja antiga</b>
                <span className="muted">
                  {" "}
                  · {p.legacy.names.length}{" "}
                  {p.legacy.names.length === 1 ? "nome" : "nomes"}
                </span>
              </summary>
              <ul>
                {p.legacy.names.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </details>
          )}

          <Button
            variant="ghost"
            style={{ alignSelf: "flex-start", color: "var(--destructive)" }}
            disabled={
              save.isPending || changeStatus.isPending || pendingStatus !== null
            }
            onClick={() => setConfirm(true)}
          >
            <Icon name="trash" />
            Excluir produto
          </Button>
        </div>
      </div>

      <StockDialog
        target={stockFor}
        onClose={() => setStockFor(null)}
        onDone={(d) => {
          const id = stockFor?.variantId;
          setP((x) => ({
            ...x,
            variants: x.variants.map((v) =>
              v.id === id ? { ...v, stock: v.stock + d } : v,
            ),
          }));
        }}
      />
      <AlertDialog
        open={confirm}
        onOpenChange={(value) => {
          if (!del.isPending) setConfirm(value);
        }}
      >
        <AlertDialogContent className="adm admin-popover rounded-2xl p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[20px] font-semibold leading-tight tracking-tight">
              Excluir “{p.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O produto, as variantes e o histórico de estoque são apagados.
              Para só tirar da loja, prefira arquivar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>
              Cancelar
            </AlertDialogCancel>
            <HoldButton
              variant="red"
              disabled={del.isPending}
              holdingLabel="Continue pressionando…"
              completeLabel="Solicitado"
              resetAfter={1800}
              onHoldComplete={() => del.mutate()}
            >
              Segure para excluir
            </HoldButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
