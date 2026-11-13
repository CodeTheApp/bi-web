"use client";
import {
  cloneElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { notify } from "@/shared/lib/notify";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/reui/alert";
import { Badge } from "@/shared/ui/reui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { AdminBlockLoading } from "@/shared/ui/admin/AdminBlockLoading";
import { Switch as UiSwitch } from "@/shared/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
export { unwrap } from "@/shared/api/result";
import { Icon } from "@/shared/ui/admin/icons";

/* ---------------- avisos (Sileo) ---------------- */
export const useToast = () => notify;

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={100}>
      {children}
    </TooltipProvider>
  );
}

/* ---------------- status (ReUI Badge) ---------------- */
export const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  andamento: "Em andamento",
  respondido: "Respondido",
  arquivado: "Arquivado",
  publicado: "Publicado",
  rascunho: "Rascunho",
  oculto: "Oculto",
  Ativo: "Ativo",
  "Convite pendente": "Convite pendente",
  fora: "Sem estoque",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_separacao: "Em separação",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
const STATUS_VARIANT = {
  novo: "warning-light",
  "Convite pendente": "warning-light",
  andamento: "info-light",
  respondido: "success-light",
  publicado: "success-light",
  Ativo: "success-light",
  arquivado: "secondary",
  oculto: "secondary",
  rascunho: "primary-light",
  fora: "warning-light",
  aguardando_pagamento: "warning-light",
  pago: "success-light",
  em_separacao: "info-light",
  enviado: "info-light",
  entregue: "success-light",
  cancelado: "secondary",
} as const;

export function Chip({ s, className }: { s: string; className?: string }) {
  const variant =
    STATUS_VARIANT[s as keyof typeof STATUS_VARIANT] ?? "secondary";
  return (
    <Badge
      variant={variant}
      radius="full"
      size="default"
      className={`gap-1.5 px-2 font-medium ${className ?? ""}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[s] ?? s}
    </Badge>
  );
}

/* ---------------- controles ---------------- */
export function ControlTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const child = children as ReactElement<{ "aria-describedby"?: string }>;
  const description =
    [child.props["aria-describedby"], open ? id : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <span className="admin-tooltip-trigger">
          {cloneElement(child, { "aria-describedby": description })}
        </span>
      </TooltipTrigger>
      <TooltipContent id={id} className="admin-tooltip" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Switch({
  checked,
  onChange,
  title,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title?: string;
  label?: string;
}) {
  const description = title ?? label ?? "Mostrar no site";
  const control = (
    <ControlTooltip label={description}>
      <UiSwitch
        className="admin-switch"
        checked={checked}
        onCheckedChange={onChange}
        aria-label={description}
      />
    </ControlTooltip>
  );
  return label ? (
    <span className={`switch-label${checked ? " is-visible" : ""}`}>
      {control}
      <span>{label}</span>
    </span>
  ) : (
    control
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  mobileSelect = false,
  label = "Filtrar resultados",
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
  mobileSelect?: boolean;
  label?: string;
}) {
  const group = (
    <ToggleGroup
      aria-label={label}
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className="rounded-[10px] bg-secondary p-0.5"
      spacing={2}
    >
      {options.map(([v, l]) => (
        <ToggleGroupItem
          key={v}
          value={v}
          size="sm"
          className="rounded-lg px-2.5 text-xs font-medium text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
  return mobileSelect ? (
    <div className="admin-seg-responsive">
      <div className="admin-seg-options">{group}</div>
      <div className="admin-seg-select">
        <Choice
          value={value}
          options={options}
          onChange={onChange}
          label={label}
        />
      </div>
    </div>
  ) : (
    group
  );
}

/** Lista de opções (Select do shadcn/Radix). */
export function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "sm",
  className,
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger
        size={size}
        aria-label={label}
        className={className ?? "w-full"}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="adm admin-popover">
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v} className="min-h-7 text-[13px]">
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onKeyDownCapture={(event) => {
          if (
            event.key === "Escape" &&
            event.target instanceof Element &&
            event.target.closest('[role="dialog"]') === event.currentTarget
          ) {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
        showCloseButton={false}
        className={`adm admin-popover max-h-[86vh] overflow-auto rounded-2xl bg-card p-5 ${wide ? "sm:max-w-[900px]" : "sm:max-w-[520px]"}`}
      >
        <span className="admin-modal-close">
          <ControlTooltip label="Fechar janela">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Fechar janela"
              onClick={onClose}
            >
              <Icon name="x" />
            </Button>
          </ControlTooltip>
        </span>
        <DialogHeader>
          <DialogTitle className="text-[20px] font-semibold leading-tight tracking-tight">
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function PageHead({
  title,
  sub,
  children,
}: {
  title: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="ph">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export const Skeleton = ({
  h = 120,
  style,
}: {
  h?: number;
  style?: React.CSSProperties;
}) => (
  <AdminBlockLoading
    variant="inline"
    minHeight={h}
    style={{ height: h, ...style }}
  />
);

export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle>Não foi possível carregar.</AlertTitle>
      <AlertDescription>
        {error instanceof Error ? error.message : "Tente de novo."}
        {retry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={retry}>
            Tentar de novo
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/* ---------------- utilidades ---------------- */
export function ago(iso: string) {
  const t = new Date(iso).getTime();
  const d = Date.now() - t;
  const H = 3600e3,
    D = 24 * H;
  if (d < 60e3) return "agora";
  if (d < H) return `${Math.round(d / 60e3)} min`;
  if (d < D) return `${Math.round(d / H)} h`;
  if (d < 7 * D) return `${Math.round(d / D)} d`;
  return new Date(t).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
export const initials = (n: string) =>
  n
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** Atraso para salvar enquanto a pessoa digita. Se a tela fechar antes, salva na hora (nada se perde). */
export function useDebounced<T extends unknown[]>(
  fn: (...a: T) => void,
  ms = 700,
) {
  const t = useRef<number | undefined>(undefined);
  const pending = useRef<T | null>(null);
  const f = useRef(fn);
  useEffect(() => {
    f.current = fn;
  });
  useEffect(
    () => () => {
      window.clearTimeout(t.current);
      if (pending.current) f.current(...pending.current);
    },
    [],
  );
  return useMemo(() => {
    const schedule = (...a: T) => {
      window.clearTimeout(t.current);
      pending.current = a;
      t.current = window.setTimeout(() => {
        pending.current = null;
        f.current(...a);
      }, ms);
    };
    schedule.cancel = () => {
      window.clearTimeout(t.current);
      pending.current = null;
    };
    return schedule;
  }, [ms]);
}
