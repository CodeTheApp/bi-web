"use server";
import { revalidatePath } from "next/cache";
import {
  adminUserSchema,
  userProfileSchema,
  assertUserEditAllowed,
} from "@/features/manage-users";
import { ctx, run } from "./guard";
import type { AdminRepo } from "./repo";

async function validateAvatar(
  repo: AdminRepo,
  next: string,
  previous?: string,
) {
  if (!next || next === previous) return;
  const media = (await repo.media()).find((item) => item.url === next);
  if (!media || media.archived || media.kind === "video")
    throw new Error("Escolha uma foto disponível na biblioteca de mídia.");
}

export async function updateMyProfile(input: unknown) {
  return run(async () => {
    const { repo, me } = await ctx();
    const data = userProfileSchema.parse(input);
    await validateAvatar(repo, data.avatarUrl, me.avatarUrl);
    const profile = await repo.updateOwnProfile(me.id, data);
    await repo.log("Perfil pessoal atualizado");
    revalidatePath("/admin", "layout");
    return profile;
  });
}

export async function updateAdminUser(id: string, input: unknown) {
  return run(async () => {
    const { repo, me } = await ctx({ admin: true });
    const data = adminUserSchema.parse(input);
    const users = await repo.users();
    const target = users.find((user) => user.id === id);
    if (!target)
      throw new Error(
        "Usuário não encontrado. Atualize a lista e tente novamente.",
      );
    assertUserEditAllowed(me, target, data, users);
    await validateAvatar(repo, data.avatarUrl, target.avatarUrl);
    const saved = await repo.updateUser(id, data);
    await repo.log(`Usuário ${saved.name} atualizado`);
    revalidatePath("/admin", "layout");
    return saved;
  });
}
