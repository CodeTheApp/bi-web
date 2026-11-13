import { Suspense } from "react";
import { Inbox } from "@/_pages/admin-inbox/ui/Inbox";

export const metadata = { title: "Mensagens" };

export default function Page() {
  return (
    <Suspense>
      <Inbox />
    </Suspense>
  );
}
