"use client";
import { CartDrawer } from "./CartDrawer";
import { Layer } from "./Layer";
import { LoginForm } from "./LoginForm";
import { useShop } from "./ShopProvider";

/** Camadas da loja presentes em todas as páginas do site: sacola, entrar e o aviso rápido. */
export function ShopLayers() {
  const shop = useShop();
  const req = shop.login;
  return (
    <>
      <CartDrawer />
      <Layer open={!!req?.open} onClose={shop.closeLogin} label="Entrar" kind="center" className="login">
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
      <div className={`stoast${shop.toast ? " on" : ""}`} role="status" aria-live="polite">
        {shop.toast}
      </div>
    </>
  );
}
