import "server-only";
import { hasSupabase } from "@/shared/api/supabase/env";
import { hasEmail } from "@/server/email";
import { hasStorage } from "@/server/storage";
import { paymentProvider } from "@/server/shop/payments";

/** Configuration health, never credentials, tokens, addresses or provider responses. */
export function integrationStatus(demo: boolean) {
  const simulated = paymentProvider().simulated;
  return {
    demo,
    supabase: hasSupabase,
    email: hasEmail(),
    storage: hasStorage(),
    payments: !simulated,
    paymentsSimulated: simulated,
    turnstile: Boolean(
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
      process.env.TURNSTILE_SECRET_KEY,
    ),
    inboundEmail: Boolean(
      hasSupabase &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.RESEND_API_KEY &&
      process.env.RESEND_WEBHOOK_SECRET,
    ),
  };
}
export type IntegrationStatus = ReturnType<typeof integrationStatus>;
