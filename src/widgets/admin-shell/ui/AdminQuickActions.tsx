"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { QUICK_DESTINATIONS } from "../model/navigation";
import { MotionConfig } from "motion/react";
import MarkingMenu from "@/shared/ui/kokonutui/marking-menu";

export function AdminQuickActions() {
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !event.altKey ||
        event.code !== "KeyM" ||
        document.querySelector('[role="dialog"][aria-modal="true"]')
      )
        return;
      event.preventDefault();
      host.current
        ?.querySelector<HTMLButtonElement>("[data-marking-trigger]")
        ?.click();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div ref={host} className="admin-quick-actions-host">
      <MotionConfig reducedMotion="user">
        <MarkingMenu
          items={QUICK_DESTINATIONS}
          className="admin-quick-menu"
          triggerLabel="Ações rápidas (Alt+M)"
          onSelect={(item) => router.push(item.id)}
        >
          <span className="sr-only">
            Use as setas para escolher uma página e Enter para abrir. Escape
            fecha o menu.
          </span>
        </MarkingMenu>
      </MotionConfig>
    </div>
  );
}
