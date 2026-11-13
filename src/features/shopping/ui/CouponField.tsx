"use client";
import { useRef, useState } from "react";
import { TicketPercent } from "@/shared/ui/icons/lucide";
import TearButton from "@/shared/ui/kokonutui/tear-button";
import ParticleButton from "@/shared/ui/kokonutui/particle-button";
import { quoteCart } from "@/server/shop/actions";
import { brl } from "@/entities/product";
import { useShop } from "../model/ShopProvider";
import "./shopping-interactions.css";

export function CouponField({
  discount = 0,
  error,
}: {
  discount?: number;
  error?: string | null;
}) {
  const shop = useShop();
  const [opened, setOpened] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const checking = useRef(false);
  const apply = async () => {
    if (checking.current) throw new Error("Aguarde a validação do cupom.");
    checking.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await quoteCart(shop.items.map((item) => ({ variantId: item.variantId, qty: item.qty })), code);
      const failure = !result.ok ? result.error : result.data.couponError || (!result.data.coupon ? "Digite o código do cupom." : "");
      if (failure) { setMessage(failure); throw new Error(failure); }
      if (result.ok && result.data.coupon) { shop.setCouponCode(result.data.coupon.code); shop.say("Cupom aplicado"); }
    } finally { checking.current = false; setBusy(false); }
  };

  return (
    <div className="shop-coupon">
      {shop.couponCode ? (
        <div className="coupon-applied">
          <TicketPercent size={17} />
          <span>
            <b>{shop.couponCode}</b>
            <small>
              {error ||
                (discount
                  ? `${brl(discount)} de desconto`
                  : "Conferindo cupom…")}
            </small>
          </span>
          <button
            type="button"
            className="tlink"
            onClick={() => {
              shop.setCouponCode("");
              setMessage("");
            }}
            aria-label={`Remover cupom ${shop.couponCode}`}
          >
            Remover
          </button>
        </div>
      ) : opened ? (
        <div className="coupon-entry">
          <label>
            <span>Código do cupom</span>
            <input
              autoFocus
              disabled={busy}
              value={code}
              maxLength={40}
              placeholder="Digite seu código"
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setMessage("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void apply().catch(() => {});
                }
              }}
            />
          </label>
          <ParticleButton
            type="button"
            onClick={apply}
            disabled={!code.trim()}
            pendingLabel="Validando…"
            successLabel="Aplicado"
            errorLabel="Conferir"
          >
            Aplicar
          </ParticleButton>
        </div>
      ) : (
        <TearButton
          compact
          className="coupon-tear"
          tone="muted"
          icon={<TicketPercent size={18} />}
          label="Tenho um cupom"
          description="Destaque para inserir o código"
          stubLabel="Abrir"
          confirmedLabel="Código do cupom"
          confirmedDescription="Informe seu código abaixo"
          onConfirm={() => setOpened(true)}
          resetAfter={0}
        />
      )}
      {(message || error) && (
        <p className="ferr" role="alert">
          {message || error}
        </p>
      )}
    </div>
  );
}
