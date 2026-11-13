"use client";
import { useState } from "react";
import { initials } from "@/shared/ui/admin/ui";

export function StaffAvatar({
  name,
  url,
  className = "",
}: {
  name: string;
  url?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className={`staff-avatar ${className}`} aria-hidden="true">
      {initials(name) || "?"}
      {url && failed !== url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={url} alt="" onError={() => setFailed(url)} />
      )}
    </span>
  );
}
