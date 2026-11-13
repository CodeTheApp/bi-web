"use server";
import { z } from "zod";
import { ctx, run } from "@/server/admin/guard";
import {
  notificationScope,
  readNotificationFeed,
  readNotifications,
} from "./repo";

export async function getAdminNotificationContext() {
  return run(async () => {
    const { repo, me } = await ctx();
    return { scope: notificationScope(repo.mode === "demo"), userId: me.id };
  });
}
export async function getAdminNotifications(scope: string) {
  return run(async () => {
    const { repo, me } = await ctx();
    return readNotificationFeed(repo, me.id, z.string().max(60).parse(scope));
  });
}
export async function markAdminNotificationsRead(
  scope: string,
  keys: string[],
) {
  return run(async () => {
    const { repo, me } = await ctx();
    const ids = z
      .array(
        z
          .string()
          .regex(/^(?:customer|order|message):[A-Za-z0-9_-]+$/)
          .max(120),
      )
      .max(200)
      .parse(keys);
    await readNotifications(repo, me.id, z.string().max(60).parse(scope), ids);
  });
}
