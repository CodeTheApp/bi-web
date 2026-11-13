/**
 * Converte a planilha de produtos da loja antiga em data/catalogo.json (usado pelo modo demonstração).
 * Planilhas de fotos/vídeos (colunas SKU e URL) podem vir depois e são ligadas aos produtos.
 * Em produção, as mesmas planilhas são importadas pelo painel: Loja › Produtos › Importar planilha.
 *
 * Uso: npm run catalog:import -- data/produtos.csv [data/videos.csv ...]
 * A pasta data/ fica fora do git (o repositório é público e os dados são do cliente).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fetchVideoTitles, importCsv, matchMedia, readMediaRows } from "@/entities/product";
import { isVideoUrl, mediaKey } from "@/entities/product";

async function main() {
  const [file, ...mediaFiles] = process.argv.slice(2);
  if (!file) {
    console.error("Informe o arquivo: npm run catalog:import -- data/produtos.csv [data/videos.csv]");
    process.exit(1);
  }
  const { products, report } = importCsv(readFileSync(file, "utf8"));
  console.log(`${report.rows} linhas → ${report.products} produtos (${report.published} publicados, ${report.drafts} rascunhos), ${report.variants} variantes.`);
  if (report.skipped.length) console.log("Ignoradas:", report.skipped.map((s) => `${s.name} (${s.reason})`).join("; "));

  for (const mf of mediaFiles) {
    const targets = products.map((p) => ({ id: p.id, title: p.title, key: p.legacy.key, names: p.legacy.names, skus: p.variants.map((v) => v.sku), urls: p.media.map((m) => m.url) }));
    const rows = readMediaRows(readFileSync(mf, "utf8"));
    const titles = await fetchVideoTitles(rows.filter((r) => isVideoUrl(r.url)).map((r) => r.url));
    const m = matchMedia(targets, rows, isVideoUrl, mediaKey, titles);
    for (const l of m.links) products.find((p) => p.id === l.productId)?.media.push({ url: l.url, kind: l.kind, alt: l.title, variantId: null, visible: l.visible });
    console.log(`${mf}: ${m.links.length} de ${m.rows} links vinculados${m.shared ? `, ${m.shared} ocultos para conferir` : ""}${m.unmatched.length ? `, ${m.unmatched.length} sem produto` : ""}.`);
    console.log(titles.size ? `Títulos conferidos no YouTube/Vimeo: ${titles.size}.` : "Sem acesso aos títulos dos vídeos (sem rede): ligação só pela planilha.");
    for (const c of m.corrected) console.log(`  corrigido pelo título: ${c.videoTitle} → ${c.to} (a planilha dizia ${c.from})`);
    for (const x of m.mismatched) console.log(`  oculto: ${x.product} — o vídeo é de outra peça (${x.videoTitle})`);
  }

  mkdirSync("data", { recursive: true });
  writeFileSync("data/catalogo.json", JSON.stringify(products));
  // o estado do modo demonstração (edições, vendas) partia do catálogo antigo: recomeça da planilha nova
  rmSync("data/demo-catalogo-estado.json", { force: true });
  console.log("Gravado em data/catalogo.json (estado de demonstração do catálogo zerado)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
