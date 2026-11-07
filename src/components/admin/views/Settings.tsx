"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Settings as S } from "@/lib/content/schema";
import type { AdminUser } from "@/server/admin/types";
import { getSettings, inviteUser, saveSettings } from "@/server/admin/actions";
import { Icon } from "../icons";
import { ErrorBox, initials, Modal, PageHead, Skeleton, unwrap, useToast } from "../ui";

export function Settings() {
  const q = useQuery({ queryKey: ["settings"], queryFn: () => unwrap(getSettings()) });
  if (q.error) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  if (!q.data) return <Skeleton h={400} />;
  return <Form initial={q.data.settings} users={q.data.users} canEdit={q.data.canEdit} />;
}

function Form({ initial, users, canEdit }: { initial: S; users: AdminUser[]; canEdit: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [inv, setInv] = useState(false);
  const save = useMutation({
    mutationFn: () => unwrap(saveSettings(s)),
    onSuccess: () => {
      toast("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast(e.message),
  });
  const f = (k: keyof S) => ({ value: String(s[k] ?? ""), disabled: !canEdit, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS({ ...s, [k]: e.target.value }) });
  return (
    <>
      <PageHead title="Configurações" sub={canEdit ? "Contatos, SEO e quem acessa o painel." : "Só administradores alteram estas configurações."}>
        {canEdit && (
          <button className="btn dark" onClick={() => save.mutate()} disabled={save.isPending}>
            <Icon name="check" />
            Salvar
          </button>
        )}
      </PageHead>
      <div className="two">
        <div className="card pad stack">
          <b>Contatos e links</b>
          <div className="grid2">
            <label className="f">WhatsApp<input className="in" {...f("whatsapp")} /></label>
            <label className="f">Instagram<input className="in" {...f("instagram")} /></label>
          </div>
          <label className="f">
            E-mail de contato<small>Aparece no site. Os avisos de contato vão para EMAIL_TEAM_TO.</small>
            <input className="in" type="email" {...f("email")} />
          </label>
          <label className="f">Link da loja<input className="in" type="url" {...f("shopUrl")} /></label>
        </div>
        <div className="card pad stack">
          <b>SEO padrão</b>
          <label className="f">Título<small>{s.seoTitle.length} de 70 caracteres</small><input className="in" maxLength={70} {...f("seoTitle")} /></label>
          <label className="f">
            Descrição<small>{s.seoDescription.length} de 160 caracteres</small>
            <textarea className="in" maxLength={160} {...f("seoDescription")} />
          </label>
          <div className="seo">
            <div className="u">brasiliailuminacao.com.br</div>
            <div className="t">{s.seoTitle}</div>
            <div className="d">{s.seoDescription}</div>
          </div>
        </div>
      </div>
      {canEdit && (
        <div className="card tw" style={{ marginTop: 18 }}>
          <div className="row" style={{ padding: "16px 20px" }}>
            <b>Usuários</b>
            <span className="sp" />
            <button className="btn sec sm" onClick={() => setInv(true)}>
              <Icon name="plus" />
              Convidar
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><div className="row"><span className="av">{initials(u.name)}</span><b style={{ fontWeight: 600 }}>{u.name}</b></div></td>
                  <td className="muted">{u.email}</td>
                  <td><span className="tag">{u.role === "admin" ? "Admin" : "Editor"}</span></td>
                  <td><span className={`chip ${u.status === "Ativo" ? "respondido" : "novo"}`}>{u.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Invite open={inv} onClose={() => setInv(false)} />
    </>
  );
}

function Invite({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "admin">("editor");
  const m = useMutation({
    mutationFn: () => unwrap(inviteUser(name, email, role)),
    onSuccess: () => {
      toast(`Convite enviado para ${email}`);
      qc.invalidateQueries({ queryKey: ["settings"] });
      setName("");
      setEmail("");
      onClose();
    },
    onError: (e) => toast(e.message),
  });
  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="serif" style={{ fontSize: 26, marginBottom: 14 }}>Convidar para o painel</h2>
      <div className="stack">
        <label className="f">Nome<input className="in" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="f">E-mail<input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="f">
          Papel
          <select className="in" value={role} onChange={(e) => setRole(e.target.value as "editor" | "admin")}>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <small>Editor edita conteúdo e mensagens; não altera configurações nem usuários.</small>
        </label>
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
        <button className="btn sec" onClick={onClose}>Cancelar</button>
        <button className="btn pri" disabled={!name.trim() || !email.trim() || m.isPending} onClick={() => m.mutate()}>
          Enviar convite
        </button>
      </div>
    </Modal>
  );
}
