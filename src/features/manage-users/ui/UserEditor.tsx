"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AdminUser, Me, Role } from "@/entities/admin";
import { updateAdminUser, updateMyProfile } from "@/server/admin/user-actions";
import { MediaPicker } from "@/features/media-library/client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Modal, unwrap, useToast } from "@/shared/ui/admin/ui";
import { Image as ImageIcon, Check, X, Upload } from "@/shared/ui/icons/lucide";
import { userProfileSchema, adminUserSchema } from "../model/user-schema";
import { StaffAvatar } from "./StaffAvatar";
import { AvatarCropDialog, type AvatarCropSource } from "./AvatarCropDialog";
import {
  IMAGE_UPLOAD_TYPES,
  IMAGE_UPLOAD_LIMIT,
} from "@/shared/lib/upload-policy";
import "./users.css";

type Props = {
  open: boolean;
  onClose: () => void;
  user: Me | AdminUser;
  mode: "self" | "admin";
  currentUserId?: string;
};

export function UserEditor({ open, onClose, ...props }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={props.mode === "self" ? "Meu perfil" : "Editar usuário"}
      description={
        props.mode === "self"
          ? "Atualize seu nome e a foto que aparece no painel."
          : "Atualize os dados e o acesso desta pessoa ao painel."
      }
    >
      {open && (
        <UserForm
          key={`${props.mode}-${props.user.id}`}
          {...props}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function UserForm({ user, mode, currentUserId, onClose }: Omit<Props, "open">) {
  const uid = useId();
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [pick, setPick] = useState(false);
  const [validation, setValidation] = useState("");
  const [cropSource, setCropSource] = useState<AvatarCropSource | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (cropSource?.local) URL.revokeObjectURL(cropSource.src);
    },
    [cropSource],
  );
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!(IMAGE_UPLOAD_TYPES as readonly string[]).includes(file.type)) {
      setValidation("Use uma foto JPG, PNG, WebP ou AVIF.");
      return;
    }
    if (file.size > IMAGE_UPLOAD_LIMIT) {
      setValidation("Envie uma foto de até 15 MB.");
      return;
    }
    setValidation("");
    setCropSource({
      src: URL.createObjectURL(file),
      name: file.name,
      local: true,
    });
  };
  const ownAccount = mode === "self" || user.id === currentUserId;
  const save = useMutation({
    mutationFn: async () =>
      mode === "self"
        ? unwrap(updateMyProfile({ name, avatarUrl }))
        : unwrap(updateAdminUser(user.id, { name, email, role, avatarUrl })),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["settings"] }),
        qc.invalidateQueries({ queryKey: ["media"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      router.refresh();
      toast.success(
        mode === "self" ? "Perfil atualizado" : "Usuário atualizado",
      );
      onClose();
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed =
      mode === "self"
        ? userProfileSchema.safeParse({ name, avatarUrl })
        : adminUserSchema.safeParse({ name, email, role, avatarUrl });
    if (!parsed.success) {
      setValidation(parsed.error.issues[0]?.message ?? "Revise os dados.");
      return;
    }
    setValidation("");
    save.mutate();
  };
  return (
    <>
      <form className="staff-profile-form" onSubmit={submit}>
        <div
          className="staff-profile-photo"
          role="group"
          aria-labelledby={`${uid}-photo`}
        >
          <StaffAvatar
            name={name}
            url={avatarUrl}
            className="staff-profile-avatar"
          />
          <div className="staff-profile-photo-actions">
            <span id={`${uid}-photo`} className="staff-profile-photo-label">
              Foto do perfil
            </span>
            <span className="muted staff-profile-photo-hint">
              A imagem aparece em um recorte circular.
            </span>
            <div className="row">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPick(true)}
                disabled={save.isPending}
              >
                <ImageIcon size={15} />
                {avatarUrl ? "Trocar foto" : "Escolher foto"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
                disabled={save.isPending}
              >
                <Upload size={15} />
                Enviar foto
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setCropSource({ src: avatarUrl, name: "Foto do perfil" })
                  }
                  disabled={save.isPending}
                >
                  Ajustar recorte
                </Button>
              )}
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAvatarUrl("")}
                  disabled={save.isPending}
                >
                  <X size={14} />
                  Remover
                </Button>
              )}
            </div>
          </div>
        </div>
        <label className="f" htmlFor={`${uid}-name`}>
          Nome
          <Input
            id={`${uid}-name`}
            autoComplete="name"
            value={name}
            maxLength={100}
            required
            minLength={2}
            disabled={save.isPending}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="f" htmlFor={`${uid}-email`}>
          E-mail
          <Input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            value={email}
            maxLength={254}
            required
            disabled={ownAccount || save.isPending}
            onChange={(event) => setEmail(event.target.value)}
            aria-describedby={
              ownAccount ? `${uid}-access-hint` : `${uid}-email-hint`
            }
          />
          {!ownAccount && (
            <small id={`${uid}-email-hint`} className="hint">
              Este é o e-mail usado para entrar no painel.
            </small>
          )}
        </label>
        {mode === "admin" && (
          <div className="f">
            <label htmlFor={`${uid}-role`}>Papel</label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as Role)}
              disabled={ownAccount || save.isPending}
            >
              <SelectTrigger
                id={`${uid}-role`}
                aria-describedby={`${uid}-access-hint`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="adm admin-popover">
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <p id={`${uid}-access-hint`} className="hint staff-profile-access-hint">
          {ownAccount
            ? "Seu e-mail e seu papel permanecem protegidos nesta tela."
            : "Administradores gerenciam usuários e configurações. Editores trabalham com conteúdo e mensagens."}
        </p>
        {(validation || save.error) && (
          <p role="alert" className="staff-profile-error">
            {validation || save.error?.message}
          </p>
        )}
        <div className="staff-profile-footer">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            <Check size={15} />
            {save.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </form>
      <input
        type="file"
        ref={fileInput}
        hidden
        accept={IMAGE_UPLOAD_TYPES.join(",")}
        onChange={chooseFile}
        aria-label="Enviar foto do perfil"
      />
      <MediaPicker
        open={pick}
        onClose={() => setPick(false)}
        onPick={(media) => {
          if (media.kind !== "video")
            setCropSource({ src: media.url, name: media.name || "Foto" });
        }}
      />
      {cropSource && (
        <AvatarCropDialog
          key={cropSource.src}
          source={cropSource}
          name={name}
          onClose={() => setCropSource(null)}
          onConfirm={(media) => {
            setAvatarUrl(media.url);
            setCropSource(null);
          }}
          onUpload={() => fileInput.current?.click()}
        />
      )}
    </>
  );
}
