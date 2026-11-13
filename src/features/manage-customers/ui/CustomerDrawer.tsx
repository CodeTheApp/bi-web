"use client";
import { getCustomerAdmin, getCustomerOrdersAdmin } from "@/shared/api/admin-reads";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Mail, Phone, LockKeyhole, X, Check } from "@/shared/ui/icons/lucide";
import { AdminBlockLoading } from "@/shared/ui/admin/AdminBlockLoading";
import { ControlTooltip, ErrorBox, unwrap } from "@/shared/ui/admin/ui";
import SaveStatus from "@/shared/ui/kokonutui/save-status";
import { notify } from "@/shared/lib/notify";
import { brl } from "@/entities/product";
import { updateCustomerContact } from "../api/actions";
import {
  customerContactSchema,
  customerMetrics,
  customerWhatsApp,
  type CustomerContact,
  type CustomerRecord,
} from "../model/customer-contact";
import { CustomerOrders } from "./CustomerOrders";
import "./customer-crm.css";

const date = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function CustomerDrawer({
  id,
  onClose,
  returnFocus,
}: {
  id: string | null;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const [lastId, setLastId] = useState(id);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  if (id && id !== lastId) setLastId(id);
  const customerId = id ?? lastId;
  const profile = useQuery({
    queryKey: ["customer", customerId],
    queryFn: ({ signal }) => unwrap(getCustomerAdmin(customerId!, { signal })),
    enabled: Boolean(id),
  });
  const orders = useQuery({
    queryKey: ["customer-orders", customerId],
    queryFn: ({ signal }) => unwrap(getCustomerOrdersAdmin(customerId!, { signal })),
    enabled: Boolean(id),
  });
  const metrics = orders.data ? customerMetrics(orders.data) : null;
  const requestClose = () => {
    if (saving) return;
    if (dirty) setDiscard(true);
    else onClose();
  };
  return (
    <>
      <Dialog
        open={Boolean(id)}
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <DialogContent
          className="adm admin-popover customer-crm-drawer"
          placement="right"
          showCloseButton={false}
          onEscapeKeyDown={(event) => {
            if (saving) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (saving) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus();
          }}
        >
          <DialogHeader className="customer-crm-header">
            <div>
              <DialogTitle>Cadastro do cliente</DialogTitle>
              <DialogDescription>
                Contato, relacionamento e histórico de compras.
              </DialogDescription>
            </div>
            <ControlTooltip label="Fechar cadastro">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={requestClose}
                disabled={saving}
                aria-label="Fechar cadastro do cliente"
              >
                <X size={17} aria-hidden="true" />
              </Button>
            </ControlTooltip>
          </DialogHeader>
          <div className="customer-crm-body">
            {profile.error && profile.data && (
              <ErrorBox error={profile.error} retry={() => profile.refetch()} />
            )}
            {profile.error && !profile.data ? (
              <ErrorBox error={profile.error} retry={() => profile.refetch()} />
            ) : profile.data ? (
              <CustomerContactForm
                key={customerId}
                customer={profile.data}
                onDirtyChange={setDirty}
                onSavingChange={setSaving}
              />
            ) : (
              <AdminBlockLoading
                label="Carregando cadastro do cliente…"
                minHeight={320}
              />
            )}
            <section
              className="customer-crm-section"
              aria-labelledby="customer-crm-metrics-title"
            >
              <h3 id="customer-crm-metrics-title">Relacionamento com a loja</h3>
              {orders.error && orders.data && (
                <ErrorBox error={orders.error} retry={() => orders.refetch()} />
              )}
              {orders.error && !orders.data ? (
                <ErrorBox error={orders.error} retry={() => orders.refetch()} />
              ) : metrics ? (
                <dl className="customer-crm-metrics">
                  <div>
                    <dt>Pedidos</dt>
                    <dd>
                      {metrics.count}
                      <small>{metrics.paidCount} pagos</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Total comprado</dt>
                    <dd>
                      {brl(metrics.totalCents)}
                      <small>Pedidos pagos, com frete e descontos</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Ticket médio</dt>
                    <dd>
                      {brl(metrics.averageCents)}
                      <small>Por pedido pago</small>
                    </dd>
                  </div>
                  <div>
                    <dt>Último pedido</dt>
                    <dd className="customer-crm-date">
                      {metrics.lastOrder
                        ? date(metrics.lastOrder.createdAt)
                        : "Ainda não comprou"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <AdminBlockLoading
                  label="Carregando resumo de compras…"
                  minHeight={140}
                />
              )}
            </section>
            <section
              className="customer-crm-section customer-crm-history"
              aria-labelledby="customer-crm-history-title"
            >
              <h3 id="customer-crm-history-title">Histórico de pedidos</h3>
              {orders.data ? (
                <CustomerOrders key={customerId} orders={orders.data} />
              ) : orders.error ? (
                <p className="customer-crm-help">
                  Use “Tentar novamente” no resumo para recarregar os pedidos.
                </p>
              ) : (
                <AdminBlockLoading
                  label="Carregando pedidos deste cliente…"
                  minHeight={180}
                />
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={discard} onOpenChange={setDiscard}>
        <AlertDialogContent className="adm admin-popover rounded-2xl p-5">
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Há alterações no contato que ainda não foram salvas. Você pode
              continuar editando ou fechar sem salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDiscard(false);
                setDirty(false);
                onClose();
              }}
            >
              Descartar alterações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CustomerContactForm({
  customer,
  onDirtyChange,
  onSavingChange,
}: {
  customer: CustomerRecord;
  onDirtyChange: (value: boolean) => void;
  onSavingChange: (value: boolean) => void;
}) {
  const query = useQueryClient();
  const prefix = useId();
  const [draft, setDraft] = useState<CustomerContact>({
    name: customer.name,
    phone: customer.phone,
    contactEmail: customer.contactEmail,
  });
  const [saved, setSaved] = useState(draft);
  const [errors, setErrors] = useState<
    Partial<Record<keyof CustomerContact, string>>
  >({});
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const mutation = useMutation({
    mutationFn: (input: CustomerContact) =>
      unwrap(updateCustomerContact(customer.id, input)),
    onSuccess: (updated) => {
      const fields = {
        name: updated.name,
        phone: updated.phone,
        contactEmail: updated.contactEmail,
      };
      setSaved(fields);
      setDraft(fields);
      setErrors({});
      onDirtyChange(false);
      query.setQueryData(["customer", customer.id], updated);
      void query.invalidateQueries({ queryKey: ["customers"] });
      void query.invalidateQueries({ queryKey: ["admin-notifications"] });
      notify.success("Contato do cliente atualizado");
    },
    onError: (error) => notify.error(error.message),
  });
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onSavingChange(mutation.isPending);
  }, [mutation.isPending, onSavingChange]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    const parsed = customerContactSchema.safeParse(draft);
    if (!parsed.success) {
      const next: Partial<Record<keyof CustomerContact, string>> = {};
      for (const issue of parsed.error.issues)
        next[issue.path[0] as keyof CustomerContact] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };
  const patch = (key: keyof CustomerContact, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const contactEmail = saved.contactEmail || customer.email;
  const whatsapp = customerWhatsApp(saved.phone);
  return (
    <form className="customer-crm-section" onSubmit={submit} noValidate>
      <div className="customer-crm-section-heading">
        <h3>Dados de contato</h3>
        <SaveStatus
          status={
            mutation.isPending
              ? "saving"
              : mutation.isError
                ? "error"
                : dirty
                  ? "editing"
                  : "saved"
          }
        />
      </div>
      <fieldset disabled={mutation.isPending} className="customer-crm-fields">
        <label htmlFor={`${prefix}-name`}>
          Nome
          <Input
            id={`${prefix}-name`}
            value={draft.name}
            onChange={(event) => patch("name", event.target.value)}
            maxLength={120}
            autoComplete="off"
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={errors.name ? `${prefix}-name-error` : undefined}
          />
          {errors.name && (
            <span
              className="customer-crm-field-error"
              id={`${prefix}-name-error`}
            >
              {errors.name}
            </span>
          )}
        </label>
        <label htmlFor={`${prefix}-contact`}>
          E-mail de contato
          <Input
            id={`${prefix}-contact`}
            type="email"
            value={draft.contactEmail}
            onChange={(event) => patch("contactEmail", event.target.value)}
            placeholder={customer.email}
            maxLength={254}
            autoComplete="off"
            aria-invalid={Boolean(errors.contactEmail) || undefined}
            aria-describedby={`${prefix}-contact-help${errors.contactEmail ? ` ${prefix}-contact-error` : ""}`}
          />
          <span className="customer-crm-help" id={`${prefix}-contact-help`}>
            Para atendimento. Se vazio, usamos o e-mail de acesso.
          </span>
          {errors.contactEmail && (
            <span
              className="customer-crm-field-error"
              id={`${prefix}-contact-error`}
            >
              {errors.contactEmail}
            </span>
          )}
        </label>
        <label htmlFor={`${prefix}-phone`}>
          Telefone / WhatsApp
          <Input
            id={`${prefix}-phone`}
            type="tel"
            value={draft.phone}
            onChange={(event) => patch("phone", event.target.value)}
            placeholder="(61) 99999-9999"
            maxLength={20}
            autoComplete="off"
            aria-invalid={Boolean(errors.phone) || undefined}
            aria-describedby={
              errors.phone ? `${prefix}-phone-error` : undefined
            }
          />
          {errors.phone && (
            <span
              className="customer-crm-field-error"
              id={`${prefix}-phone-error`}
            >
              {errors.phone}
            </span>
          )}
        </label>
      </fieldset>
      <div className="customer-crm-protected">
        <LockKeyhole size={15} aria-hidden="true" />
        <div>
          <label htmlFor={`${prefix}-login`}>
            E-mail de acesso · protegido
          </label>
          <Input
            id={`${prefix}-login`}
            type="email"
            value={customer.email}
            readOnly
            aria-describedby={`${prefix}-login-help`}
          />
          <p id={`${prefix}-login-help`}>
            Usado para entrar por{" "}
            {customer.provider === "google" ? "Google" : "código por e-mail"}. A
            edição do contato não altera o login.
          </p>
        </div>
      </div>
      <p className="customer-crm-help">
        Cliente desde {date(customer.createdAt)}. Os dados dos pedidos
        anteriores são preservados.
      </p>
      {mutation.error && (
        <p className="customer-crm-field-error" role="alert">
          {mutation.error.message}
        </p>
      )}
      <div className="customer-crm-form-actions">
        <div className="customer-crm-contact-links">
          <a href={`mailto:${contactEmail}`}>
            <Mail size={14} aria-hidden="true" />
            Enviar e-mail
          </a>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <Phone size={14} aria-hidden="true" />
              WhatsApp
            </a>
          )}
        </div>
        <Button type="submit" size="sm" disabled={!dirty || mutation.isPending}>
          <Check size={14} aria-hidden="true" />
          {mutation.isPending ? "Salvando…" : "Salvar contato"}
        </Button>
      </div>
    </form>
  );
}
