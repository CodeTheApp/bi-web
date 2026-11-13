import type { CSSProperties } from "react";
import { AsciiPattern } from "@/shared/ui/ascii/AsciiPattern";

export function AdminBlockLoading({
  label,
  minHeight = 180,
  className = "",
  variant = "card",
  style,
}: {
  label?: string;
  minHeight?: number;
  className?: string;
  variant?: "card" | "inline";
  style?: CSSProperties;
}) {
  return (
    <div
      className={`admin-block-loading ${className}`}
      data-variant={variant}
      style={{ minHeight, ...style }}
      role={label ? "status" : undefined}
      aria-busy="true"
      aria-label={label ? undefined : "Carregando"}
    >
      <AsciiPattern />
      {label && <span className="admin-block-loading-label">{label}</span>}
    </div>
  );
}

export function AdminRouteLoading({ detail = false }: { detail?: boolean }) {
  return (
    <div
      className="admin-route-loading"
      aria-label="Carregando página"
      aria-busy="true"
    >
      <div className="admin-route-loading-heading" aria-hidden="true">
        <AdminBlockLoading minHeight={29} variant="inline" />
        <AdminBlockLoading
          minHeight={13}
          variant="inline"
          style={{ width: "72%" }}
        />
      </div>
      {!detail && (
        <div className="admin-route-loading-stats" aria-hidden="true">
          {[0, 1, 2, 3].map((key) => (
            <AdminBlockLoading key={key} minHeight={100} />
          ))}
        </div>
      )}
      {detail ? (
        <div className="admin-route-loading-columns">
          <div className="stack">
            <AdminBlockLoading minHeight={125} label="Carregando pedido…" />
            <AdminBlockLoading minHeight={300} />
          </div>
          <AdminBlockLoading minHeight={280} label="Carregando informações…" />
        </div>
      ) : (
        <AdminBlockLoading minHeight={370} label="Carregando conteúdo…" />
      )}
    </div>
  );
}
