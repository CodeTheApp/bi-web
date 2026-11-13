import { describe, expect, it } from "vitest";
import { assertUserEditAllowed } from "@/features/manage-users/lib/user-policy";
import {
  adminUserSchema,
  userProfileSchema,
} from "@/features/manage-users/model/user-schema";
import type { AdminUser, AdminUserUpdate, Me } from "@/entities/admin";
const actor: Me = {
  id: "actor",
  name: "Admin",
  role: "admin",
  email: "a@example.com",
};
const target: AdminUser = {
  id: "target",
  name: "Admin 2",
  email: "b@example.com",
  role: "admin",
  status: "Ativo",
};
const draft: AdminUserUpdate = {
  name: target.name,
  email: target.email,
  role: "editor",
  avatarUrl: "",
};
describe("staff edit policy", () => {
  it("does not count pending invitations as an active replacement administrator", () => {
    expect(() =>
      assertUserEditAllowed(actor, target, draft, [
        target,
        { ...target, id: "pending", status: "Convite pendente" },
      ]),
    ).toThrow("administrador ativo");
  });
  it("can change another administrator when an active administrator remains", () => {
    expect(() =>
      assertUserEditAllowed(actor, target, draft, [
        target,
        { ...actor, status: "Ativo" },
      ]),
    ).not.toThrow();
  });
  it("trims names, normalizes email, and accepts only supported roles", () => {
    expect(
      adminUserSchema.parse({
        ...draft,
        name: "  Maria  ",
        email: " TEST@EXAMPLE.COM ",
      }),
    ).toMatchObject({ name: "Maria", email: "test@example.com" });
    expect(adminUserSchema.safeParse({ ...draft, role: "owner" }).success).toBe(
      false,
    );
  });
  it("rejects executable URLs and SVG payloads as profile images", () => {
    for (const avatarUrl of [
      "javascript:alert(1)",
      "data:image/svg+xml,<svg/>",
      "//unknown/image.jpg",
    ]) {
      expect(
        userProfileSchema.safeParse({ name: "Person", avatarUrl }).success,
      ).toBe(false);
    }
  });
});
