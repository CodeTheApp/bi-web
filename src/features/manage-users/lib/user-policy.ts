import type { AdminUser, AdminUserUpdate, Me } from "@/entities/admin";

/** Shared with demo persistence; the server rechecks authoritative values before writing. */
export function assertUserEditAllowed(
  actor: Me,
  target: AdminUser,
  input: AdminUserUpdate,
  users: AdminUser[],
) {
  if (actor.role !== "admin")
    throw new Error("Só administradores podem editar usuários.");
  if (
    target.id === actor.id &&
    (input.role !== target.role ||
      input.email.toLowerCase() !== target.email.toLowerCase())
  ) {
    throw new Error(
      "Seu próprio e-mail e papel não podem ser alterados nesta tela.",
    );
  }
  if (
    target.role === "admin" &&
    input.role !== "admin" &&
    users.filter((user) => user.role === "admin" && user.status === "Ativo")
      .length <= 1 &&
    target.status === "Ativo"
  ) {
    throw new Error("Mantenha pelo menos um administrador ativo no painel.");
  }
  if (
    users.some(
      (user) =>
        user.id !== target.id &&
        user.email.toLowerCase() === input.email.toLowerCase(),
    )
  ) {
    throw new Error("Este e-mail já está associado a outro usuário.");
  }
}
