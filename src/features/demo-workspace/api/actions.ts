"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { ctx, run } from "@/server/admin/guard";
import { demoAllowed } from "@/server/admin/repo";
import { getDemoWorkspaceStatus, setDemoDataMode } from "@/server/demo-workspace";
import { TAGS } from "@/server/content";
import { CATALOG_TAG } from "@/server/catalog/public";
import { DEMO_DATA_MODES } from "@/shared/model/demo-workspace";

export async function getDemoWorkspace() {
  return run(async () => {
    const { repo, me } = await ctx();
    if (repo.mode !== "demo" || !demoAllowed()) throw new Error("Disponível apenas na demonstração.");
    return { ...getDemoWorkspaceStatus(), canSwitch: me.role === "admin" };
  });
}

export async function changeDemoWorkspace(input: unknown) {
  return run(async () => {
    const { repo } = await ctx({ admin: true });
    if (repo.mode !== "demo" || !demoAllowed()) throw new Error("Disponível apenas na demonstração.");
    const workspace = setDemoDataMode(z.enum(DEMO_DATA_MODES).parse(input));
    updateTag(TAGS.content);
    updateTag(TAGS.projects);
    updateTag(CATALOG_TAG);
    revalidatePath("/", "layout");
    return workspace;
  });
}
