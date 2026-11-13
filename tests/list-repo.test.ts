import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListItem } from "@/entities/admin";

type Row = { id: string; position: number; [key: string]: unknown };
const dbState = vi.hoisted(() => ({
  tables: new Map<string, Map<string, Row>>(),
  writes: [] as string[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServer: async () => ({
    from(table: string) {
      const rows = dbState.tables.get(table) ?? new Map<string, Row>();
      dbState.tables.set(table, rows);
      return {
        select() {
          return {
            order: async () => ({
              data: [...rows.values()].sort((a, b) => a.position - b.position),
              error: null,
            }),
          };
        },
        upsert(input: Row[], options?: { ignoreDuplicates?: boolean }) {
          dbState.writes.push(
            options?.ignoreDuplicates ? "insert-ignore" : "upsert",
          );
          for (const row of input)
            if (!options?.ignoreDuplicates || !rows.has(row.id))
              rows.set(row.id, { ...row });
          return Promise.resolve({ data: null, error: null });
        },
        update(edit: Partial<Row>) {
          return {
            eq: async (_column: string, id: string) => {
              dbState.writes.push("update");
              const existing = rows.get(id);
              if (existing) rows.set(id, { ...existing, ...edit });
              return { data: null, error: null };
            },
          };
        },
        delete() {
          return {
            eq: async (_column: string, id: string) => {
              rows.delete(id);
              return { data: null, error: null };
            },
            not: () => {
              throw new Error("Snapshot deletion must never be used");
            },
          };
        },
      };
    },
  }),
  createSupabaseService: vi.fn(),
}));
import { demoRepo, type DemoStore } from "@/server/admin/repo-demo";
import { supabaseRepo } from "@/server/admin/repo-supabase";

const memory = globalThis as typeof globalThis & { __biDemo?: DemoStore };
const first: ListItem = {
  id: "89a0e285-7cf5-4c36-91c5-85f0b95a301a",
  a: "Primeiro",
  b: "Texto",
  visible: true,
};
const second: ListItem = {
  id: "ff6a7fe1-40de-4aee-9bfc-f6de715d28a8",
  a: "Segundo",
  b: "Texto",
  visible: true,
};
const recovered: ListItem = {
  id: "7a813504-40b5-458d-b3de-76b37dacd254",
  a: "Recuperado",
  b: "Outra aba",
  visible: true,
};

beforeEach(() => {
  delete memory.__biDemo;
  dbState.tables.clear();
  dbState.writes.length = 0;
});
afterEach(() => {
  delete memory.__biDemo;
});

for (const [name, createRepo] of [
  ["demo", async () => demoRepo()],
  ["Supabase", supabaseRepo],
] as const) {
  describe(`${name} non-destructive list writes`, () => {
    for (const kind of ["faqs", "testimonials"] as const) {
      it(`${kind}: a stale autosave keeps rows added by another client`, async () => {
        const repo = await createRepo();
        await repo.saveList(kind, [first, second], [first.id, second.id]);
        await repo.saveList(kind, [recovered], [recovered.id]);
        const saved = await repo.saveList(kind, [{ ...first, a: "Editado" }]);
        expect(saved).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: first.id, a: "Editado" }),
            expect.objectContaining({ id: second.id }),
            expect.objectContaining({ id: recovered.id }),
          ]),
        );
      });

      it(`${kind}: a stale autosave cannot resurrect a confirmed deletion`, async () => {
        const repo = await createRepo();
        await repo.saveList(kind, [first, second], [first.id, second.id]);
        const stale = [first, second];
        await repo.deleteListItem(kind, first.id);
        const saved = await repo.saveList(kind, stale);
        expect(saved.some((item) => item.id === first.id)).toBe(false);
        expect(saved.some((item) => item.id === second.id)).toBe(true);
      });

      it(`${kind}: only explicit creation may insert, and retrying it is idempotent`, async () => {
        const repo = await createRepo();
        expect(
          (await repo.saveList(kind, [recovered])).some(
            (item) => item.id === recovered.id,
          ),
        ).toBe(false);
        await repo.saveList(kind, [recovered], [recovered.id]);
        const saved = await repo.saveList(
          kind,
          [{ ...recovered, a: "Atualizado" }],
          [recovered.id],
        );
        expect(saved.filter((item) => item.id === recovered.id)).toEqual([
          expect.objectContaining({ a: "Atualizado" }),
        ]);
        if (name === "Supabase")
          expect(
            dbState.writes.every(
              (operation) =>
                operation === "update" || operation === "insert-ignore",
            ),
          ).toBe(true);
      });
    }
  });
}
