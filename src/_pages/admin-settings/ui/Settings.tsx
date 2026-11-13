"use client";
import { getSettings } from "@/shared/api/admin-reads";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Tabs } from "radix-ui";
import { formatPhoneNumber } from "react-phone-number-input";
import { PhoneInput } from "@/shared/ui/reui/phone-input";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  brandOf,
  normalizeSettings,
  settingsChanges,
  settingsSchema,
  type SettingsPatch,
  type BrandSettings,
  type Settings as S,
} from "@/entities/site-content";
import { inviteUser, saveSettings } from "@/server/admin/actions";
import type { IntegrationStatus } from "@/server/admin/integration-status";
import { UserTable } from "@/features/manage-users/client";
import { MediaPicker } from "@/features/media-library/client";
import { StoreSettingsFields } from "@/features/store-settings";
import type { AdminUser } from "@/entities/admin";
import { Icon } from "@/shared/ui/admin/icons";
import {
  Check,
  CircleAlert,
  Image as ImageIcon,
  ExternalLink,
  Undo2,
} from "@/shared/ui/icons/lucide";
import {
  Choice,
  ErrorBox,
  Modal,
  PageHead,
  Skeleton,
  unwrap,
} from "@/shared/ui/admin/ui";
import SaveStatus from "@/shared/ui/kokonutui/save-status";
import { notify } from "@/shared/lib/notify";
import {
  settingsTabParser,
  SETTINGS_TABS,
  type SettingsTab,
} from "../model/tabs";
import "./settings-responsive.css";

const toE164 = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d ? `+${d.startsWith("55") ? d : `55${d}`}` : "";
};
type Normalized = ReturnType<typeof normalizeSettings>;
type SettingsData = Extract<
  Awaited<ReturnType<typeof getSettings>>,
  { ok: true }
>["data"];
type Errors = Record<string, string | undefined>;
const assetLabels: Record<keyof BrandSettings, string> = {
  logoLight: "Logo para fundo escuro",
  logoDark: "Logo para fundo claro",
  compactLight: "Símbolo para fundo escuro",
  compactDark: "Símbolo para fundo claro",
  favicon: "Ícone do navegador",
  ogImage: "Imagem de compartilhamento",
};

export function Settings() {
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: ({ signal }) => unwrap(getSettings({ signal })),
  });
  if (q.error && !q.data)
    return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  if (!q.data) return <Skeleton h={400} />;
  return (
    <>
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      <Form
        initial={q.data.settings}
        users={q.data.users}
        canEdit={q.data.canEdit}
        currentUserId={q.data.me.id}
        integrations={q.data.integrations}
      />
    </>
  );
}

function Form({
  initial,
  users,
  canEdit,
  currentUserId,
  integrations,
}: {
  initial: S;
  users: AdminUser[];
  canEdit: boolean;
  currentUserId: string;
  integrations: IntegrationStatus;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const [s, setS] = useState(() => normalizeSettings(initial));
  const [baseline, setBaseline] = useState(() => normalizeSettings(initial));
  const [lastInitial, setLastInitial] = useState(initial);
  const [storeValid, setStoreValid] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [inv, setInv] = useState(false);
  const [asset, setAsset] = useState<keyof BrandSettings | null>(null);
  const [tab, setTab] = useQueryState("aba", settingsTabParser);
  const dirty = JSON.stringify(s) !== JSON.stringify(baseline);
  const save = useMutation({
    mutationFn: (patch: SettingsPatch) => unwrap(saveSettings(patch)),
    onSuccess: (value) => {
      const canonical = normalizeSettings(value);
      qc.setQueryData<SettingsData>(["settings"], (current) =>
        current ? { ...current, settings: canonical } : current,
      );
      setS(canonical);
      setBaseline(canonical);
      setErrors({});
      notify.success("Configurações salvas");
      void qc.invalidateQueries({ queryKey: ["settings"] });
      router.refresh();
    },
    onError: (e) => notify.error(e.message),
  });
  // Guarded render adjustment: pristine forms follow realtime reads; active drafts
  // retain their original baseline so only the user's edited leaves are submitted.
  if (lastInitial !== initial && !dirty && storeValid && !save.isPending) {
    setLastInitial(initial);
    const latest = normalizeSettings(initial);
    setS(latest);
    setBaseline(latest);
  }
  const disabled = !canEdit || save.isPending;
  const change = (update: Partial<Normalized>, path: string) => {
    setS((current) => ({ ...current, ...update }));
    setErrors((current) => ({ ...current, [path]: undefined }));
    if (save.isError) save.reset();
  };
  const field = (
    key: "whatsapp" | "instagram" | "email" | "seoTitle" | "seoDescription",
  ) => ({
    id: `setting-${key}`,
    value: s[key],
    disabled,
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `setting-error-${key}` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      change({ [key]: e.target.value }, key),
  });
  const companyField = (key: keyof Normalized["company"]) => ({
    id: `setting-company-${key}`,
    value: s.company[key],
    disabled,
    "aria-invalid": Boolean(errors[`company.${key}`]),
    "aria-describedby": errors[`company.${key}`]
      ? `setting-error-company.${key}`
      : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      change(
        { company: { ...s.company, [key]: e.target.value } },
        `company.${key}`,
      ),
  });
  const error = (path: string) =>
    errors[path] && (
      <small
        id={`setting-error-${path}`}
        className="settings-field-error"
        role="alert"
      >
        {errors[path]}
      </small>
    );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (disabled || !dirty || !storeValid) return;
    const parsed = settingsSchema.safeParse(s);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues)
        next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      const first = parsed.error.issues[0]?.path[0];
      void setTab(
        first === "store"
          ? "loja"
          : first === "brand" ||
              first === "seoTitle" ||
              first === "seoDescription"
            ? "marca"
            : "empresa",
      );
      notify.error("Revise os campos indicados antes de salvar.");
      return;
    }
    const patch = settingsChanges(baseline, parsed.data);
    if (!Object.keys(patch).length) {
      const latest = normalizeSettings(initial);
      setS(latest);
      setBaseline(latest);
      setErrors({});
      return;
    }
    save.mutate(patch);
  };
  const brand = brandOf(s);
  return (
    <>
      <PageHead
        title="Configurações"
        sub={
          canEdit
            ? "Empresa, loja, identidade visual e acesso ao painel."
            : "Visualização das configurações. Somente administradores podem alterá-las."
        }
      >
        <SaveStatus
          status={
            save.isPending
              ? "saving"
              : save.isError
                ? "error"
                : dirty || !storeValid
                  ? "editing"
                  : "saved"
          }
        />
        {canEdit && (
          <Button
            variant="dark"
            type="submit"
            form="admin-settings-form"
            disabled={disabled || !dirty || !storeValid}
            aria-describedby={
              !storeValid ? "settings-store-validation" : undefined
            }
          >
            <Check size={16} />
            Salvar alterações
          </Button>
        )}
      </PageHead>
      {!storeValid && (
        <p
          id="settings-store-validation"
          className="settings-field-error"
          role="alert"
        >
          Revise os valores na aba Loja antes de salvar.{" "}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void setTab("loja")}
          >
            Revisar loja
          </Button>
        </p>
      )}
      <Tabs.Root
        value={tab}
        onValueChange={(value) => void setTab(value as SettingsTab)}
        className="admin-settings"
      >
        <Tabs.List className="settings-tabs" aria-label="Áreas de configuração">
          {SETTINGS_TABS.map(([value, label]) => (
            <Tabs.Trigger className="settings-tab" value={value} key={value}>
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <form id="admin-settings-form" onSubmit={submit} noValidate>
          <Tabs.Content value="empresa" className="settings-panel">
            <div className="settings-card-grid">
              <section className="card pad stack">
                <div className="settings-card-heading">
                  <h2>Empresa</h2>
                  <p>
                    Identificação e localização exibidas no rodapé e na área de
                    contato.
                  </p>
                </div>
                <label className="f" htmlFor="setting-company-commercialName">
                  Nome comercial
                  <Input maxLength={100} {...companyField("commercialName")} />
                  {error("company.commercialName")}
                </label>
                <label className="f" htmlFor="setting-company-legalName">
                  Razão social{" "}
                  <small>
                    Opcional. Quando preenchida, aparece nos direitos autorais
                    do rodapé.
                  </small>
                  <Input maxLength={160} {...companyField("legalName")} />
                  {error("company.legalName")}
                </label>
                <label className="f" htmlFor="setting-company-address">
                  Endereço público
                  <Input
                    maxLength={240}
                    {...companyField("address")}
                    placeholder="Rua, número e complemento"
                  />
                  {error("company.address")}
                </label>
                <label className="f" htmlFor="setting-company-city">
                  Cidade / estado
                  <Input maxLength={100} {...companyField("city")} />
                  {error("company.city")}
                </label>
                <label className="f" htmlFor="setting-company-mapsUrl">
                  Link do mapa{" "}
                  <small>
                    Opcional. Link público do Google Maps ou outro serviço de
                    mapas.
                  </small>
                  <Input
                    type="url"
                    {...companyField("mapsUrl")}
                    placeholder="https://maps.google.com/..."
                  />
                  {error("company.mapsUrl")}
                </label>
              </section>
              <section className="card pad stack">
                <div className="settings-card-heading">
                  <h2>Atendimento e contatos</h2>
                  <p>
                    Esses dados aparecem no site. O e-mail abaixo não altera os
                    acessos da equipe.
                  </p>
                </div>
                <label className="f" htmlFor="setting-whatsapp">
                  WhatsApp
                  <PhoneInput
                    className="admin-settings-phone"
                    id="setting-whatsapp"
                    defaultCountry="BR"
                    value={toE164(s.whatsapp)}
                    disabled={disabled}
                    aria-label="WhatsApp"
                    aria-invalid={Boolean(errors.whatsapp)}
                    onChange={(value) =>
                      change(
                        {
                          whatsapp: value
                            ? formatPhoneNumber(value) || value
                            : "",
                        },
                        "whatsapp",
                      )
                    }
                  />
                  {error("whatsapp")}
                </label>
                <label className="f" htmlFor="setting-instagram">
                  Instagram
                  <Input {...field("instagram")} />
                  {error("instagram")}
                </label>
                <label className="f" htmlFor="setting-email">
                  E-mail de contato
                  <Input type="email" {...field("email")} />
                  {error("email")}
                </label>
                <label className="f" htmlFor="setting-company-serviceHours">
                  Horário de atendimento
                  <Textarea
                    rows={3}
                    maxLength={240}
                    {...companyField("serviceHours")}
                    placeholder="Ex.: segunda a sexta, das 9h às 18h"
                  />
                  {error("company.serviceHours")}
                </label>
              </section>
            </div>
          </Tabs.Content>
          <Tabs.Content forceMount value="loja" className="settings-panel">
            <section className="card pad">
              <div className="settings-card-heading">
                <h2>Operação da loja</h2>
                <p>Entrega, retirada e orientações exibidas no checkout.</p>
              </div>
              <StoreSettingsFields
                value={s.store}
                disabled={disabled}
                onChange={(store) => change({ store }, "store")}
                onValidityChange={setStoreValid}
              />
              {Object.entries(errors)
                .filter(([path]) => path.startsWith("store"))
                .map(([path, message]) => (
                  <p key={path} className="settings-field-error" role="alert">
                    {message}
                  </p>
                ))}
            </section>
          </Tabs.Content>
          <Tabs.Content value="marca" className="settings-panel">
            <section className="card pad stack">
              <div className="settings-card-heading">
                <h2>Identidade visual</h2>
                <p>
                  Logos normais no site e versões compactas no menu móvel e no
                  painel. Vazio mantém a arte original. Use arquivos com margens
                  pequenas e fundo transparente para os logos.
                </p>
              </div>
              <div className="settings-assets">
                {(Object.keys(assetLabels) as Array<keyof BrandSettings>).map(
                  (key) => (
                    <AssetField
                      key={key}
                      assetKey={key}
                      label={assetLabels[key]}
                      value={s.brand[key]}
                      fallback={brand[key]}
                      error={errors[`brand.${key}`]}
                      disabled={disabled}
                      onChoose={() => setAsset(key)}
                      onChange={(value) =>
                        change(
                          { brand: { ...s.brand, [key]: value } },
                          `brand.${key}`,
                        )
                      }
                    />
                  ),
                )}
              </div>
            </section>
            <section className="card pad stack">
              <div className="settings-card-heading">
                <h2>Busca e compartilhamento</h2>
                <p>
                  Padrão da página inicial e das páginas sem informações
                  próprias.
                </p>
              </div>
              <div className="settings-card-grid">
                <div className="stack">
                  <label className="f" htmlFor="setting-seoTitle">
                    Título <small>{s.seoTitle.length} de 70 caracteres</small>
                    <Input maxLength={70} {...field("seoTitle")} />
                    {error("seoTitle")}
                  </label>
                  <label className="f" htmlFor="setting-seoDescription">
                    Descrição{" "}
                    <small>{s.seoDescription.length} de 160 caracteres</small>
                    <Textarea
                      rows={3}
                      maxLength={160}
                      {...field("seoDescription")}
                    />
                    {error("seoDescription")}
                  </label>
                </div>
                <div className="seo settings-seo-preview">
                  <div className="u">Prévia do resultado de busca</div>
                  <div className="t">{s.seoTitle}</div>
                  <div className="d">{s.seoDescription}</div>
                </div>
              </div>
            </section>
          </Tabs.Content>
        </form>
        <Tabs.Content value="equipe" className="settings-panel">
          <section className="card">
            <div className="card-h">
              <div className="settings-card-heading">
                <h2>Equipe</h2>
                <p>Acessos ao painel e papéis de cada pessoa.</p>
              </div>
              <span className="sp" />
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInv(true)}
                >
                  <Icon name="plus" />
                  Convidar
                </Button>
              )}
            </div>
            {canEdit ? (
              <UserTable users={users} currentUserId={currentUserId} />
            ) : (
              <p className="settings-permission-note">
                Somente administradores podem consultar e gerenciar a equipe.
              </p>
            )}
          </section>
        </Tabs.Content>
        <Tabs.Content value="integracoes" className="settings-panel">
          <Integrations status={integrations} />
        </Tabs.Content>
      </Tabs.Root>
      <MediaPicker
        open={asset !== null}
        onClose={() => setAsset(null)}
        onPick={(media) => {
          if (asset)
            change(
              { brand: { ...s.brand, [asset]: media.url } },
              `brand.${asset}`,
            );
          setAsset(null);
        }}
      />
      <Invite
        open={inv}
        demo={integrations.demo}
        onClose={() => setInv(false)}
      />
    </>
  );
}

function AssetField({
  assetKey,
  label,
  value,
  fallback,
  error,
  disabled,
  onChoose,
  onChange,
}: {
  assetKey: keyof BrandSettings;
  label: string;
  value: string;
  fallback: string;
  error?: string;
  disabled: boolean;
  onChoose: () => void;
  onChange: (value: string) => void;
}) {
  const dark = assetKey === "logoLight" || assetKey === "compactLight";
  const publicOnly = assetKey === "favicon" || assetKey === "ogImage";
  return (
    <div className="settings-asset">
      <div
        className={`settings-asset-preview${dark ? " settings-asset-dark" : ""}${assetKey === "ogImage" ? " settings-asset-cover" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value || fallback} alt={`Prévia: ${label.toLowerCase()}`} />
        <span>{value ? "Personalizado" : "Padrão"}</span>
      </div>
      <label className="f" htmlFor={`setting-brand-${assetKey}`}>
        {label}
        <Input
          id={`setting-brand-${assetKey}`}
          value={value}
          disabled={disabled}
          placeholder="Usar imagem padrão"
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `setting-error-brand.${assetKey}` : undefined
          }
          onChange={(event) => onChange(event.target.value)}
        />
        {publicOnly && (
          <small>
            Use uma URL pública ou imagem publicada da biblioteca. Uploads
            locais de demonstração não geram um endereço público.
          </small>
        )}
        {error && (
          <small
            id={`setting-error-brand.${assetKey}`}
            className="settings-field-error"
            role="alert"
          >
            {error}
          </small>
        )}
      </label>
      <div className="settings-asset-actions">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={onChoose}
        >
          <ImageIcon size={14} />
          Escolher imagem
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || !value}
          onClick={() => onChange("")}
          aria-label={`Restaurar padrão: ${label.toLowerCase()}`}
        >
          <Undo2 size={14} />
          Restaurar
        </Button>
      </div>
    </div>
  );
}

function Integrations({ status }: { status: IntegrationStatus }) {
  const items = [
    {
      name: "Supabase",
      enabled: status.supabase,
      text: status.demo
        ? "O painel está usando os dados isolados de demonstração."
        : "Banco de dados e autenticação da aplicação.",
      docs: "https://supabase.com/docs",
    },
    {
      name: "E-mails de saída",
      enabled: status.email,
      text: status.demo
        ? "Respostas e convites são registrados na demonstração, sem envio real."
        : "Envio pelo Resend. O endereço remetente é definido no servidor.",
      docs: "https://resend.com/docs",
    },
    {
      name: "E-mails recebidos",
      enabled: status.inboundEmail,
      text: "Recebimento pelo webhook do Resend, com acesso de serviço ao banco. O domínio de resposta pode ser configurado separadamente.",
      docs: "https://resend.com/docs/dashboard/receiving/introduction",
    },
    {
      name: "Armazenamento de mídia",
      enabled: status.storage,
      text: status.storage
        ? "Uploads enviados para o armazenamento S3 configurado."
        : "Sem armazenamento S3. Imagens e vídeos ficam embutidos nos dados, com um limite de upload reduzido.",
      docs: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html",
    },
    {
      name: "Pagamentos",
      enabled: status.payments,
      simulated: status.paymentsSimulated,
      text: status.paymentsSimulated
        ? "Checkout de teste: não há cobrança real. A conexão com um provedor de pagamentos ainda não está implementada."
        : "Provedor de pagamentos conectado ao checkout.",
      docs: undefined,
    },
    {
      name: "Cloudflare Turnstile",
      enabled: status.turnstile,
      text: "Proteção do formulário de contato. Requer a chave pública e a chave secreta no servidor.",
      docs: "https://developers.cloudflare.com/turnstile/",
    },
  ];
  return (
    <div className="stack">
      <div className="card pad settings-integration-note">
        <CircleAlert size={17} />
        <p>
          Estado informado pelo servidor. Credenciais são gerenciadas no
          ambiente de implantação e nunca aparecem neste painel.
          {status.demo &&
            " Você está no modo demonstração; dados e ações de teste são isolados da operação real."}
        </p>
      </div>
      <div className="settings-integrations">
        {items.map((item) => (
          <section className="card pad settings-integration" key={item.name}>
            <div className="settings-integration-heading">
              <h2>{item.name}</h2>
              <span
                className={`settings-integration-status ${item.enabled ? "is-connected" : item.simulated ? "is-simulated" : ""}`}
              >
                {item.enabled
                  ? "Configurado"
                  : item.simulated
                    ? "Simulado"
                    : "Não configurado"}
              </span>
            </div>
            <p>{item.text}</p>
            {item.docs && (
              <a href={item.docs} target="_blank" rel="noopener noreferrer">
                Documentação <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function Invite({
  open,
  onClose,
  demo,
}: {
  open: boolean;
  onClose: () => void;
  demo: boolean;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "admin">("editor");
  const m = useMutation({
    mutationFn: () => unwrap(inviteUser(name, email, role)),
    onSuccess: () => {
      notify.success(
        demo
          ? "Convite criado na demonstração"
          : `Convite enviado para ${email}`,
      );
      void qc.invalidateQueries({ queryKey: ["settings"] });
      setName("");
      setEmail("");
      onClose();
    },
    onError: (e) => notify.error(e.message),
  });
  return (
    <Modal
      open={open}
      onClose={() => {
        if (!m.isPending) onClose();
      }}
      title="Convidar para o painel"
      description={
        demo
          ? "O convite será registrado apenas na demonstração. Nenhum e-mail será enviado."
          : "A pessoa recebe um e-mail para criar a senha."
      }
    >
      <div className="stack">
        <label className="f">
          Nome
          <Input
            value={name}
            disabled={m.isPending}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="f">
          E-mail
          <Input
            type="email"
            value={email}
            disabled={m.isPending}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <div className="f admin-field">
          Papel
          <Choice<"editor" | "admin">
            label="Papel"
            value={role}
            options={[
              ["editor", "Editor"],
              ["admin", "Admin"],
            ]}
            onChange={setRole}
          />
          <small className="hint">
            Editor edita conteúdo e mensagens; não altera configurações nem
            usuários.
          </small>
        </div>
      </div>
      <div className="row admin-settings-invite-actions">
        <Button variant="outline" disabled={m.isPending} onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!name.trim() || !email.trim() || m.isPending}
          onClick={() => m.mutate()}
        >
          {demo ? "Criar convite de teste" : "Enviar convite"}
        </Button>
      </div>
    </Modal>
  );
}
