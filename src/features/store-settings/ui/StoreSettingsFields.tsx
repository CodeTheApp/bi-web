"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  DEFAULT_STORE_PREFERENCES,
  type StorePreferences,
} from "@/entities/store-settings";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Switch } from "@/shared/ui/switch";
import { Truck, MapPin, CreditCard } from "@/shared/ui/icons/lucide";
import {
  daysDraftValue,
  validDaysDraft,
  moneyDraftCents,
  validMoneyDraft,
  MAX_STORE_MONEY_CENTS,
  storeDraftsValid,
  type StoreDraftValidity,
  type StoreNumericField,
} from "../model/numeric-draft";
import "./store-settings.css";

function DaysField({
  label,
  value,
  min,
  onChange,
  disabled,
  onValidityChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  onValidityChange: (valid: boolean) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    if (draft !== null && daysDraftValue(draft) !== value) setDraft(null);
  }
  const hintId = useId();
  const shown = disabled ? String(value) : (draft ?? String(value));
  const valid = Boolean(disabled) || validDaysDraft(shown, min);
  useEffect(() => {
    onValidityChange(valid);
  }, [valid, onValidityChange]);
  return (
    <label className="f">
      <span>{label}</span>
      <Input
        inputMode="numeric"
        value={shown}
        disabled={disabled}
        aria-invalid={!valid}
        aria-describedby={hintId}
        onFocus={() => setDraft(String(value))}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "");
          setDraft(next);
          const valid = validDaysDraft(next, min);
          onValidityChange(valid);
          if (valid) onChange(daysDraftValue(next)!);
        }}
        onBlur={() => {
          const parsed = draft === null ? value : daysDraftValue(draft);
          if (parsed === null) {
            onValidityChange(false);
            return;
          }
          onChange(Math.min(60, Math.max(min, parsed)));
          setDraft(null);
          onValidityChange(true);
        }}
      />
      <small
        id={hintId}
        className={valid ? "hint" : "ferr"}
        role={valid ? undefined : "alert"}
      >
        {!valid
          ? `Informe um número inteiro entre ${min} e 60.`
          : min === 0
            ? "0 mantém os prazos atuais de transporte."
            : "Dias úteis até o pedido estar pronto para retirar."}
      </small>
    </label>
  );
}

function FreeShippingAmount({
  value,
  onChange,
  disabled,
  onValidityChange,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  onValidityChange: (valid: boolean) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    if (draft !== null && moneyDraftCents(draft) !== value) setDraft(null);
  }
  const hintId = useId();
  const formatted = (value / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const shown = disabled ? formatted : (draft ?? formatted);
  const valid = Boolean(disabled) || validMoneyDraft(shown);
  useEffect(() => {
    onValidityChange(valid);
  }, [valid, onValidityChange]);
  return (
    <label className="f">
      <span>Compra mínima para frete grátis · R$</span>
      <Input
        inputMode="decimal"
        value={shown}
        disabled={disabled}
        aria-invalid={!valid}
        aria-describedby={hintId}
        onFocus={() => setDraft(formatted)}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d,.]/g, "");
          setDraft(next);
          const valid = validMoneyDraft(next);
          onValidityChange(valid);
          if (valid) onChange(moneyDraftCents(next)!);
        }}
        onBlur={() => {
          const parsed = draft === null ? value : moneyDraftCents(draft);
          if (parsed === null) {
            onValidityChange(false);
            return;
          }
          onChange(Math.min(MAX_STORE_MONEY_CENTS, Math.max(0, parsed)));
          setDraft(null);
          onValidityChange(true);
        }}
      />
      <small
        id={hintId}
        className={valid ? "hint" : "ferr"}
        role={valid ? undefined : "alert"}
      >
        {valid
          ? "Sobre o valor dos produtos após cupons. Não inclui entrega expressa; a padrão no DF continua gratuita."
          : "Informe um valor entre R$ 0 e R$ 10.000.000,00, com até duas casas decimais."}
      </small>
    </label>
  );
}

export function StoreSettingsFields({
  value,
  onChange,
  disabled = false,
  onValidityChange,
}: {
  value?: StorePreferences;
  onChange: (value: StorePreferences) => void;
  disabled?: boolean;
  onValidityChange?: (valid: boolean) => void;
}) {
  const draftValidity = useRef<StoreDraftValidity>({});
  const reportValidity = useCallback(
    (field: StoreNumericField, valid: boolean) => {
      draftValidity.current = { ...draftValidity.current, [field]: valid };
      onValidityChange?.(storeDraftsValid(draftValidity.current));
    },
    [onValidityChange],
  );
  const preparationValidity = useCallback(
    (valid: boolean) => reportValidity("preparationDays", valid),
    [reportValidity],
  );
  const pickupValidity = useCallback(
    (valid: boolean) => reportValidity("pickupReadyDays", valid),
    [reportValidity],
  );
  const moneyValidity = useCallback(
    (valid: boolean) => reportValidity("freeShippingFromCents", valid),
    [reportValidity],
  );
  // Keep draft whitespace while typing; the persisted schema trims only on save.
  const preferences = { ...DEFAULT_STORE_PREFERENCES, ...value };
  const change = <K extends keyof StorePreferences>(
    key: K,
    next: StorePreferences[K],
  ) => onChange({ ...preferences, [key]: next });
  return (
    <div className="store-settings-fields">
      <section className="store-settings-section">
        <div className="store-settings-heading">
          <Truck size={17} />
          <div>
            <h3>Entrega e preparação</h3>
            <p>
              As opções e os valores são conferidos novamente no servidor ao
              finalizar.
            </p>
          </div>
        </div>
        <div className="store-settings-switch">
          <div>
            <b id="store-delivery-label">Receber no endereço</b>
            <small>Mantenha ao menos uma opção entre entrega e retirada.</small>
          </div>
          <Switch
            aria-labelledby="store-delivery-label"
            checked={preferences.deliveryEnabled}
            disabled={disabled || !preferences.pickupEnabled}
            onCheckedChange={(next) => change("deliveryEnabled", next)}
          />
        </div>
        <div className="store-settings-switch">
          <div>
            <b id="store-express-label">Oferecer entrega expressa</b>
            <small>
              Aparece nas cotações quando a entrega no endereço estiver ativa.
            </small>
          </div>
          <Switch
            aria-labelledby="store-express-label"
            checked={preferences.expressEnabled}
            disabled={disabled || !preferences.deliveryEnabled}
            onCheckedChange={(next) => change("expressEnabled", next)}
          />
        </div>
        <div className="store-settings-grid">
          <DaysField
            label="Preparação antes do transporte · dias úteis"
            value={preferences.preparationDays}
            min={0}
            disabled={disabled || !preferences.deliveryEnabled}
            onChange={(next) => change("preparationDays", next)}
            onValidityChange={preparationValidity}
          />
          <div className="store-settings-readonly">
            <span>Origem da cotação</span>
            <b>Brasília / DF</b>
            <small>
              Tabela regional de demonstração. Sem cotação de transportadora
              conectada.
            </small>
          </div>
        </div>
        <div className="store-settings-switch">
          <div>
            <b id="store-free-label">Frete padrão grátis por valor</b>
            <small>Válido nas faixas de CEP atendidas pela tabela atual.</small>
          </div>
          <Switch
            aria-labelledby="store-free-label"
            checked={preferences.freeShippingFromCents !== null}
            disabled={disabled || !preferences.deliveryEnabled}
            onCheckedChange={(next) => {
              moneyValidity(true);
              change(
                "freeShippingFromCents",
                next ? DEFAULT_STORE_PREFERENCES.freeShippingFromCents : null,
              );
            }}
          />
        </div>
        {preferences.freeShippingFromCents !== null && (
          <FreeShippingAmount
            value={preferences.freeShippingFromCents}
            disabled={disabled || !preferences.deliveryEnabled}
            onChange={(next) => change("freeShippingFromCents", next)}
            onValidityChange={moneyValidity}
          />
        )}
      </section>
      <section className="store-settings-section">
        <div className="store-settings-heading">
          <MapPin size={17} />
          <div>
            <h3>Retirada</h3>
            <p>Os dados de retirada são guardados com o pedido.</p>
          </div>
        </div>
        <div className="store-settings-switch">
          <div>
            <b id="store-pickup-label">Permitir retirada em Brasília</b>
            <small>Desative para trabalhar apenas com entrega.</small>
          </div>
          <Switch
            aria-labelledby="store-pickup-label"
            checked={preferences.pickupEnabled}
            disabled={disabled || !preferences.deliveryEnabled}
            onCheckedChange={(next) => change("pickupEnabled", next)}
          />
        </div>
        <div className="store-settings-grid">
          <label className="f">
            <span>Endereço de retirada · Brasília / DF</span>
            <Input
              maxLength={240}
              value={preferences.pickupAddress}
              disabled={disabled || !preferences.pickupEnabled}
              placeholder="Combinado pelo WhatsApp"
              onChange={(event) => change("pickupAddress", event.target.value)}
            />
            <small className="hint">
              Aparece no checkout e na confirmação. Vazio mantém o local
              combinado pelo WhatsApp.
            </small>
          </label>
          <DaysField
            label="Prazo de retirada · dias úteis"
            min={1}
            value={preferences.pickupReadyDays}
            disabled={disabled || !preferences.pickupEnabled}
            onChange={(next) => change("pickupReadyDays", next)}
            onValidityChange={pickupValidity}
          />
        </div>
      </section>
      <section className="store-settings-section">
        <label className="f">
          <span>Aviso no checkout</span>
          <Textarea
            rows={3}
            maxLength={500}
            value={preferences.checkoutNotice}
            disabled={disabled}
            placeholder="Opcional: informe horários ou orientações de atendimento"
            onChange={(event) => change("checkoutNotice", event.target.value)}
          />
          <small className="hint">
            Exibido antes da etapa de pagamento. Deixe vazio para não mostrar
            aviso.
          </small>
        </label>
      </section>
      <div className="store-settings-payment">
        <CreditCard size={17} />
        <div>
          <b>Pagamento simulado</b>
          <p>
            A regra atual permite até 10 parcelas sem juros, com parcela mínima
            de R$ 100. O provedor real ainda não está conectado; limites de
            parcelamento não são configuráveis aqui.
          </p>
        </div>
      </div>
    </div>
  );
}
