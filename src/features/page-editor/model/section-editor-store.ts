import type { Section, SectionKey } from "@/entities/site-content";
import type { SectionRow } from "@/entities/admin";

export type SectionEditorState = SectionRow & {
  revision: number;
  dirty: boolean;
  saving: boolean;
  message: string;
};

type Save = { kind: "save"; key: SectionKey; section: Section; revision: number; publish: boolean };
type Visibility = { kind: "visibility"; key: SectionKey; visible: boolean; previous: boolean; revision: number };
type Operation = Save | Visibility;
type Options = {
  save: (key: SectionKey, section: Section, publish: boolean) => Promise<unknown>;
  setVisible: (key: SectionKey, visible: boolean) => Promise<unknown>;
  saved?: (key: SectionKey, section: Section, publish: boolean) => void;
  visibilitySaved?: (key: SectionKey, visible: boolean) => void;
  error?: (error: unknown) => void;
  delay?: number;
};

/** One workspace owns every section draft and sends writes in order. */
export class SectionEditorStore {
  private state: Partial<Record<SectionKey, SectionEditorState>>;
  private listeners = new Set<() => void>();
  private timers = new Map<SectionKey, ReturnType<typeof setTimeout>>();
  private queue: Operation[] = [];
  private active?: Operation;
  private workspaceChanged = false;

  constructor(rows: SectionRow[], private options: Options) {
    this.state = Object.fromEntries(rows.map((row) => [row.key, {
      ...structuredClone(row), revision: 0, dirty: false, saving: false,
      message: row.status === "rascunho" ? "Rascunho com alterações não publicadas" : "Igual ao site",
    }]));
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  getSnapshot = () => this.state;
  get = (key: SectionKey) => this.state[key]!;

  /** Refetches may arrive after another workspace flushed its pending save. */
  reconcile(rows: SectionRow[]) {
    if (this.workspaceChanged) return;
    for (const row of rows) {
      const current = this.get(row.key);
      if (current && (current.dirty || current.saving || this.timers.has(row.key) || this.active?.key === row.key || this.queue.some((op) => op.key === row.key))) continue;
      if (current && JSON.stringify([current.draft, current.published, current.status]) === JSON.stringify([row.draft, row.published, row.status])) continue;
      this.patch(row.key, {
        ...structuredClone(row), revision: current?.revision ?? 0, dirty: false, saving: false,
        message: row.status === "rascunho" ? "Rascunho com alterações não publicadas" : "Igual ao site",
      });
    }
  }

  private patch(key: SectionKey, patch: Partial<SectionEditorState>) {
    this.state = { ...this.state, [key]: { ...this.get(key), ...patch } };
    this.listeners.forEach((listener) => listener());
  }

  edit(key: SectionKey, update: (section: Section) => Section) {
    if (this.workspaceChanged) return;
    const state = this.get(key);
    this.patch(key, { draft: update(state.draft), revision: state.revision + 1, dirty: true, status: "rascunho", message: "Salvando rascunho…" });
    this.cancelTimer(key);
    // A queued autosave is superseded by this new draft, not sent with old text.
    this.queue = this.queue.filter((op) => !(op.key === key && op.kind === "save" && !op.publish));
    this.timers.set(key, setTimeout(() => {
      this.timers.delete(key);
      this.save(key, false);
    }, this.options.delay ?? 900));
  }

  private cancelTimer(key: SectionKey) {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
  }

  save(key: SectionKey, publish: boolean) {
    if (this.workspaceChanged) return;
    this.cancelTimer(key);
    this.queue = this.queue.filter((op) => !(op.key === key && op.kind === "save" && !op.publish));
    const state = this.get(key);
    this.queue.push({ kind: "save", key, section: structuredClone(state.draft), revision: state.revision, publish });
    this.patch(key, { saving: true, message: publish ? "Publicando…" : "Salvando rascunho…" });
    void this.run();
  }

  setVisible(key: SectionKey, visible: boolean) {
    if (this.workspaceChanged) return;
    this.cancelTimer(key);
    const previous = this.get(key);
    this.patch(key, { draft: { ...previous.draft, visible }, revision: previous.revision + 1, message: "Atualizando visibilidade…" });
    // Save current edits before changing the public visibility. No old debounce can undo it.
    if (previous.dirty) this.save(key, false);
    const state = this.get(key);
    this.queue.push({ kind: "visibility", key, visible, previous: previous.draft.visible, revision: state.revision });
    this.patch(key, { saving: true });
    void this.run();
  }

  /** Flush on leaving the workspace; switching sections keeps the same store. */
  flush = () => {
    if (this.workspaceChanged) return;
    for (const key of [...this.timers.keys()]) this.save(key, false);
  };

  /** Cancel work not yet sent, keep drafts for the explicit workspace-change dialog. */
  stopForWorkspaceChange = () => {
    this.workspaceChanged = true;
    for (const key of [...this.timers.keys()]) this.cancelTimer(key);
    this.queue = [];
    for (const key of Object.keys(this.state) as SectionKey[]) {
      this.patch(key, {
        saving: this.active?.key === key,
        message: "O ambiente mudou. Atualize antes de continuar.",
      });
    }
  };

  private async run() {
    if (this.active || this.workspaceChanged) return;
    const operation = this.queue.shift();
    if (!operation) return;
    this.active = operation;
    const { key, revision } = operation;
    try {
      if (operation.kind === "save") {
        await this.options.save(key, operation.section, operation.publish);
        if (this.workspaceChanged) return;
        if (operation.publish) this.patch(key, { published: operation.section });
        if (this.get(key).revision === revision) {
          this.patch(key, {
            dirty: false,
            status: operation.publish ? "publicado" : "rascunho",
            message: operation.publish ? "Publicado. O site atualiza em segundos." : "Rascunho salvo automaticamente",
          });
        }
        this.options.saved?.(key, operation.section, operation.publish);
      } else {
        await this.options.setVisible(key, operation.visible);
        if (this.workspaceChanged) return;
        this.patch(key, { published: { ...this.get(key).published, visible: operation.visible } });
        if (this.get(key).revision === revision && !this.get(key).dirty) this.patch(key, { message: operation.visible ? "Seção exibida no site" : "Seção ocultada do site" });
        this.options.visibilitySaved?.(key, operation.visible);
      }
    } catch (error) {
      if (this.workspaceChanged) return;
      if (this.get(key).revision === revision) {
        this.patch(key, {
          message: "Não foi possível salvar. Tente novamente.",
          ...(operation.kind === "visibility" ? { draft: { ...this.get(key).draft, visible: operation.previous } } : {}),
        });
      }
      this.options.error?.(error);
    } finally {
      this.active = undefined;
      this.patch(key, { saving: this.queue.some((op) => op.key === key) });
      void this.run();
    }
  }
}
