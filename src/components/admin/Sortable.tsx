"use client";
/* eslint-disable react-hooks/refs -- falso positivo: o retorno de useSortable (setNodeRef, listeners) é lido no render por design do dnd-kit */
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createContext, useContext, type ReactNode } from "react";
import { Icon } from "./icons";

type Handle = ReturnType<typeof useSortable>;
const HandleCtx = createContext<Pick<Handle, "attributes" | "listeners" | "setActivatorNodeRef"> | null>(null);

/** Lista reordenável (mouse, toque e teclado). `grid` para cards em grade. */
export function SortableList<T>({ items, getId, onMove, grid, children }: { items: T[]; getId: (t: T) => string; onMove: (next: T[]) => void; grid?: boolean; children: ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = items.map(getId);
  const end = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onMove(arrayMove(items, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={ids} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** Um item da lista. Por padrão arrasta pelo item todo; com <Grip/> dentro, só pela alça. */
export function SortableItem({ id, className, children, whole, style, onClick }: { id: string; className?: string; children: ReactNode; whole?: boolean; style?: React.CSSProperties; onClick?: () => void }) {
  const s = useSortable({ id });
  return (
    <div
      ref={s.setNodeRef}
      className={`${className ?? ""}${s.isDragging ? " dragging" : ""}${s.isOver && !s.isDragging ? " over" : ""}`}
      style={{ ...style, transform: CSS.Translate.toString(s.transform), transition: s.transition, position: "relative", zIndex: s.isDragging ? 5 : undefined }}
      onClick={onClick}
      {...(whole ? { ...s.attributes, ...s.listeners } : {})}
    >
      <HandleCtx.Provider value={{ attributes: s.attributes, listeners: s.listeners, setActivatorNodeRef: s.setActivatorNodeRef }}>{children}</HandleCtx.Provider>
    </div>
  );
}

export function Grip({ style }: { style?: React.CSSProperties }) {
  const h = useContext(HandleCtx);
  return (
    <span className="grip" ref={h?.setActivatorNodeRef} {...h?.attributes} {...h?.listeners} style={style} aria-label="Arrastar para reordenar" onClick={(e) => e.stopPropagation()}>
      <Icon name="grip" />
    </span>
  );
}
