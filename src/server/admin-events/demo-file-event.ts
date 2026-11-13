import type {
  AdminLiveTopic,
  AdminLiveWorkspace,
} from "@/shared/model/admin-live";

/** Filenames carry the workspace captured by the writer, even if another tab switches meanwhile. */
export function demoFileEvent(
  name: string,
): { topics: AdminLiveTopic[]; workspace: AdminLiveWorkspace } | null {
  const commerce =
    /^demo-workspace-(catalog|shop)-(examples|empty)\.json$/.exec(name);
  if (commerce)
    return {
      topics:
        commerce[1] === "catalog"
          ? ["products", "stock"]
          : ["orders", "customers", "coupons"],
      workspace: commerce[2] as AdminLiveWorkspace,
    };
  const reads =
    /^demo-workspace-notifications-(examples|empty)-reads\.json$/.exec(name);
  return reads
    ? { topics: ["notifications"], workspace: reads[1] as AdminLiveWorkspace }
    : null;
}
