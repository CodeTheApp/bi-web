import "server-only";
import type { Coupon, CouponDraft } from "@/entities/coupon";
import type {
  Address,
  Customer,
  CustomerContactUpdate,
  Order,
  OrderSummary,
  Profile,
} from "@/entities/order";
import { hasSupabase } from "@/shared/api/supabase/env";
import { demoAllowed } from "@/server/admin/repo";

/**
 * Clientes, favoritos e pedidos da loja. Duas implementações, como o resto do projeto:
 * Supabase (login de verdade, RLS) e demonstração (tudo simulado, gravado em data/).
 */
export interface ShopRepo {
  readonly mode: "supabase" | "demo";

  /** Envia o código de 6 dígitos. No modo demonstração ele volta aqui, para aparecer na tela. */
  sendCode(email: string): Promise<{ demoCode?: string }>;
  verifyCode(email: string, code: string): Promise<Customer>;
  /** Google: no Supabase devolve a URL de autorização; na demonstração entra direto com o e-mail informado. */
  google(
    next: string,
    demoEmail?: string,
    demoName?: string,
  ): Promise<{ url?: string; customer?: Customer }>;
  signOut(): Promise<void>;
  me(): Promise<Customer | null>;

  saveProfile(p: Profile): Promise<Customer>;
  saveAddress(a: Address): Promise<Address>;
  removeAddress(id: string): Promise<void>;

  favorites(): Promise<string[]>;
  setFavorites(add: string[], remove: string[]): Promise<string[]>;

  coupons(): Promise<Coupon[]>;
  couponByCode(code: string): Promise<Coupon | null>;
  saveCoupon(id: string | null, draft: CouponDraft): Promise<Coupon>;
  deleteCoupon(id: string): Promise<void>;
  findCheckout(key: string, customerId: string): Promise<Order | null>;
  /** Atomically validates a coupon, reserves its use and creates an idempotent checkout. */
  createCheckout(
    o: Omit<Order, "id" | "number" | "createdAt">,
    key: string,
    couponCode: string,
  ): Promise<{ order: Order; created: boolean }>;

  createOrder(o: Omit<Order, "id" | "number" | "createdAt">): Promise<Order>;
  myOrders(): Promise<OrderSummary[]>;
  myOrder(id: string): Promise<Order | null>;

  /** Usado pelo pagamento (sistema) e pelo painel (equipe). */
  getOrder(id: string): Promise<Order | null>;
  updateOrder(
    id: string,
    patch: Partial<Pick<Order, "status" | "payment" | "tracking" | "notes">>,
    event?: Order["timeline"][number],
  ): Promise<Order>;
  allOrders(): Promise<OrderSummary[]>;
  /** Full orders are read only on the server before analytics removes private checkout fields. */
  analyticsOrders(): Promise<Order[]>;
  customers(): Promise<
    Array<Customer & { orders: number; spentCents: number }>
  >;
  customer(id: string): Promise<Customer | null>;
  customerOrders(id: string): Promise<OrderSummary[]>;
  updateCustomer(id: string, contact: CustomerContactUpdate): Promise<Customer>;
}

export async function getShopRepo(): Promise<ShopRepo> {
  if (hasSupabase) return (await import("./repo-supabase")).supabaseShop();
  if (demoAllowed()) return (await import("./repo-demo")).demoShop();
  throw new Error("Loja indisponível: configure o Supabase.");
}
