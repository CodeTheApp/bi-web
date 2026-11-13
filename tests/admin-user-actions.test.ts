import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminUser, Me } from "@/entities/admin";
const state = vi.hoisted(() => ({
  ctx: vi.fn(),
  users: vi.fn(),
  media: vi.fn(),
  updateUser: vi.fn(),
  updateOwnProfile: vi.fn(),
  log: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/admin/guard", () => ({
  ctx: state.ctx,
  run: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
}));
import { updateAdminUser, updateMyProfile } from "@/server/admin/user-actions";
const actor: Me = {
  id: "a",
  name: "Admin",
  email: "admin@example.com",
  role: "admin",
};
const target: AdminUser = {
  id: "b",
  name: "Editor",
  email: "editor@example.com",
  role: "editor",
  status: "Ativo",
};
const input = {
  name: "Novo nome",
  email: "editor@example.com",
  role: "editor" as const,
  avatarUrl: "/img/avatar.webp",
};
let current: Me;

describe("admin user actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current = actor;
    state.ctx.mockImplementation(async (options?: { admin?: boolean }) => {
      if (options?.admin && current.role !== "admin")
        throw new Error("Só administradores podem fazer isso.");
      return {
        me: current,
        repo: {
          users: state.users,
          media: state.media,
          updateUser: state.updateUser,
          updateOwnProfile: state.updateOwnProfile,
          log: state.log,
        },
      };
    });
    state.users.mockResolvedValue([{ ...actor, status: "Ativo" }, target]);
    state.media.mockResolvedValue([
      { url: input.avatarUrl, kind: "image", archived: false },
    ]);
    state.updateUser.mockResolvedValue({ ...target, ...input });
    state.updateOwnProfile.mockResolvedValue({
      ...actor,
      name: input.name,
      avatarUrl: input.avatarUrl,
    });
    state.log.mockResolvedValue(undefined);
  });

  it("an editor can update only their own name/avatar through the profile endpoint", async () => {
    current = { ...target };
    expect(
      (await updateMyProfile({ name: input.name, avatarUrl: input.avatarUrl }))
        .ok,
    ).toBe(true);
    expect(state.ctx).toHaveBeenCalledWith();
    expect(state.updateOwnProfile).toHaveBeenCalledExactlyOnceWith(target.id, {
      name: input.name,
      avatarUrl: input.avatarUrl,
    });
    expect(state.updateUser).not.toHaveBeenCalled();
  });
  it("rejects role/id/email injection in the self-profile endpoint", async () => {
    expect(
      (
        await updateMyProfile({
          name: input.name,
          avatarUrl: "",
          role: "admin",
          id: "other",
        })
      ).ok,
    ).toBe(false);
    expect(state.updateOwnProfile).not.toHaveBeenCalled();
  });
  it("rejects another-user editing without administrator permission", async () => {
    current = { ...target };
    expect((await updateAdminUser(actor.id, input)).ok).toBe(false);
    expect(state.updateUser).not.toHaveBeenCalled();
    expect(state.users).not.toHaveBeenCalled();
  });
  it("saves the selected target, preserving unrelated users", async () => {
    expect((await updateAdminUser(target.id, input)).ok).toBe(true);
    expect(state.ctx).toHaveBeenCalledWith({ admin: true });
    expect(state.updateUser).toHaveBeenCalledExactlyOnceWith(target.id, input);
  });
  it("blocks changing the current administrator's role or sign-in email", async () => {
    const self = {
      name: actor.name,
      email: actor.email,
      role: "editor",
      avatarUrl: "",
    };
    expect((await updateAdminUser(actor.id, self)).ok).toBe(false);
    expect(
      (
        await updateAdminUser(actor.id, {
          ...self,
          role: "admin",
          email: "typo@example.com",
        })
      ).ok,
    ).toBe(false);
    expect(state.updateUser).not.toHaveBeenCalled();
  });
  it("blocks a duplicate sign-in email even with different case", async () => {
    expect(
      (
        await updateAdminUser(target.id, {
          ...input,
          email: "ADMIN@EXAMPLE.COM",
        })
      ).ok,
    ).toBe(false);
    expect(state.updateUser).not.toHaveBeenCalled();
  });
  it.each([
    ["video", false],
    ["image", true],
  ])(
    "rejects an unavailable avatar (%s archived=%s)",
    async (kind, archived) => {
      state.media.mockResolvedValue([{ url: input.avatarUrl, kind, archived }]);
      expect((await updateAdminUser(target.id, input)).ok).toBe(false);
      expect(state.updateUser).not.toHaveBeenCalled();
    },
  );
  it("rejects images that were not registered in the media library", async () => {
    state.media.mockResolvedValue([]);
    expect(
      (
        await updateMyProfile({
          name: input.name,
          avatarUrl: "https://other.example/image.webp",
        })
      ).ok,
    ).toBe(false);
    expect(state.updateOwnProfile).not.toHaveBeenCalled();
  });
  it("allows keeping the existing avatar or removing it without requiring a new upload", async () => {
    current = { ...actor, avatarUrl: input.avatarUrl };
    expect(
      (await updateMyProfile({ name: "Updated", avatarUrl: input.avatarUrl }))
        .ok,
    ).toBe(true);
    expect((await updateMyProfile({ name: "Updated", avatarUrl: "" })).ok).toBe(
      true,
    );
    expect(state.media).not.toHaveBeenCalled();
  });
  it("rejects stale targets instead of creating a user from an edit", async () => {
    expect((await updateAdminUser("missing", input)).ok).toBe(false);
    expect(state.updateUser).not.toHaveBeenCalled();
  });
});
