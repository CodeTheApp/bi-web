"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { mediaCategoryKey } from "@/entities/media";
import { createMediaCategory } from "@/server/admin/actions";
import type { MediaItem } from "@/entities/admin";
import { Icon } from "@/shared/ui/admin/icons";
import { unwrap, useToast } from "@/shared/ui/admin/ui";
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/ui/popover";

export function MediaCategoryManager({ categories, media }: { categories: string[]; media: MediaItem[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: (value: string) => unwrap(createMediaCategory(value)),
    onSuccess: (category) => {
      qc.setQueryData<string[]>(["media-categories"], (current = []) => [...new Set([...current, category])].sort((a, b) => a.localeCompare(b, "pt-BR")));
      setName("");
      toast("Categoria criada");
    },
  });

  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline"><Icon name="folder" />Categorias<Icon name="back" style={{ transform: "rotate(-90deg)" }} /></Button></PopoverTrigger>
      <PopoverContent align="end" className="adm admin-popover media-category-popover" aria-label="Gerenciar categorias">
      <div><h2>Categorias da biblioteca</h2><p className="muted">Organize suas imagens por categoria.</p></div>
      <form className="media-category-create" onSubmit={(event) => { event.preventDefault(); create.mutate(name); }}>
        <label className="f">
          Nova categoria
          <Input autoFocus required maxLength={60} placeholder="Ex.: Fachadas, Paisagismo" value={name} onChange={(event) => { setName(event.target.value); create.reset(); }} disabled={create.isPending} aria-invalid={Boolean(create.error)} />
        </label>
        <Button type="submit" disabled={!name.trim() || create.isPending}><Icon name="plus" />{create.isPending ? "Criando…" : "Criar"}</Button>
        {create.error && <p className="media-category-error" role="alert">{create.error.message}</p>}
      </form>
      <ul className="media-category-list" aria-label="Categorias cadastradas">
        {categories.map((category) => {
          const count = media.filter((item) => mediaCategoryKey(item.category) === mediaCategoryKey(category)).length;
          return <li key={category}><span>{category}</span><small>{count === 1 ? "1 arquivo" : `${count} arquivos`}</small></li>;
        })}
      </ul>
    </PopoverContent>
    </Popover>
  );
}
