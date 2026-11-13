import "server-only";
import { couponDiscount, type Coupon } from "@/entities/coupon";
import {
  installmentsFor,
  quoteShipping,
  type Address,
  type Customer,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/entities/order";
import { variantLabel, type Product } from "@/entities/product";

export const COMMERCE_FIXTURE_VERSION = 1;
const PREFIX = "d3e0c0de";
const CHECKOUT_PREFIX = "demo-commerce:v1:";
const HOUR = 3600000;
const CUSTOMER_NAMES = [
  "Ana Ribeiro",
  "Bruno Lima",
  "Carla Nunes",
  "Daniel Rocha",
  "Elisa Moura",
  "Felipe Costa",
  "Gabriela Luz",
  "Henrique Alves",
  "Isabela Reis",
  "João Melo",
  "Laura Dias",
  "Marcos Silva",
  "Nina Castro",
  "Otávio Ramos",
  "Paula Leal",
  "Rafael Prado",
];
const LOCATIONS = [
  { cep: "70040-010", city: "Brasília", uf: "DF" },
  { cep: "01310-100", city: "São Paulo", uf: "SP" },
  { cep: "74003-010", city: "Goiânia", uf: "GO" },
  { cep: "30130-110", city: "Belo Horizonte", uf: "MG" },
];
const STATUSES: OrderStatus[] = [
  "aguardando_pagamento",
  "pago",
  "em_separacao",
  "enviado",
  "entregue",
  "entregue",
  "cancelado",
  "pago",
  "enviado",
  "entregue",
  "cancelado",
  "entregue",
];

export const demoFixtureId = (kind: number, index: number) =>
  `${PREFIX}-${kind.toString(16).padStart(4, "0")}-4000-8000-${index.toString(16).padStart(12, "0")}`;

/** Both a reserved server-generated ID and an immutable checkout marker are required. */
export function isDemoOrderFixture(order: Pick<Order, "id" | "checkoutKey">) {
  return (
    order.id.startsWith(`${PREFIX}-0003-4000-8000-`) &&
    order.checkoutKey === `${CHECKOUT_PREFIX}${order.id}`
  );
}

const brazilDay = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((part) => parts.find((entry) => entry.type === part)?.value)
    .join("-");
};

export type CommerceFixtureState = {
  seq: number;
  customers: Customer[];
  orders: Order[];
  coupons: Coupon[];
  demoFixtures?: { version: number; createdAt: string };
};

/** Creates coherent historical examples without performing a checkout or touching stock. */
export function buildDemoCommerceFixtures(
  products: readonly Product[],
  now = new Date(),
  firstNumber = 1001,
) {
  const nowMs = now.getTime();
  const day = brazilDay(now);
  const at = (daysAgo: number) => {
    const date = new Date(`${day}T10:00:00-03:00`);
    date.setUTCDate(date.getUTCDate() - daysAgo);
    return new Date(Math.min(date.getTime(), nowMs - 6 * HOUR)).toISOString();
  };
  const after = (date: string, hours: number) =>
    new Date(Date.parse(date) + hours * HOUR).toISOString();
  const sortedProducts = [...products].sort(
    (a, b) =>
      Number(b.legacy.key.startsWith("demo-catalog:")) -
      Number(a.legacy.key.startsWith("demo-catalog:")),
  );
  const candidates = sortedProducts
    .filter((product) => product.status === "publicado")
    .flatMap((product) => {
      const variant = product.variants.find(
        (value) =>
          value.active &&
          Number.isSafeInteger(value.priceCents) &&
          (value.priceCents ?? 0) > 0,
      );
      return variant ? [{ product, variant }] : [];
    })
    .slice(0, 24);
  if (!candidates.length)
    return {
      customers: [] as Customer[],
      orders: [] as Order[],
      coupons: [] as Coupon[],
    };

  const customers: Customer[] = CUSTOMER_NAMES.map((name, index) => ({
    id: demoFixtureId(1, index + 1),
    name: `[Demo] ${name}`,
    email: `cliente${String(index + 1).padStart(2, "0")}@loja.example`,
    phone: "",
    cpf: "",
    provider: index % 3 === 0 ? "google" : "email",
    createdAt: at(90 + index),
    addresses: [
      {
        id: demoFixtureId(5, index + 1),
        recipient: `[Demo] ${name}`,
        street: "Rua de demonstração",
        number: String(100 + index),
        complement: "Endereço fictício",
        district: "Bairro exemplo",
        ...LOCATIONS[index % LOCATIONS.length],
      },
    ],
  }));
  const couponBase = {
    createdAt: at(90),
    minimumCents: 0,
    used: 0,
    startsAt: at(90),
    expiresAt: after(at(0), 30 * 24),
    active: true,
    maxUses: null,
  };
  const coupons: Coupon[] = [
    {
      ...couponBase,
      id: demoFixtureId(2, 1),
      code: "DEMO10",
      kind: "percentual",
      value: 10,
      maxUses: 100,
    },
    {
      ...couponBase,
      id: demoFixtureId(2, 2),
      code: "DEMO50",
      kind: "fixo",
      value: 5000,
      maxUses: 50,
    },
    {
      ...couponBase,
      id: demoFixtureId(2, 3),
      code: "DEMO-EXPIRADO",
      kind: "percentual",
      value: 15,
      expiresAt: at(15),
    },
    {
      ...couponBase,
      id: demoFixtureId(2, 4),
      code: "DEMO-INATIVO",
      kind: "percentual",
      value: 20,
      active: false,
      minimumCents: 20000,
    },
    {
      ...couponBase,
      id: demoFixtureId(2, 5),
      code: "DEMO-AGENDADO",
      kind: "percentual",
      value: 12,
      startsAt: after(at(0), 5 * 24),
    },
    {
      ...couponBase,
      id: demoFixtureId(2, 6),
      code: "DEMO-LIMITE",
      kind: "fixo",
      value: 2500,
      maxUses: 2,
    },
  ];

  const orders: Order[] = Array.from({ length: 48 }, (_, index) => {
    const customer = customers[index % customers.length];
    const daysAgo = index < 30 ? Math.floor(index / 2) : 16 + (index - 30) * 3;
    const createdAt = at(daysAgo);
    const status = STATUSES[index % STATUSES.length];
    const refunded = status === "cancelado" && index % 12 === 6;
    const paid =
      !["aguardando_pagamento", "cancelado"].includes(status) || refunded;
    const itemCount = index % 4 === 0 ? 2 : 1;
    const items: OrderItem[] = Array.from(
      { length: itemCount },
      (_, itemIndex) => {
        const { product, variant } =
          candidates[(index + itemIndex) % candidates.length];
        const image =
          product.media.find(
            (media) =>
              media.visible &&
              media.kind === "imagem" &&
              media.variantId === variant.id,
          ) ??
          product.media.find(
            (media) =>
              media.visible && media.kind === "imagem" && !media.variantId,
          );
        return {
          variantId: variant.id,
          productId: product.id,
          slug: product.slug,
          title: product.title,
          label: variantLabel(variant, product.options),
          sku: variant.sku,
          image: image?.url ?? null,
          category: product.category,
          priceCents: variant.priceCents!,
          qty: itemIndex === 0 && index % 5 === 0 ? 2 : 1,
        };
      },
    );
    const subtotalCents = items.reduce(
      (sum, item) => sum + item.qty * item.priceCents,
      0,
    );
    const chosenCoupon =
      index === 12 || index === 13
        ? coupons[5]
        : index >= 40 && index % 2 === 0
          ? coupons[2]
          : index % 3 === 0
            ? coupons[0]
            : index % 3 === 1
              ? coupons[1]
              : null;
    const coupon = chosenCoupon
      ? couponDiscount(chosenCoupon, subtotalCents, Date.parse(createdAt))
      : null;
    const discountCents = coupon?.discountCents ?? 0;
    const address: Address = customer.addresses[0];
    const shippingOptions = quoteShipping(
      address.cep,
      subtotalCents - discountCents,
      items.reduce((sum, item) => sum + item.qty, 0),
    );
    const shipping =
      shippingOptions.find(
        (choice) =>
          choice.id ===
          (index % 7 === 0
            ? "retirada"
            : index % 9 === 0
              ? "expressa"
              : "padrao"),
      ) ?? shippingOptions.find((choice) => choice.id === "padrao")!;
    const id = demoFixtureId(3, index + 1);
    const method = index % 5 < 2 ? ("pix" as const) : ("cartao" as const);
    const totalCents = subtotalCents - discountCents + shipping.priceCents;
    const payment: Order["payment"] =
      paid && index % 11 === 0
        ? null
        : {
            provider: "demo-fixture",
            method,
            status: refunded
              ? "estornado"
              : paid
                ? "aprovado"
                : method === "cartao"
                  ? "recusado"
                  : "pendente",
            chargeId: `demo_fixture_${index + 1}`,
            ...(paid ? { paidAt: after(createdAt, 0.25) } : {}),
            ...(method === "cartao"
              ? {
                  brand: index % 2 === 0 ? "Visa" : "Mastercard",
                  last4: "0000",
                  installments: Math.min(3, installmentsFor(totalCents)),
                }
              : { expiresAt: after(createdAt, 0.5) }),
            ...(!paid && method === "cartao"
              ? {
                  message:
                    "Exemplo de pagamento recusado. Nenhuma cobrança real.",
                }
              : {}),
          };
    const timeline: Order["timeline"] = [
      {
        status: "criado",
        at: createdAt,
        note: "Pedido de demonstração: nenhuma cobrança ou movimentação real.",
        by: "Demonstração",
      },
    ];
    if (paid)
      timeline.push({
        status: "pago",
        at: after(createdAt, 0.25),
        note: "Pagamento de exemplo",
        by: "Demonstração",
      });
    if (
      status === "em_separacao" ||
      status === "enviado" ||
      status === "entregue"
    )
      timeline.push({
        status: "em_separacao",
        at: after(createdAt, 0.5),
        note: "Separação de exemplo",
        by: "Demonstração",
      });
    if (status === "enviado" || status === "entregue")
      timeline.push({
        status: "enviado",
        at: after(createdAt, 1),
        note: "Envio de exemplo",
        by: "Demonstração",
      });
    if (status === "entregue")
      timeline.push({
        status,
        at: after(createdAt, 3),
        note: "Entrega de exemplo",
        by: "Demonstração",
      });
    if (status === "cancelado")
      timeline.push({
        status,
        at: after(createdAt, 4),
        note: refunded
          ? "Estorno de exemplo"
          : "Cancelamento antes do pagamento",
        by: "Demonstração",
      });
    return {
      id,
      number: firstNumber + index,
      checkoutKey: `${CHECKOUT_PREFIX}${id}`,
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      phone: "",
      items,
      subtotalCents,
      discountCents,
      coupon,
      shippingCents: shipping.priceCents,
      totalCents,
      shipping: {
        ...shipping,
        address: shipping.id === "retirada" ? null : address,
      },
      payment,
      status,
      tracking:
        status === "enviado" || status === "entregue"
          ? `DEMO${String(index + 1).padStart(6, "0")}BR`
          : "",
      notes:
        "[Demonstração] Dados fictícios para conhecer o painel. Não movimenta estoque nem realiza cobranças.",
      timeline,
      createdAt,
    };
  });
  for (const coupon of coupons)
    coupon.used = orders.filter(
      (order) => order.coupon?.id === coupon.id && order.status !== "cancelado",
    ).length;
  return {
    customers,
    coupons,
    orders: orders.sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number,
    ),
  };
}

/** Applied only to the isolated examples workspace; never overwrite an existing row. */
export function seedDemoCommerce(
  state: CommerceFixtureState,
  products: readonly Product[],
  now = new Date(),
) {
  if ((state.demoFixtures?.version ?? 0) >= COMMERCE_FIXTURE_VERSION)
    return false;
  const firstNumber =
    Math.max(1000, state.seq, ...state.orders.map((order) => order.number)) + 1;
  const fixtures = buildDemoCommerceFixtures(products, now, firstNumber);
  if (!fixtures.orders.length) return false;
  state.customers.push(
    ...fixtures.customers.filter(
      (item) =>
        !state.customers.some(
          (existing) =>
            existing.id === item.id || existing.email === item.email,
        ),
    ),
  );
  state.coupons.push(
    ...fixtures.coupons.filter(
      (item) =>
        !state.coupons.some(
          (existing) => existing.id === item.id || existing.code === item.code,
        ),
    ),
  );
  const customerIds = new Set(state.customers.map((item) => item.id));
  const couponIds = new Set(state.coupons.map((item) => item.id));
  state.orders.push(
    ...fixtures.orders.filter(
      (item) =>
        !state.orders.some((existing) => existing.id === item.id) &&
        customerIds.has(item.customerId) &&
        (!item.coupon || couponIds.has(item.coupon.id)),
    ),
  );
  state.seq = Math.max(
    firstNumber - 1,
    ...state.orders.map((order) => order.number),
  );
  state.orders.sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number,
  );
  state.demoFixtures = {
    version: COMMERCE_FIXTURE_VERSION,
    createdAt: now.toISOString(),
  };
  return true;
}
