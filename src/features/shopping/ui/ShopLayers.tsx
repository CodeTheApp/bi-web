"use client";
import { CartDrawer } from "@/features/shopping/ui/CartDrawer";
import { Layer } from "@/features/shopping/ui/Layer";
import { LoginForm } from "@/features/shopping/ui/LoginForm";
import { useShop } from "@/features/shopping/model/ShopProvider";

/** Camadas da loja presentes em todas as páginas do site: sacola e entrar. */
export function ShopLayers() {
  const shop = useShop();
  const req = shop.login;
  return (
    <>
      <CartDrawer />
      <Layer
        open={!!req?.open}
        onClose={shop.closeLogin}
        label="Entrar"
        kind="center"
        className="login"
      >
        {req && (
          <LoginForm
            key={req.id}
            title={req.title}
            reason={req.reason}
            onDone={(c) => {
              shop.closeLogin();
              req.then?.(c);
            }}
          />
        )}
      </Layer>
    </>
  );
}
