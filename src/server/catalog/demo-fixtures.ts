import "server-only";
import { CATEGORIES, type Product } from "@/entities/product";
import {
  buildDemoCommerceFixtures,
  demoFixtureId,
} from "@/server/shop/demo-fixtures";
import type { CatalogStore, DemoMove } from "./store";

const NAMES = [
  "Aurora",
  "Orbe",
  "Arco",
  "Nuvem",
  "Lago",
  "Linha",
  "Traço",
  "Cubo",
  "Foco",
  "Brisa",
  "Âmbar",
  "Lume",
  "Alvorada",
  "Esfera",
  "Céu",
  "Vértice",
  "Reflexo",
  "Duna",
  "Ponto",
  "Halo",
  "Ritmo",
  "Elo",
  "Clara",
  "Horizonte",
];

export function buildDemoCatalogFixtures(now = new Date()) {
  const createdAt = new Date(now.getTime() - 76 * 86400000).toISOString();
  const products: Product[] = NAMES.map((name, index) => {
    const category = CATEGORIES[index % CATEGORIES.length];
    const count = index % 4 === 0 ? 3 : index % 3 === 0 ? 2 : 1;
    const variants: Product["variants"] = Array.from(
      { length: count },
      (_, variantIndex) => ({
        id: demoFixtureId(8, index * 3 + variantIndex + 1),
        sku: `DEMO-${String(index + 1).padStart(3, "0")}-${variantIndex + 1}`,
        options: { acabamento: ["Bronze", "Preto", "Branco"][variantIndex] },
        priceCents:
          index % 8 === 7 ? null : 18000 + index * 13750 + variantIndex * 4500,
        compareAtCents:
          index % 5 === 0 ? 22500 + index * 15500 + variantIndex * 4500 : null,
        stockPolicy: index % 3 === 0 ? "encomenda" : "estoque",
        leadTimeDays: index % 3 === 0 ? 12 + index : null,
        stock: [0, 2, 8, 18][(index + variantIndex) % 4],
        active: true,
        legacyName: "",
      }),
    );
    return {
      id: demoFixtureId(6, index + 1),
      slug: `demo-${category.slug}-${String(index + 1).padStart(2, "0")}`,
      title: `${category.singular} ${name} [Demo]`,
      category: category.slug,
      status:
        index % 8 === 5
          ? "arquivado"
          : index % 6 === 4
            ? "rascunho"
            : "publicado",
      description:
        "[Demonstração] Produto fictício para explorar o painel. Não faz parte do catálogo real da loja.",
      specs: {
        temperatura: "2700 K",
        dimensoes: `${20 + index} × ${30 + index} cm`,
        material: "Alumínio e vidro",
      },
      options: ["acabamento"],
      variants,
      media: [],
      legacy: { names: [], key: `demo-catalog:v1:${index + 1}` },
    };
  });
  const moves: DemoMove[] = products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.stock > 0)
      .map((variant) => ({
        id: demoFixtureId(7, Number.parseInt(variant.id.slice(-12), 16)),
        variantId: variant.id,
        delta: variant.stock,
        reason: "inicial",
        note: "[Demonstração] Saldo inicial de uma variante fictícia.",
        at: createdAt,
        by: "Demonstração",
      })),
  );
  return { products, moves };
}

/** Each historical group nets zero, so even genuine variant balances stay intact. */
export function buildDemoInventoryFixtures(
  products: readonly Product[],
  now = new Date(),
) {
  const orders = buildDemoCommerceFixtures(products, now).orders;
  const moves: DemoMove[] = [];
  let serial = 1;
  for (const order of orders) {
    if (!order.timeline.some((event) => event.status === "pago")) continue;
    for (const item of order.items) {
      const base = { variantId: item.variantId, by: "Demonstração" };
      const add = (
        delta: number,
        reason: DemoMove["reason"],
        note: string,
        at: string,
      ) =>
        moves.push({
          ...base,
          id: demoFixtureId(9, serial++),
          delta,
          reason,
          note: `[Demonstração] ${note}`,
          at,
        });
      add(
        item.qty,
        "compra",
        "Reposição ilustrativa anterior à venda; saldo atual preservado.",
        order.createdAt,
      );
      add(
        -item.qty,
        "venda",
        "Venda ilustrativa; nenhuma baixa adicional no saldo atual.",
        order.payment?.paidAt ??
          order.timeline.find((event) => event.status === "pago")!.at,
      );
      if (order.payment?.status === "estornado") {
        const refundedAt = order.timeline.find(
          (event) => event.status === "cancelado",
        )!.at;
        add(item.qty, "devolucao", "Devolução ilustrativa.", refundedAt);
        add(
          -item.qty,
          "ajuste",
          "Retirada das amostras devolvidas; saldo atual preservado.",
          refundedAt,
        );
      }
    }
  }
  return moves;
}

export function seedDemoCatalog(state: CatalogStore, now = new Date()) {
  if ((state.demoFixtures?.version ?? 0) >= 1) return false;
  const fixtures = buildDemoCatalogFixtures(now);
  state.products.push(
    ...fixtures.products.filter(
      (product) =>
        !state.products.some(
          (existing) =>
            existing.id === product.id || existing.slug === product.slug,
        ),
    ),
  );
  const variantIds = new Set(
    state.products.flatMap((product) =>
      product.variants.map((variant) => variant.id),
    ),
  );
  const existingMoveIds = new Set(state.moves.map((move) => move.id));
  state.moves.push(
    ...[
      ...fixtures.moves,
      ...buildDemoInventoryFixtures(state.products, now),
    ].filter(
      (move) => variantIds.has(move.variantId) && !existingMoveIds.has(move.id),
    ),
  );
  state.demoFixtures = { version: 1, createdAt: now.toISOString() };
  return true;
}
