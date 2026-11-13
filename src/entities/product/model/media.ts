/**
 * Fotos e vídeos dos produtos. Vídeo entra por link (YouTube, inclusive Shorts, Vimeo)
 * ou por arquivo .mp4/.webm já hospedado; a página do produto carrega o player só quando a pessoa clica.
 */
export type VideoInfo = {
  provider: "youtube" | "vimeo" | "arquivo";
  id: string | null;
  /** endereço do player (iframe) ou do arquivo */
  src: string;
  /** miniatura, quando o serviço oferece uma sem chave de API */
  thumb: string | null;
  /** Shorts e afins: vídeo em pé */
  vertical: boolean;
};

export function parseVideo(raw: string): VideoInfo | null {
  const url = raw.trim();
  let m = url.match(/(?:youtube\.com\/(?:shorts\/|embed\/|live\/|watch\?(?:.*&)?v=)|youtu\.be\/)([\w-]{11})/i);
  if (m) {
    const id = m[1];
    return {
      provider: "youtube", id, vertical: /\/shorts\//i.test(url),
      src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (m) return { provider: "vimeo", id: m[1], vertical: false, src: `https://player.vimeo.com/video/${m[1]}?autoplay=1&title=0&byline=0`, thumb: null };
  if (/^data:video\/(?:mp4|webm|quicktime);base64,[A-Za-z0-9+/]+=*$/.test(url)) return { provider: "arquivo", id: null, vertical: false, src: url, thumb: null };
  if (/^https?:\/\/\S+\.(mp4|webm|mov|m4v)(\?\S*)?$/i.test(url) || /^\/\S+\.(mp4|webm|mov|m4v)$/i.test(url)) return { provider: "arquivo", id: null, vertical: false, src: url, thumb: null };
  return null;
}

export const isVideoUrl = (url: string) => parseVideo(url) !== null;

/** Endereço canônico, para não vincular o mesmo vídeo duas vezes com links diferentes. */
export const mediaKey = (url: string) => {
  const v = parseVideo(url);
  return v?.id ? `${v.provider}:${v.id}` : url.trim();
};

type M = { url: string; kind: "imagem" | "video"; visible: boolean; variantId?: string | null };

/** Par editorial apagada/acesa explícito, publicado e do mesmo acabamento. */
export function lightOnFor(media: M[], offUrl: string): string | null {
  if (!/^\/img\/products\/[^/]+-editorial-off\.webp$/.test(offUrl)) return null;
  const off = media.find((m) => m.visible && m.kind === "imagem" && m.url === offUrl);
  if (!off) return null;
  const onUrl = offUrl.replace(/-off\.webp$/, ".webp");
  return media.find((m) => m.visible && m.kind === "imagem" && m.url === onUrl && (m.variantId ?? null) === (off.variantId ?? null))?.url ?? null;
}

/** Capa para listas: a primeira foto visível; sem foto, a miniatura do primeiro vídeo. */
export function coverOf(media: M[]): { src: string; video: boolean; tall: boolean } | null {
  const shown = media.filter((m) => m.visible);
  const img = shown.find((m) => m.kind === "imagem");
  if (img) return { src: img.url, video: false, tall: false };
  for (const m of shown) {
    const v = m.kind === "video" ? parseVideo(m.url) : null;
    if (v?.thumb) return { src: v.thumb, video: true, tall: v.vertical };
  }
  return null;
}
