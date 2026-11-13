"use client";
import { getDemoWorkspace } from "@/shared/api/admin-reads";

import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Boxes as Database,
  CircleAlert as Info,
  LoaderCircle,
} from "@/shared/ui/icons/lucide";
import { Choice, ControlTooltip, unwrap } from "@/shared/ui/admin/ui";
import { notify } from "@/shared/lib/notify";
import type { DemoDataMode } from "@/shared/model/demo-workspace";
import { changeDemoWorkspace } from "../api/actions";
import "./demo-workspace.css";

/** Render only inside the demo banner. Reload remounts providers, drafts and pending query observers. */
export function DemoWorkspaceControl() {
  const client = useQueryClient();
  const pendingWrites = useIsMutating({
    predicate: (write) =>
      write.options.mutationKey?.[0] !== "demo-workspace-switch",
  });
  const query = useQuery({
    queryKey: ["demo-workspace"],
    queryFn: ({ signal }) => unwrap(getDemoWorkspace({ signal })),
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationKey: ["demo-workspace-switch"],
    mutationFn: (mode: DemoDataMode) => unwrap(changeDemoWorkspace(mode)),
    onMutate: () => client.cancelQueries(),
    onSuccess: () => {
      client.clear();
      // A full document navigation also discards local editor state and in-flight results.
      const path = window.location.pathname;
      const collection = /^\/admin\/loja\/pedidos\/[^/]+$/.test(path)
        ? "/admin/loja/pedidos"
        : /^\/admin\/projetos\/[^/]+$/.test(path)
          ? "/admin/projetos"
          : /^\/admin\/loja\/[^/]+$/.test(path) &&
              ![
                "estoque",
                "pedidos",
                "clientes",
                "financeiro",
                "relatorios",
                "cupons",
              ].includes(path.split("/").at(-1)!)
            ? "/admin/loja"
            : null;
      if (collection) window.location.assign(collection);
      else window.location.reload();
    },
    onError: (error) => {
      notify.error(
        error instanceof Error
          ? error.message
          : "Não foi possível trocar o ambiente.",
      );
    },
  });
  return (
    <div className="demo-workspace-control" aria-busy={mutation.isPending}>
      <div className="demo-workspace-copy">
        <Database size={15} />
        <div>
          <strong>Modo demonstração</strong>
          <span>
            {query.data?.mode === "empty"
              ? "Ambiente sem exemplos. Os registros do outro ambiente estão preservados."
              : "Dados de exemplo para explorar o painel. E-mails não são enviados."}
          </span>
        </div>
      </div>
      <div className="demo-workspace-actions">
        {mutation.isPending && (
          <LoaderCircle
            size={14}
            className="demo-workspace-spinner"
            aria-label="Trocando ambiente"
          />
        )}
        <span className="demo-workspace-label" id="demo-workspace-label">
          Visualizar
        </span>
        <fieldset
          disabled={
            !query.data?.canSwitch ||
            mutation.isPending ||
            query.isLoading ||
            pendingWrites > 0
          }
          aria-labelledby="demo-workspace-label"
        >
          <Choice
            label="Alternar entre dados de exemplo e telas vazias"
            value={query.data?.mode ?? "examples"}
            options={[
              ["examples", "Com exemplos"],
              ["empty", "Sem exemplos"],
            ]}
            onChange={(mode) => {
              if (mode !== query.data?.mode) mutation.mutate(mode);
            }}
          />
        </fieldset>
        <ControlTooltip label="Os ambientes são separados. Ao voltar, seus registros e alterações continuam aqui. A seleção vale para esta demonstração e é compartilhada neste servidor.">
          <span
            tabIndex={0}
            className="demo-workspace-info"
            aria-label="Sobre os ambientes de demonstração"
          >
            <Info size={14} />
          </span>
        </ControlTooltip>
        {query.error && (
          <span className="demo-workspace-error" role="alert">
            Não foi possível ler o ambiente.
          </span>
        )}
        {pendingWrites > 0 && (
          <span className="muted" role="status">
            Conclua o salvamento para trocar de ambiente.
          </span>
        )}
      </div>
    </div>
  );
}
