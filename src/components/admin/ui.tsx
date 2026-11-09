"use client";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { toast as sonner } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton as UiSkeleton } from "@/components/ui/skeleton";
import { Switch as UiSwitch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Result } from "@/server/admin/actions";

/* ---------------- resultado das ações ---------------- */
export async function unwrap<T>(p: Promise<Result<T>>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

/* ---------------- avisos (sonner) ---------------- */
export const useToast = () => notify;
const notify = (msg: string) => sonner(msg);

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{ classNames: { toast: "!bg-marrom-escuro !text-branco !border-marrom-escuro !rounded-xl !font-medium", icon: "!text-ambar-golden" } }}
      />
    </>
  );
}

/* ---------------- status (ReUI Badge) ---------------- */
export const STATUS_LABEL: Record<string, string> = {
  novo: "Novo", andamento: "Em andamento", respondido: "Respondido", arquivado: "Arquivado", publicado: "Publicado", rascunho: "Rascunho", oculto: "Oculto",
  Ativo: "Ativo", "Convite pendente": "Convite pendente", fora: "Sem estoque",
};
const STATUS_VARIANT = {
  novo: "warning-light", "Convite pendente": "warning-light", andamento: "info-light", respondido: "success-light", publicado: "success-light", Ativo: "success-light",
  arquivado: "secondary", oculto: "secondary", rascunho: "primary-light", fora: "warning-light",
} as const;

export function Chip({ s, className }: { s: string; className?: string }) {
  const variant = STATUS_VARIANT[s as keyof typeof STATUS_VARIANT] ?? "secondary";
  return (
    <Badge variant={variant} radius="full" size="lg" className={`gap-1.5 px-2 font-semibold ${className ?? ""}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[s] ?? s}
    </Badge>
  );
}

/* ---------------- controles ---------------- */
export function Switch({ checked, onChange, title }: { checked: boolean; onChange: (v: boolean) => void; title?: string }) {
  return <UiSwitch checked={checked} onCheckedChange={onChange} aria-label={title} title={title} />;
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      className="rounded-[10px] bg-secondary p-[3px]"
      spacing={2}
    >
      {options.map(([v, l]) => (
        <ToggleGroupItem
          key={v}
          value={v}
          size="sm"
          className="rounded-lg px-3 text-[12.5px] font-semibold text-muted-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Lista de opções (Select do shadcn/Radix). */
export function Choice<T extends string>({ value, options, onChange, label, size = "default", className }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; label: string; size?: "sm" | "default"; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger size={size} aria-label={label} className={className ?? "w-full"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function Modal({ open, onClose, title, description, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`adm max-h-[86vh] overflow-auto rounded-2xl bg-card p-6 ${wide ? "sm:max-w-[900px]" : "sm:max-w-[560px]"}`}>
        <DialogHeader>
          <DialogTitle className="font-heading text-[26px] font-normal">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
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

export const Skeleton = ({ h = 120, style }: { h?: number; style?: React.CSSProperties }) => <UiSkeleton className="rounded-xl bg-secondary" style={{ height: h, ...style }} />;

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
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
  const H = 3600e3, D = 24 * H;
  if (d < 60e3) return "agora";
  if (d < H) return `${Math.round(d / 60e3)} min`;
  if (d < D) return `${Math.round(d / H)} h`;
  if (d < 7 * D) return `${Math.round(d / D)} d`;
  return new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
export const initials = (n: string) =>
  n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** Atraso para salvar enquanto a pessoa digita. Se a tela fechar antes, salva na hora (nada se perde). */
export function useDebounced<T extends unknown[]>(fn: (...a: T) => void, ms = 700) {
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
  return useCallback(
    (...a: T) => {
      window.clearTimeout(t.current);
      pending.current = a;
      t.current = window.setTimeout(() => {
        pending.current = null;
        f.current(...a);
      }, ms);
    },
    [ms],
  );
}
