"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { debounce, useQueryStates } from "nuqs";
import { TicketPercent } from "@/shared/ui/icons/lucide";
import {
  couponDraftSchema,
  type Coupon,
  type CouponDraft,
} from "@/entities/coupon";
import { deleteCoupon, saveCoupon } from "@/entities/coupon/api";
import { getCoupons } from "@/shared/api/admin-reads";
import { brl } from "@/entities/product";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Icon } from "@/shared/ui/admin/icons";
import {
  Choice,
  ControlTooltip,
  ErrorBox,
  Modal,
  PageHead,
  Skeleton,
  Switch,
  unwrap,
  useToast,
} from "@/shared/ui/admin/ui";
import ParticleButton from "@/shared/ui/kokonutui/particle-button";
import HoldButton from "@/shared/ui/kokonutui/hold-button";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/shared/ui/reui/data-grid/data-grid";
import { DataGridPagination } from "@/shared/ui/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/shared/ui/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/shared/ui/reui/data-grid/data-grid-table";
import { withSortableHeaders } from "@/shared/ui/admin/table-columns";
import { GRID_PT } from "@/shared/lib/data-grid";
import {
  updatePagination,
  updateSorting,
} from "@/shared/lib/url-state/table-state";
import { couponListParsers } from "../model/query-state";
import "./coupons.css";

const amount = (coupon: Pick<Coupon, "kind" | "value">) =>
  coupon.kind === "percentual" ? `${coupon.value}%` : brl(coupon.value);
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Sem limite";

export function CouponManager() {
  const qc = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["coupons"],
    queryFn: ({ signal }) => unwrap(getCoupons({ signal })),
  });
  const [filters, set] = useQueryStates(couponListParsers, {
    shallow: true,
    scroll: false,
  });
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [removing, setRemoving] = useState<Coupon | null>(null);
  const remove = useMutation({
    mutationFn: (id: string) => unwrap(deleteCoupon(id)),
    onSuccess: () => {
      toast.success("Cupom removido");
      setRemoving(null);
      qc.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (error) => toast.error(error.message),
  });
  const resetRemove = remove.reset;
  const rows = useMemo(
    () =>
      (query.data ?? []).filter(
        (coupon) =>
          (!filters.q ||
            coupon.code
              .toLowerCase()
              .includes(filters.q.trim().toLowerCase())) &&
          (filters.status === "todos" ||
            coupon.active === (filters.status === "ativos")),
      ),
    [query.data, filters.q, filters.status],
  );
  const columns = useMemo<ColumnDef<DataGridFeatures, Coupon>[]>(
    () =>
      withSortableHeaders([
        {
          accessorKey: "code",
          header: "Código",
          size: 180,
          cell: ({ row }) => (
            <span className="coupon-code-cell">
              <TicketPercent size={16} />
              <button type="button" onClick={() => setEditing(row.original)}>
                {row.original.code}
              </button>
            </span>
          ),
        },
        {
          accessorKey: "value",
          header: "Desconto",
          size: 110,
          cell: ({ row }) => (
            <span>
              {amount(row.original)}
              <small className="coupon-cell-note">
                Mín. {brl(row.original.minimumCents)}
              </small>
            </span>
          ),
        },
        {
          accessorKey: "used",
          header: "Usos",
          size: 85,
          cell: ({ row }) =>
            `${row.original.used}${row.original.maxUses ? ` / ${row.original.maxUses}` : ""}`,
        },
        {
          id: "validade",
          header: "Validade · Brasília",
          size: 180,
          enableSorting: false,
          cell: ({ row }) => (
            <span>
              {date(row.original.expiresAt)}
              {row.original.startsAt && (
                <small className="coupon-cell-note">
                  A partir de {date(row.original.startsAt)}
                </small>
              )}
            </span>
          ),
        },
        {
          id: "active",
          header: "Situação",
          size: 100,
          enableSorting: false,
          cell: ({ row }) => (
            <span
              className={`coupon-status ${row.original.active ? "active" : ""}`}
            >
              {row.original.active ? "Ativo" : "Desativado"}
            </span>
          ),
        },
        {
          id: "actions",
          header: "",
          size: 82,
          enableSorting: false,
          cell: ({ row }) => (
            <div className="coupon-row-actions">
              <ControlTooltip label={`Editar ${row.original.code}`}>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Editar ${row.original.code}`}
                  onClick={() => setEditing(row.original)}
                >
                  <Icon name="pen" />
                </Button>
              </ControlTooltip>
              <ControlTooltip
                label={
                  row.original.used
                    ? "Desative o cupom para preservar seu histórico"
                    : `Excluir ${row.original.code}`
                }
              >
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={row.original.used > 0}
                  aria-label={`Excluir ${row.original.code}`}
                  onClick={() => {
                    resetRemove();
                    setRemoving(row.original);
                  }}
                >
                  <Icon name="trash" />
                </Button>
              </ControlTooltip>
            </div>
          ),
        },
      ]),
    [resetRemove],
  );
  const table = useTable({
    features: dataGridFeatures,
    autoResetPageIndex: false,
    data: rows,
    columns,
    getRowId: (row: Coupon) => row.id,
    state: {
      sorting: filters.sort,
      pagination: { pageIndex: filters.page - 1, pageSize: filters.size },
    },
    onSortingChange: (updater) => {
      void set((current) => ({
        sort: updateSorting(updater, current.sort),
        page: 1,
      }));
    },
    onPaginationChange: (updater) => {
      void set((current) => updatePagination(updater, current));
    },
  });
  return (
    <>
      <PageHead
        title="Cupons"
        sub="Descontos conferidos no servidor, com validade e limite de pedidos."
      >
        <Button onClick={() => setEditing("new")}>
          <Icon name="plus" />
          Criar cupom
        </Button>
      </PageHead>
      {query.error && (
        <ErrorBox error={query.error} retry={() => query.refetch()} />
      )}
      {!query.data ? (
        !query.error && <Skeleton h={350} />
      ) : (
        <div className="card coupon-library">
          <div className="flt-bar">
            <label className="search in-card">
              <Icon name="search" />
              <input
                aria-label="Buscar cupom"
                placeholder="Buscar código…"
                value={filters.q}
                onChange={(event) => {
                  void set(
                    { q: event.target.value, page: 1 },
                    {
                      limitUrlUpdates: event.target.value
                        ? debounce(250)
                        : undefined,
                    },
                  );
                }}
              />
            </label>
            <Choice
              label="Filtrar situação dos cupons"
              value={filters.status}
              options={[
                ["todos", "Todos"],
                ["ativos", "Ativos"],
                ["inativos", "Desativados"],
              ]}
              onChange={(status) => {
                void set({ status, page: 1 });
              }}
            />
          </div>
          <DataGrid
            table={table}
            recordCount={rows.length}
            i18n={GRID_PT}
            emptyMessage={
              query.data.length
                ? "Nenhum cupom encontrado com esses filtros."
                : "Nenhum cupom cadastrado. Crie o primeiro quando definir uma promoção."
            }
            tableLayout={{
              dense: true,
              headerBackground: false,
              rowBorder: true,
              width: "auto",
            }}
          >
            <DataGridContainer border={false}>
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
            <div className="grid-foot">
              <DataGridPagination sizes={[10, 25, 50, 100]} />
            </div>
          </DataGrid>
          <p className="coupon-reservation-note">
            Os usos incluem pedidos aguardando pagamento. Cancelamentos liberam
            o uso; o desconto é preservado no histórico do pedido.
          </p>
        </div>
      )}
      {editing && (
        <CouponEditor
          key={editing === "new" ? "new" : editing.id}
          coupon={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["coupons"] });
          }}
        />
      )}
      <Modal
        open={Boolean(removing)}
        onClose={() => {
          if (!remove.isPending) setRemoving(null);
        }}
        title={
          <span className="coupon-dialog-title">
            Excluir {removing?.code ?? "cupom"}?
          </span>
        }
        description="O código será removido. Cupons com pedidos no histórico devem ser desativados."
      >
        <div className="coupon-delete-actions">
          <Button
            variant="outline"
            onClick={() => setRemoving(null)}
            disabled={remove.isPending}
          >
            Cancelar
          </Button>
          <HoldButton
            variant="red"
            holdDuration={1200}
            holdingLabel="Continue pressionando"
            completeLabel="Solicitado"
            onHoldComplete={() => {
              if (removing) remove.mutate(removing.id);
            }}
            disabled={remove.isPending}
          >
            {remove.isPending ? "Excluindo…" : "Segure para excluir"}
          </HoldButton>
        </div>
        {remove.error && (
          <p role="alert" className="ferr">
            {remove.error.message}
          </p>
        )}
      </Modal>
    </>
  );
}

const localDate = (value: string | null) =>
  value
    ? new Date(
        new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
const cents = (value: string) =>
  Math.round(Number(value.replace(",", ".")) * 100);
function CouponEditor({
  coupon,
  onClose,
  onSaved,
}: {
  coupon: Coupon | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [code, setCode] = useState(coupon?.code ?? "");
  const [kind, setKind] = useState<CouponDraft["kind"]>(
    coupon?.kind ?? "percentual",
  );
  const [value, setValue] = useState(
    coupon
      ? String(coupon.kind === "fixo" ? coupon.value / 100 : coupon.value)
      : "",
  );
  const [minimum, setMinimum] = useState(
    String((coupon?.minimumCents ?? 0) / 100),
  );
  const [starts, setStarts] = useState(localDate(coupon?.startsAt ?? null));
  const [ends, setEnds] = useState(localDate(coupon?.expiresAt ?? null));
  const [maxUses, setMaxUses] = useState(
    coupon?.maxUses ? String(coupon.maxUses) : "",
  );
  const [active, setActive] = useState(coupon?.active ?? false);
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: (draft: CouponDraft) =>
      unwrap(saveCoupon(coupon?.id ?? null, draft)),
    onSuccess: () => {
      toast.success("Cupom salvo");
      onSaved();
    },
  });
  const submit = async () => {
    setError("");
    try {
      const draft = couponDraftSchema.parse({
        code,
        kind,
        value: kind === "fixo" ? cents(value) : Number(value),
        minimumCents: cents(minimum),
        startsAt: starts ? new Date(starts).toISOString() : null,
        expiresAt: ends ? new Date(ends).toISOString() : null,
        maxUses: maxUses ? Number(maxUses) : null,
        active,
      });
      await save.mutateAsync(draft);
    } catch (failure) {
      const message =
        failure && typeof failure === "object" && "issues" in failure
          ? (failure.issues as Array<{ message: string }>)[0]?.message
          : failure instanceof Error
            ? failure.message
            : "Confira os campos.";
      setError(message || "Confira os campos.");
      throw failure;
    }
  };
  return (
    <Modal
      open
      onClose={() => {
        if (!save.isPending) onClose();
      }}
      title={
        <span className="coupon-dialog-title">
          {coupon ? `Editar ${coupon.code}` : "Criar cupom"}
        </span>
      }
      description="O desconto se aplica aos produtos. Frete e total são recalculados no fechamento."
    >
      <div className="coupon-editor-grid">
        <label className="f">
          Código
          <Input
            value={code}
            maxLength={40}
            placeholder="Ex.: LUZ10"
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
        </label>
        <div className="f">
          <span>Tipo de desconto</span>
          <Choice
            label="Tipo de desconto"
            value={kind}
            onChange={setKind}
            options={[
              ["percentual", "Percentual (%)"],
              ["fixo", "Valor fixo (R$)"],
            ]}
          />
        </div>
        <label className="f">
          {kind === "percentual" ? "Desconto (%)" : "Desconto (R$)"}
          <Input
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={kind === "percentual" ? "10" : "25,00"}
          />
        </label>
        <label className="f">
          Valor mínimo em produtos (R$)
          <Input
            inputMode="decimal"
            value={minimum}
            onChange={(event) => setMinimum(event.target.value)}
          />
        </label>
        <label className="f">
          Começa em · horário local
          <Input
            type="datetime-local"
            value={starts}
            onChange={(event) => setStarts(event.target.value)}
          />
        </label>
        <label className="f">
          Termina em · horário local
          <Input
            type="datetime-local"
            value={ends}
            onChange={(event) => setEnds(event.target.value)}
          />
        </label>
        <label className="f">
          Limite de pedidos
          <Input
            inputMode="numeric"
            value={maxUses}
            placeholder="Sem limite"
            onChange={(event) => setMaxUses(event.target.value)}
          />
        </label>
        <div className="f coupon-active-field">
          <span>Disponível para uso</span>
          <Switch
            checked={active}
            onChange={setActive}
            title={active ? "Desativar cupom" : "Ativar cupom"}
            label={active ? "Ativo" : "Desativado"}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="ferr">
          {error}
        </p>
      )}
      <div className="coupon-delete-actions">
        <Button variant="outline" onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <ParticleButton
          autoWidth={false}
          onClick={submit}
          disabled={save.isPending}
          pendingLabel="Salvando…"
          successLabel="Salvo"
          errorLabel="Conferir campos"
        >
          Salvar cupom
        </ParticleButton>
      </div>
    </Modal>
  );
}
