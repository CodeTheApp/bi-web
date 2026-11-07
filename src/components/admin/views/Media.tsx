"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteMedia, getMedia, setMediaAlt } from "@/server/admin/actions";
import type { MediaItem } from "@/server/admin/types";
import { Icon } from "../icons";
import { UploadButton } from "../media";
import { ErrorBox, PageHead, Skeleton, unwrap, useToast } from "../ui";

export function Media() {
  const q = useQuery({ queryKey: ["media"], queryFn: () => unwrap(getMedia()) });
  const missing = q.data?.filter((m) => !m.alt).length ?? 0;
  return (
    <>
      <PageHead
        title="Mídia"
        sub={q.data ? `${q.data.length} fotos · ${missing ? `${missing} sem texto alternativo (importante para acessibilidade e Google)` : "todas com texto alternativo"}` : "Carregando…"}
      >
        <UploadButton />
      </PageHead>
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      <div className="mg">
        {!q.data && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} h={260} />)}
        {q.data?.map((m) => <Card key={m.id} m={m} />)}
      </div>
    </>
  );
}

function Card({ m }: { m: MediaItem }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [alt, setAlt] = useState(m.alt);
  const save = useMutation({
    mutationFn: (v: string) => unwrap(setMediaAlt(m.id, v)),
    onSuccess: () => {
      toast("Texto alternativo salvo");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.setQueryData<MediaItem[]>(["media"], (old) => old?.map((x) => (x.id === m.id ? { ...x, alt } : x)));
    },
    onError: (e) => toast(e.message),
  });
  const del = useMutation({
    mutationFn: () => unwrap(deleteMedia(m.id)),
    onSuccess: () => {
      toast("Foto excluída");
      qc.invalidateQueries({ queryKey: ["media"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast(e.message),
  });
  const used = m.uses.length > 0;
  return (
    <div className={`card mi${!alt ? " warn" : ""}`}>
      <div className="im" style={{ backgroundImage: `url("${m.url}")` }}>
        <div className="u">
          {m.uses.slice(0, 2).map((u) => (
            <span key={u}>{u}</span>
          ))}
          {m.uses.length > 2 && <span>+{m.uses.length - 2}</span>}
        </div>
      </div>
      <div className="bd">
        <Input
          className="in"
          placeholder="Descreva a foto…"
          aria-label="Texto alternativo"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() => alt !== m.alt && save.mutate(alt)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <div className="row">
          <small>{used ? "Em uso" : "Sem uso"}</small>
          <span className="sp" />
          <Button
            variant="ghost"
            size="sm"
            title={used ? "Em uso: troque nos projetos/seções antes de excluir" : "Excluir"}
            aria-label="Excluir foto"
            disabled={used || del.isPending}
            onClick={() => del.mutate()}
          >
            <Icon name="trash" />
          </Button>
        </div>
      </div>
    </div>
  );
}
