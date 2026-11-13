"use client";
import type { ReactNode } from "react";
import { Sortable, SortableItem as ReuiItem, SortableItemHandle } from "@/shared/ui/reui/sortable";
import { Icon } from "@/shared/ui/admin/icons";
import { ControlTooltip } from "@/shared/ui/admin/ui";

/**
 * Listas reordenáveis do painel, sobre o Sortable da ReUI (dnd-kit: mouse, toque e teclado).
 * Os itens precisam ser filhos diretos da lista (a ReUI clona o item arrastado para o overlay).
 */
export function SortableList<T>({ items, getId, onMove, grid, className, children }: { items: T[]; getId: (t: T) => string; onMove: (next: T[]) => void; grid?: boolean; className?: string; children: ReactNode }) {
  return (
    <Sortable value={items} getItemValue={getId} onValueChange={onMove} strategy={grid ? "grid" : "vertical"} className={className} overlayClassName="adm">
      {children}
    </Sortable>
  );
}

export function SortableItem({ value, className, children, style, onClick }: { value: string; className?: string; children: ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <ReuiItem value={value} className={className} style={style} onClick={onClick}>
      {children}
    </ReuiItem>
  );
}

/** Alça de arrastar (ícone de pontinhos). Com `asChild`, qualquer área vira alça. */
export function Grip({ style, className, children }: { style?: React.CSSProperties; className?: string; children?: ReactNode }) {
  const handle = (
    <SortableItemHandle className={children ? className : `grip ${className ?? ""}`} style={style} role={children ? undefined : "button"} tabIndex={children ? undefined : 0} aria-label="Arrastar para reordenar" onClick={(e) => e.stopPropagation()}>
      {children ?? <Icon name="grip" />}
    </SortableItemHandle>
  );
  return children ? handle : <ControlTooltip label="Arraste para reordenar. No teclado, use Espaço e as setas.">{handle}</ControlTooltip>;
}
