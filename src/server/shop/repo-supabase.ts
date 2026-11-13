import "server-only";
import type { Coupon } from "@/entities/coupon";
import {
  orderSummary,
  type Address,
  type Customer,
  type Order,
} from "@/entities/order";
import type { Json, Tables } from "@/shared/api/supabase/database.types";
import {
  createSupabaseServer,
  createSupabaseService,
} from "@/shared/api/supabase/server";
import { all, must } from "../catalog/rows";
import type { ShopRepo } from "./repo";

const toCoupon = (row: Tables<"coupons">, used = 0): Coupon => ({
  id: row.id,
  code: row.code,
  kind: row.kind,
  value: row.value,
  minimumCents: row.minimum_cents,
  startsAt: row.starts_at,
  expiresAt: row.expires_at,
  active: row.active,
  maxUses: row.max_uses,
  createdAt: row.created_at,
  used,
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const toAddress = (r: Tables<"customer_addresses">): Address => ({
  id: r.id,
  recipient: r.recipient,
  cep: r.cep,
  street: r.street,
  number: r.number,
  complement: r.complement,
  district: r.district,
  city: r.city,
  uf: r.uf,
});

const toCustomer = (row: Tables<"customers">, addresses: Address[] = []): Customer => ({
  id: row.id, email: row.email, contactEmail: row.contact_email ?? "", name: row.name,
  phone: row.phone, cpf: row.cpf, provider: row.provider, createdAt: row.created_at, addresses,
});

const toOrder = (r: Tables<"orders">): Order => ({
  id: r.id,
  number: r.number,
  customerId: r.customer_id ?? "",
  email: r.email,
  name: r.name,
  phone: r.phone,
  items: r.items as Order["items"],
  subtotalCents: r.subtotal_cents,
  discountCents: r.discount_cents ?? 0,
  coupon: (r.coupon ?? null) as Order["coupon"],
  checkoutKey: r.checkout_key,
  shippingCents: r.shipping_cents,
  totalCents: r.total_cents,
  shipping: r.shipping as Order["shipping"],
  payment: (r.payment ?? null) as Order["payment"],
  status: r.status,
  tracking: r.tracking,
  notes: r.notes,
  timeline: (r.timeline ?? []) as Order["timeline"],
  createdAt: r.created_at,
});

/**
 * Loja com Supabase: login de verdade (código por e-mail e Google), dados do cliente com RLS.
 * Pedidos são gravados e atualizados com a chave de serviço, porque preço, frete e total são calculados no servidor.
 */
export async function supabaseShop(): Promise<ShopRepo> {
  const db = await createSupabaseServer();
  const svc = () => createSupabaseService();

  const load = async (
    id: string,
    email: string,
    provider: Customer["provider"] = "email",
  ): Promise<Customer> => {
    let row = must(
      await db.from("customers").select("*").eq("id", id).maybeSingle(),
    ) as Tables<"customers"> | null;
    if (!row || !("id" in row)) {
      row = must(
        await db
          .from("customers")
          .insert({ id, email, provider })
          .select("*")
          .single(),
      );
    }
    const addrs = must(
      await db
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
    );
    return toCustomer(row, addrs.map(toAddress));
  };
  const user = async () => (await db.auth.getUser()).data.user;
  const mustUser = async () => {
    const u = await user();
    if (!u) throw new Error("Entre na sua conta para continuar.");
    return u;
  };

  const repo: ShopRepo = {
    mode: "supabase",

    async sendCode(email) {
      const { error } = await db.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error)
        throw new Error(
          error.status === 429
            ? "Muitos pedidos de código. Espere um minuto."
            : "Não foi possível enviar o código.",
        );
      return {};
    },
    async verifyCode(email, code) {
      const { data, error } = await db.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error || !data.user) throw new Error("Código incorreto ou expirado.");
      return load(data.user.id, data.user.email ?? email, "email");
    },
    async google(next) {
      const { data, error } = await db.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${SITE}/conta/entrar/retorno?next=${encodeURIComponent(next)}`,
        },
      });
      if (error || !data.url)
        throw new Error("Não foi possível abrir o login do Google.");
      return { url: data.url };
    },
    async signOut() {
      await db.auth.signOut();
    },
    async me() {
      const u = await user();
      if (!u) return null;
      const google = u.app_metadata?.provider === "google";
      return load(u.id, u.email ?? "", google ? "google" : "email");
    },

    async saveProfile(p) {
      const u = await mustUser();
      must(
        await db
          .from("customers")
          .update({ name: p.name, phone: p.phone, cpf: p.cpf })
          .eq("id", u.id),
      );
      return load(u.id, u.email ?? "");
    },
    async saveAddress(a) {
      const u = await mustUser();
      const row = {
        customer_id: u.id,
        recipient: a.recipient,
        cep: a.cep,
        street: a.street,
        number: a.number,
        complement: a.complement,
        district: a.district,
        city: a.city,
        uf: a.uf,
      };
      const r = a.id
        ? must(
            await db
              .from("customer_addresses")
              .update(row)
              .eq("id", a.id)
              .select("*")
              .single(),
          )
        : must(
            await db
              .from("customer_addresses")
              .insert(row)
              .select("*")
              .single(),
          );
      return toAddress(r);
    },
    async removeAddress(id) {
      await mustUser();
      must(await db.from("customer_addresses").delete().eq("id", id));
    },

    async favorites() {
      const u = await user();
      if (!u) return [];
      return must(
        await db.from("favorites").select("product_id").eq("customer_id", u.id),
      ).map((r) => r.product_id);
    },
    async setFavorites(add, remove) {
      const u = await mustUser();
      if (add.length)
        must(
          await db.from("favorites").upsert(
            add.map((product_id) => ({ customer_id: u.id, product_id })),
            { ignoreDuplicates: true },
          ),
        );
      if (remove.length)
        must(
          await db
            .from("favorites")
            .delete()
            .eq("customer_id", u.id)
            .in("product_id", remove),
        );
      return repo.favorites();
    },

    async coupons() {
      const [rows, usage] = await Promise.all([
        all((from, to) =>
          svc()
            .from("coupons")
            .select("*")
            .order("created_at", { ascending: false })
            .range(from, to),
        ),
        svc().rpc("shop_coupon_usage"),
      ]);
      const counts = new Map(
        must(usage).map((row) => [row.coupon_id, Number(row.used)]),
      );
      return rows.map((row) => toCoupon(row, counts.get(row.id) ?? 0));
    },
    async couponByCode(code) {
      const row = must(
        await svc().from("coupons").select("*").eq("code", code).maybeSingle(),
      );
      if (!row || !("id" in row)) return null;
      const usage = must(await svc().rpc("shop_coupon_usage"));
      return toCoupon(
        row,
        Number(usage.find((entry) => entry.coupon_id === row.id)?.used ?? 0),
      );
    },
    async saveCoupon(id, draft) {
      const value = {
        code: draft.code,
        kind: draft.kind,
        value: draft.value,
        minimum_cents: draft.minimumCents,
        starts_at: draft.startsAt,
        expires_at: draft.expiresAt,
        active: draft.active,
        max_uses: draft.maxUses,
      };
      if (id) {
        const current = must(
          await svc().from("coupons").select("*").eq("id", id).single(),
        );
        if (current.code !== draft.code) {
          const used = must(
            await svc()
              .from("coupon_redemptions")
              .select("order_id")
              .eq("coupon_id", id)
              .limit(1),
          );
          if (used.length)
            throw new Error(
              "Cupons já utilizados mantêm seu código. Crie outro cupom.",
            );
        }
      }
      const row = id
        ? must(
            await svc()
              .from("coupons")
              .update(value)
              .eq("id", id)
              .select("*")
              .single(),
          )
        : must(await svc().from("coupons").insert(value).select("*").single());
      return (await repo.couponByCode(row.code))!;
    },
    async deleteCoupon(id) {
      const used = must(
        await svc()
          .from("coupon_redemptions")
          .select("order_id")
          .eq("coupon_id", id)
          .limit(1),
      );
      if (used.length)
        throw new Error(
          "Este cupom já foi utilizado. Desative-o para preservar o histórico.",
        );
      must(await svc().from("coupons").delete().eq("id", id));
    },
    async findCheckout(key, customerId) {
      const row = must(
        await svc()
          .from("orders")
          .select("*")
          .eq("checkout_key", key)
          .eq("customer_id", customerId)
          .maybeSingle(),
      );
      return row && "id" in row ? toOrder(row) : null;
    },
    async createCheckout(o, key, code) {
      const order = {
        customer_id: o.customerId,
        email: o.email,
        name: o.name,
        phone: o.phone,
        items: o.items,
        subtotal_cents: o.subtotalCents,
        shipping_cents: o.shippingCents,
        discount_cents: o.discountCents ?? 0,
        shipping: o.shipping,
        notes: o.notes,
        timeline: o.timeline,
      } as unknown as Json;
      const result = must(
        await svc().rpc("create_shop_checkout", {
          p_order: order,
          p_key: key,
          p_code: code,
        }),
      ) as unknown as { order: Tables<"orders">; created: boolean };
      return { order: toOrder(result.order), created: result.created };
    },
    async createOrder(o) {
      const r = must(
        await svc()
          .from("orders")
          .insert({
            customer_id: o.customerId || null,
            email: o.email,
            name: o.name,
            phone: o.phone,
            items: o.items as unknown as Json,
            subtotal_cents: o.subtotalCents,
            shipping_cents: o.shippingCents,
            total_cents: o.totalCents,
            shipping: o.shipping as unknown as Json,
            payment: o.payment as unknown as Json,
            status: o.status,
            tracking: o.tracking,
            notes: o.notes,
            timeline: o.timeline as unknown as Json,
          })
          .select("*")
          .single(),
      );
      return toOrder(r);
    },
    async myOrders() {
      const u = await user();
      if (!u) return [];
      return must(
        await db
          .from("orders")
          .select("*")
          .eq("customer_id", u.id)
          .order("created_at", { ascending: false }),
      ).map((r) => orderSummary(toOrder(r)));
    },
    async myOrder(id) {
      const u = await user();
      if (!u) return null;
      const r = must(
        await db
          .from("orders")
          .select("*")
          .eq("id", id)
          .eq("customer_id", u.id)
          .maybeSingle(),
      );
      return r && "id" in r ? toOrder(r as Tables<"orders">) : null;
    },

    async getOrder(id) {
      const r = must(
        await svc().from("orders").select("*").eq("id", id).maybeSingle(),
      );
      return r && "id" in r ? toOrder(r as Tables<"orders">) : null;
    },
    async updateOrder(id, patch, event) {
      const cur = await repo.getOrder(id);
      if (!cur) throw new Error("Pedido não encontrado.");
      const r = must(
        await svc()
          .from("orders")
          .update({
            ...(patch.status ? { status: patch.status } : null),
            ...(patch.payment !== undefined
              ? { payment: patch.payment as unknown as Json }
              : null),
            ...(patch.tracking !== undefined
              ? { tracking: patch.tracking }
              : null),
            ...(patch.notes !== undefined ? { notes: patch.notes } : null),
            ...(event
              ? { timeline: [...cur.timeline, event] as unknown as Json }
              : null),
          })
          .eq("id", id)
          .select("*")
          .single(),
      );
      return toOrder(r);
    },
    async allOrders() {
      return (
        await all((f, t) =>
          db
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false })
            .range(f, t),
        )
      ).map((r) => orderSummary(toOrder(r)));
    },
    async analyticsOrders() {
      return (
        await all((from, to) =>
          db
            .from("orders")
            .select("*")
            .order("created_at", { ascending: false })
            .range(from, to),
        )
      ).map(toOrder);
    },
    async customers() {
      const [cs, os] = await Promise.all([
        all((f, t) =>
          db
            .from("customers")
            .select("*")
            .order("created_at", { ascending: false })
            .range(f, t),
        ),
        all((f, t) =>
          db
            .from("orders")
            .select("customer_id, total_cents, status")
            .range(f, t),
        ),
      ]);
      return cs.map((c) => {
        const mine = os.filter((o) => o.customer_id === c.id);
        const paid = mine.filter(
          (o) =>
            o.status !== "cancelado" && o.status !== "aguardando_pagamento",
        );
        return {
          ...toCustomer(c),
          orders: mine.length,
          spentCents: paid.reduce((s, o) => s + o.total_cents, 0),
        };
      });
    },
    async customer(id) {
      const result = await db.from("customers").select("*").eq("id", id).maybeSingle();
      if (result.error) throw new Error(result.error.message);
      return result.data ? toCustomer(result.data) : null;
    },
    async customerOrders(id) {
      const orders = await all((from, to) => db.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }).range(from, to));
      return orders.map((order) => orderSummary(toOrder(order)));
    },
    async updateCustomer(id, contact) {
      const result = must(await db.rpc("update_customer_contact", {
        p_customer: id, p_name: contact.name, p_phone: contact.phone, p_contact_email: contact.contactEmail,
      }));
      return toCustomer(result as unknown as Tables<"customers">);
    },
  };
  return repo;
}
