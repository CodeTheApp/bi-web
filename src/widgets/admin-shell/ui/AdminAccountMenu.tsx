"use client";
import { memo, useState } from "react";
import { UserEditor } from "@/features/manage-users/client";
import { User, Settings, ExternalLink } from "@/shared/ui/icons/lucide";
import type { Me } from "@/entities/admin";
import { setAdminTheme, useAdminAppearance } from "@/features/admin-appearance";
import { signOut } from "@/server/admin/actions";
import ProfileDropdown from "@/shared/ui/kokonutui/account-menu";

// Route changes update the shell breadcrumb, not the account identity or its shared layout.
export const AdminAccountMenu = memo(function AdminAccountMenu({
  me,
}: {
  me: Me;
}) {
  const appearance = useAdminAppearance();
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <>
      <ProfileDropdown
        className="admin-account-menu"
        accounts={[
          { ...me, plan: me.role === "admin" ? "Administrador" : "Editor" },
        ]}
        defaultAccountId={me.id}
        showStatus={false}
        theme={appearance.theme}
        onThemeChange={setAdminTheme}
        items={[
          {
            label: "Meu perfil",
            icon: <User size={15} />,
            onSelect: () => setProfileOpen(true),
          },
          {
            label: "Configurações",
            icon: <Settings size={15} />,
            href: "/admin/config",
          },
          {
            label: "Ver site",
            icon: <ExternalLink size={15} />,
            href: "/",
            external: true,
          },
        ]}
        onSignOut={() => {
          void signOut();
        }}
      />
      <UserEditor
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={me}
        mode="self"
      />
    </>
  );
});
