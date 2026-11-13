"use server";
import { ctx, run } from "@/server/admin/guard";
import { readEvents } from "./repo";
export async function getSiteAnalytics() { return run(async () => { await ctx(); return readEvents(); }); }
