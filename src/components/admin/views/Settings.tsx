"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, type SortingState, useTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { formatPhoneNumber } from "react-phone-number-input";
import { DataGrid, DataGridContainer, dataGridFeatures, type DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { PhoneInput } from "@/components/reui/phone-input";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Settings as S } from "@/lib/content/schema";
import { getSettings, inviteUser, saveSettings } from "@/server/admin/actions";
import type { AdminUser } from "@/server/admin/types";
import { Icon } from "../icons";
import { Chip, Choice, ErrorBox, initials, Modal, PageHead, Skeleton, unwrap, useToast } from "../ui";

/** "(61) 98358-3129" ↔ "+5561983583129" (o PhoneInput da ReUI trabalha em E.164; o site mostra o formato nacional). */
const toE164 = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d ? `+${d.startsWith("55") ? d : `55${d}`}` : "";
};

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
          <Button variant="dark" onClick={() => save.mutate()} disabled={save.isPending}>
            <Icon name="check" />
            Salvar
          </Button>
        )}
      </PageHead>
      <div className="two">
        <div className="card pad stack">
          <b>Contatos e links</b>
          <div className="grid2">
            <div className="f" style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, fontSize: 12.5 }}>
              WhatsApp
              <PhoneInput
                defaultCountry="BR"
                value={toE164(s.whatsapp)}
                disabled={!canEdit}
                aria-label="WhatsApp"
                onChange={(v) => setS({ ...s, whatsapp: v ? formatPhoneNumber(v) || v : "" })}
              />
            </div>
            <label className="f">
              Instagram
              <Input {...f("instagram")} />
            </label>
          </div>
          <label className="f">
            E-mail de contato<small>Aparece no site. Os avisos de contato vão para EMAIL_TEAM_TO.</small>
            <Input type="email" {...f("email")} />
          </label>
        </div>
        <div className="card pad stack">
          <b>SEO padrão</b>
          <label className="f">
            Título<small>{s.seoTitle.length} de 70 caracteres</small>
            <Input maxLength={70} {...f("seoTitle")} />
          </label>
          <label className="f">
            Descrição<small>{s.seoDescription.length} de 160 caracteres</small>
            <Textarea maxLength={160} {...f("seoDescription")} />
          </label>
          <div className="seo">
            <div className="u">brasiliailuminacao.com.br</div>
            <div className="t">{s.seoTitle}</div>
            <div className="d">{s.seoDescription}</div>
          </div>
        </div>
      </div>
      {canEdit && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="row" style={{ padding: "16px 20px" }}>
            <b>Usuários</b>
            <span className="sp" />
            <Button variant="outline" size="sm" onClick={() => setInv(true)}>
              <Icon name="plus" />
              Convidar
            </Button>
          </div>
          <Users users={users} />
        </div>
      )}
      <Invite open={inv} onClose={() => setInv(false)} />
    </>
  );
}

/** Tabela de usuários com o Data Grid da ReUI (TanStack Table), ordenável por coluna. */
function Users({ users }: { users: AdminUser[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo<ColumnDef<DataGridFeatures, AdminUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nome",
        size: 180,
        cell: ({ row }) => (
          <div className="row">
            <span className="av">{initials(row.original.name)}</span>
            <b style={{ fontWeight: 600 }}>{row.original.name}</b>
          </div>
        ),
      },
      { accessorKey: "email", header: "E-mail", size: 200, cell: (i) => <span className="muted">{i.getValue() as string}</span>, meta: { headerClassName: "max-md:hidden", cellClassName: "max-md:hidden" } },
      {
        accessorKey: "role",
        header: "Papel",
        size: 90,
        cell: (i) => (
          <Badge variant="secondary" radius="full" size="lg">
            {i.getValue() === "admin" ? "Admin" : "Editor"}
          </Badge>
        ),
      },
      { accessorKey: "status", header: "Status", size: 130, cell: (i) => <Chip s={i.getValue() as string} /> },
    ],
    [],
  );
  const table = useTable({ features: dataGridFeatures, columns, data: users, getRowId: (u: AdminUser) => u.id, state: { sorting }, onSortingChange: setSorting });
  return (
    <DataGrid table={table} recordCount={users.length} tableLayout={{ headerBackground: false, rowBorder: true, width: "auto" }}>
      <DataGridContainer border={false}>
        <DataGridScrollArea>
          <DataGridTable />
        </DataGridScrollArea>
      </DataGridContainer>
    </DataGrid>
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
    <Modal open={open} onClose={onClose} title="Convidar para o painel" description="A pessoa recebe um e-mail para criar a senha.">
      <div className="stack">
        <label className="f">
          Nome
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="f">
          E-mail
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className="f" style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, fontSize: 12.5 }}>
          Papel
          <Choice<"editor" | "admin"> label="Papel" value={role} options={[["editor", "Editor"], ["admin", "Admin"]]} onChange={setRole} />
          <small className="hint">Editor edita conteúdo e mensagens; não altera configurações nem usuários.</small>
        </div>
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 20 }}>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!name.trim() || !email.trim() || m.isPending} onClick={() => m.mutate()}>
          Enviar convite
        </Button>
      </div>
    </Modal>
  );
}
