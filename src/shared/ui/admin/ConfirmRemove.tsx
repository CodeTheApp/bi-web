"use client";

import { useState, type ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/shared/ui/alert-dialog";
import HoldButton from "@/shared/ui/kokonutui/hold-button";
import { ControlTooltip } from "./ui";

/** A trash click opens a decision; only a completed hold invokes the removal. */
export function ConfirmRemove({
  title,
  description,
  label,
  disabled,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  label: string;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    if (pending || disabled) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível remover. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!pending && (!value || !disabled)) {
          setOpen(value);
          setError(null);
        }
      }}
    >
      <ControlTooltip label={label}>
        <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      </ControlTooltip>
      <AlertDialogContent className="adm admin-popover rounded-2xl p-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[18px] font-medium">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <HoldButton
            disabled={pending || disabled}
            holdingLabel="Continue pressionando…"
            completeLabel="Solicitado"
            resetAfter={1800}
            onHoldComplete={() => {
              void confirm();
            }}
          >
            Segure para remover
          </HoldButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
