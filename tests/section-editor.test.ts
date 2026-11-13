import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionEditorStore } from "@/features/page-editor";
import { sectionSchema } from "@/entities/site-content";
import type { SectionRow } from "@/entities/admin";

const section = sectionSchema.parse({ title: "Título original" });
const rows: SectionRow[] = ["hero", "quem"].map((key) => ({ key: key as SectionRow["key"], draft: section, published: section, status: "publicado" }));
const edit = (store: SectionEditorStore, title: string, key: SectionRow["key"] = "hero") => store.edit(key, (draft) => ({ ...draft, title }));
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

describe("section editor saves", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("publishes immediately without a late autosave changing it back to draft", async () => {
    const save = vi.fn(async () => {});
    const store = new SectionEditorStore(rows, { save, setVisible: vi.fn(async () => {}) });
    edit(store, "Título publicado");
    store.save("hero", true);
    await vi.advanceTimersByTimeAsync(1800);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("hero", expect.objectContaining({ title: "Título publicado" }), true);
    expect(store.get("hero").status).toBe("publicado");
    expect(store.get("hero").dirty).toBe(false);
  });

  it("finishes an active autosave before publishing the latest draft", async () => {
    const pending = deferred();
    const save = vi.fn().mockImplementationOnce(() => pending.promise).mockResolvedValue(undefined);
    const store = new SectionEditorStore(rows, { save, setVisible: vi.fn(async () => {}) });
    edit(store, "Primeiro rascunho");
    await vi.advanceTimersByTimeAsync(900);
    edit(store, "Versão final");
    store.save("hero", true);
    expect(save).toHaveBeenCalledTimes(1);
    pending.resolve();
    await settle();
    await vi.advanceTimersByTimeAsync(1800);
    expect(save.mock.calls.map(([, draft, publish]) => [draft.title, publish])).toEqual([["Primeiro rascunho", false], ["Versão final", true]]);
    expect(store.get("hero").status).toBe("publicado");
  });

  it("keeps edits made during publication as a newer unpublished draft", async () => {
    const pending = deferred();
    const save = vi.fn().mockImplementationOnce(() => pending.promise).mockResolvedValue(undefined);
    const store = new SectionEditorStore(rows, { save, setVisible: vi.fn(async () => {}) });
    edit(store, "Versão publicada");
    store.save("hero", true);
    edit(store, "Alteração posterior");
    pending.resolve();
    await settle();
    expect(store.get("hero").dirty).toBe(true);
    expect(store.get("hero").draft.title).toBe("Alteração posterior");
    expect(store.get("hero").published.title).toBe("Versão publicada");
    expect(store.get("hero").status).toBe("rascunho");
    await vi.advanceTimersByTimeAsync(900);
    expect(save.mock.calls[1]).toEqual(["hero", expect.objectContaining({ title: "Alteração posterior" }), false]);
    expect(store.get("hero").dirty).toBe(false);
  });

  it("coalesces newer drafts while another section is saving", async () => {
    const pending = deferred();
    const save = vi.fn().mockImplementationOnce(() => pending.promise).mockResolvedValue(undefined);
    const store = new SectionEditorStore(rows, { save, setVisible: vi.fn(async () => {}) });
    store.save("quem", true);
    edit(store, "Rascunho intermediário");
    await vi.advanceTimersByTimeAsync(900);
    edit(store, "Último rascunho");
    await vi.advanceTimersByTimeAsync(900);
    pending.resolve();
    await settle();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][1].title).toBe("Último rascunho");
  });

  it("saves the latest draft with the new visibility and cancels its stale timer", async () => {
    const calls: string[] = [];
    const save = vi.fn(async (_key, draft) => { calls.push(`draft:${draft.visible}`); });
    const setVisible = vi.fn(async (_key, visible) => { calls.push(`visible:${visible}`); });
    const store = new SectionEditorStore(rows, { save, setVisible });
    edit(store, "Texto ainda não publicado");
    store.setVisible("hero", false);
    await vi.advanceTimersByTimeAsync(1800);
    expect(calls).toEqual(["draft:false", "visible:false"]);
    expect(store.get("hero").draft.visible).toBe(false);
    expect(store.get("hero").published.visible).toBe(false);
    expect(store.get("hero").status).toBe("rascunho");
  });

  it("retains each section draft before responses return and flushes on leaving", async () => {
    const save = vi.fn(async () => {});
    const store = new SectionEditorStore(rows, { save, setVisible: vi.fn(async () => {}) });
    edit(store, "Hero em edição");
    edit(store, "Outra seção", "quem");
    expect(store.get("hero").draft.title).toBe("Hero em edição");
    expect(store.get("quem").draft.title).toBe("Outra seção");
    store.flush();
    await settle();
    await vi.advanceTimersByTimeAsync(1800);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("does not claim an unsaved draft was saved when its visibility succeeds", async () => {
    const error = vi.fn();
    const store = new SectionEditorStore(rows, { save: vi.fn().mockRejectedValue(new Error("Falha de rede")), setVisible: vi.fn(async () => {}), error });
    edit(store, "Rascunho sem salvar");
    store.setVisible("hero", false);
    await vi.advanceTimersByTimeAsync(1800);
    expect(store.get("hero").dirty).toBe(true);
    expect(store.get("hero").message).toContain("Não foi possível salvar");
    expect(error).toHaveBeenCalledTimes(1);
    expect(store.get("hero").published.visible).toBe(false);
  });

  it("accepts a delayed refetch after reopening without replacing unsaved edits", () => {
    const store = new SectionEditorStore(rows, { save: vi.fn(async () => {}), setVisible: vi.fn(async () => {}) });
    const fresh = { ...rows[0], draft: { ...section, title: "Salvo pela tela anterior" } };
    store.reconcile([fresh]);
    expect(store.get("hero").draft.title).toBe("Salvo pela tela anterior");
    const snapshot = store.getSnapshot();
    store.reconcile([fresh]);
    expect(store.getSnapshot()).toBe(snapshot);
    edit(store, "Edição atual");
    store.reconcile(rows);
    expect(store.get("hero").draft.title).toBe("Edição atual");
  });

  it("cancels an unsent autosave and unmount flush after another tab changes workspace, retaining the draft", async () => {
    const save = vi.fn(async () => {});
    const store = new SectionEditorStore(rows, { save, setVisible: vi.fn(async () => {}) });
    edit(store, "Meu rascunho local");
    store.stopForWorkspaceChange();
    store.flush();
    store.save("hero", true);
    await vi.advanceTimersByTimeAsync(1800);
    expect(save).not.toHaveBeenCalled();
    expect(store.get("hero")).toMatchObject({ draft: { title: "Meu rascunho local" }, dirty: true, saving: false });
    store.reconcile([{ ...rows[0], draft: { ...section, title: "Outro ambiente" } }]);
    expect(store.get("hero").draft.title).toBe("Meu rascunho local");
  });

  it("lets an already-started write settle but drops queued saves and visibility for the changed workspace", async () => {
    const pending = deferred();
    const saved = vi.fn();
    const save = vi.fn(() => pending.promise);
    const setVisible = vi.fn(async () => {});
    const store = new SectionEditorStore(rows, { save, saved, setVisible });
    store.save("quem", true);
    edit(store, "Preservar rascunho");
    store.setVisible("hero", false);
    expect(save).toHaveBeenCalledOnce();
    store.stopForWorkspaceChange();
    pending.resolve();
    await settle();
    await vi.advanceTimersByTimeAsync(1800);
    expect(save).toHaveBeenCalledOnce();
    expect(setVisible).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
    expect(store.get("hero").draft.title).toBe("Preservar rascunho");
    expect(store.get("hero").dirty).toBe(true);
    expect(store.get("quem").saving).toBe(false);
  });
});
