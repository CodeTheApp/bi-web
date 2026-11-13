"use client";
import HoldButton from "@/shared/ui/kokonutui/hold-button";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { parseVideo, type VideoInfo } from "@/entities/product";
import type { ProductMedia as Media } from "@/entities/product";
import { Icon } from "@/shared/ui/admin/icons";
import { DropZone, MediaPicker, UploadButton } from "@/features/media-library/client";
import { MediaLightbox } from "@/shared/ui/admin/MediaLightbox";
import { Grip, SortableItem, SortableList } from "@/shared/ui/admin/Sortable";
import { Choice, ControlTooltip, Modal, useToast } from "@/shared/ui/admin/ui";

export type MediaItemState = Media & { _id: string };
let seq = 0;
export const withIds = (ms: Media[]): MediaItemState[] => ms.map((m) => ({ ...m, _id: `m${++seq}` }));
const fresh = (m: Omit<Media, "visible" | "variantId"> & Partial<Pick<Media, "visible" | "variantId">>): MediaItemState => ({ visible: true, variantId: null, ...m, _id: `m${++seq}` });

/**
 * Fotos e vídeos do produto: enviar, puxar da biblioteca, colar link de vídeo, ordenar (arrastar ou "tornar capa"),
 * publicar ou ocultar cada item e ligar a uma variante. Tudo vale ao salvar o produto.
 */
export function ProductMediaManager({ media, onChange, variants, title }: { media: MediaItemState[]; onChange: (m: MediaItemState[]) => void; variants: Array<[string, string]>; title: string }) {
  const toast = useToast();
  const [picker, setPicker] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const removingMedia = media.find((item) => item._id === removingId);
  const [videoOpen, setVideoOpen] = useState(false);
  const [preview, setPreview] = useState<MediaItemState | null>(null);
  const [imagePreview, setImagePreview] = useState<number | null>(null);
  const images = media.filter((item) => item.kind === "imagem");
  const shown = media.filter((m) => m.visible);
  const hidden = media.length - shown.length;
  // a capa na loja é a primeira foto publicada (sem foto, a miniatura do primeiro vídeo)
  const coverId = (shown.find((m) => m.kind === "imagem") ?? shown.find((m) => m.kind === "video"))?._id;
  const patch = (id: string, p: Partial<Media>) => onChange(media.map((x) => (x._id === id ? { ...x, ...p } : x)));
  const toFront = (id: string) => {
    const it = media.find((x) => x._id === id)!;
    onChange([{ ...it, visible: true }, ...media.filter((x) => x._id !== id)]);
  };
  const addImages = (ms: Array<{ url: string; alt: string; kind?: "image" | "video" }>) => ms.length && onChange([...media, ...ms.map((x) => fresh({ url: x.url, kind: x.kind === "video" ? "video" : "imagem", alt: x.alt || title }))]);

  return (
    <div className="card">
      <div className="card-h">
        <div className="stack" style={{ gap: 2 }}>
          <b>Fotos e vídeos</b>
          <span className="muted" style={{ fontSize: 11 }}>
            {shown.length} {shown.length === 1 ? "publicada" : "publicadas"}
            {hidden > 0 && ` · ${hidden} ${hidden === 1 ? "oculta" : "ocultas"}`}
          </span>
        </div>
        <span className="sp" />
        {hidden > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange(media.map((m) => ({ ...m, visible: true })))}>
            Publicar todas
          </Button>
        )}
        <UploadButton variant="outline" size="sm" label="Enviar arquivos" allowVideo onDone={addImages} />
        <Button variant="outline" size="sm" onClick={() => setPicker(true)}>
          <Icon name="image" />
          Da biblioteca
        </Button>
        <Button variant="outline" size="sm" onClick={() => setVideoOpen(true)}>
          <Icon name="video" />
          Vídeo por link
        </Button>
      </div>
      <div className="pad">
        <SortableList grid items={media} getId={(m) => m._id} onMove={onChange} className="pgal">
          {media.map((m, i) => {
            const v = m.kind === "video" ? parseVideo(m.url) : null;
            const bg = m.kind === "imagem" ? m.url : v?.thumb;
            return (
              <SortableItem key={m._id} value={m._id} className={`pgi${m.visible ? "" : " off"}`}>
                <Grip className={`im${m.kind === "video" ? " vid" : ""}${v?.vertical ? " tall" : ""}`} style={bg ? { backgroundImage: `url("${bg}")` } : undefined}>
                  <span className="ord">{i + 1}</span>
                  {m._id === coverId && <span className="cv">Capa</span>}
                  {m.kind === "imagem" && <button type="button" className="media-preview-label gallery-enlarge" aria-label={`Ampliar ${m.alt || title}`} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setImagePreview(images.findIndex((item) => item._id === m._id)); }}><Icon name="eye" />Ampliar</button>}
                  {m.kind === "video" && (
                    <ControlTooltip label="Assistir ao vídeo"><button
                      type="button"
                      className="play"
                      aria-label="Assistir ao vídeo"
                      // o quadro é a alça de arrastar: o clique no play não pode virar arraste
                      onPointerDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreview(m);
                      }}
                    >
                      <Icon name="play" size={18} />
                    </button></ControlTooltip>
                  )}
                  {!m.visible && <span className="hid">Oculta</span>}
                </Grip>
                <div className="acts">
                  <ControlTooltip label={m.visible ? "Ocultar este arquivo na loja" : "Publicar este arquivo na loja"}><button
                    type="button"
                    className={m.visible ? "on" : undefined}
                    aria-label={m.visible ? "Ocultar" : "Publicar"}
                    onClick={() => patch(m._id, { visible: !m.visible })}
                  >
                    <Icon name={m.visible ? "eye" : "eyeOff"} size={16} />
                    {m.visible ? "Publicada" : "Oculta"}
                  </button></ControlTooltip>
                  <span className="sp" />
                  <ControlTooltip label={i === 0 ? "Este arquivo já é o primeiro da galeria" : "Tornar capa e mover para o início da galeria"}><button type="button" aria-label="Tornar capa" disabled={i === 0} onClick={() => toFront(m._id)}>
                    <Icon name="star" size={16} />
                  </button></ControlTooltip>
                  {m.kind === "video" && (
                    <ControlTooltip label="Abrir o vídeo em outra aba"><a href={m.url} target="_blank" rel="noopener" aria-label="Abrir o vídeo em outra aba">
                      <Icon name="ext" size={16} />
                    </a></ControlTooltip>
                  )}
                  <ControlTooltip label="Remover este arquivo do produto"><button type="button" aria-label="Remover este arquivo do produto" onClick={() => setRemovingId(m._id)}>
                    <Icon name="trash" size={16} />
                  </button></ControlTooltip>
                </div>
                {variants.length > 2 && (
                  <div className="vsel">
                    <label className="f">Acabamento da imagem<Choice
                      label="Variante"
                      size="sm"
                      className="w-full min-w-0 text-xs"
                      value={m.variantId ?? "todas"}
                      options={variants.map(([v, l]) => [v || "todas", l] as [string, string])}
                      onChange={(vid) => patch(m._id, { variantId: vid === "todas" ? null : vid })}
                    /></label>
                  </div>
                )}
              </SortableItem>
            );
          })}
          <DropZone allowVideo onDone={addImages} />
        </SortableList>
        <p className="hint" style={{ margin: "14px 0 0" }}>
          Arraste para ordenar. Itens ocultos ficam guardados aqui e não aparecem na loja. Ligue uma foto a uma variante para ela aparecer quando o cliente escolher aquele
          acabamento. As mudanças valem ao salvar o produto.
        </p>
      </div>

      <Modal open={removingId !== null} onClose={() => setRemovingId(null)} title="Remover mídia deste produto?" description={removingMedia ? `“${removingMedia.alt || title}” deixará de aparecer neste produto ao salvar. Esta ação não exclui arquivos da biblioteca nem a fonte original.` : "Este arquivo não está mais disponível."}>
        <div className="row"><span className="sp" /><Button variant="outline" type="button" onClick={() => setRemovingId(null)}>Cancelar</Button><HoldButton className="admin-hold-action" disabled={!removingMedia} holdingLabel="Continue pressionando" completeLabel="Removido" onHoldComplete={() => { if (!removingMedia) return; onChange(media.filter((item) => item._id !== removingId)); setRemovingId(null); }}>Segure para remover</HoldButton></div>
      </Modal>
      <MediaLightbox items={images.map((image, index) => ({ id: image._id, url: image.url, name: `${title} · Foto ${index + 1}`, alt: image.alt || title }))} index={imagePreview} onIndexChange={setImagePreview} />
      <MediaPicker
        allowVideo
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(m) => {
          addImages([{ url: m.url, alt: m.alt, kind: m.kind }]);
          toast(m.kind === "video" ? "Vídeo adicionado" : "Foto adicionada");
        }}
      />
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Vídeo" wide>
        {preview && <Player v={parseVideo(preview.url)} url={preview.url} />}
      </Modal>
      <AddVideo
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        onAdd={(url) => {
          onChange([...media, fresh({ url, kind: "video", alt: title })]);
          toast("Vídeo adicionado");
        }}
      />
    </div>
  );
}

function AddVideo({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const v = url.trim() ? parseVideo(url) : null;
  const close = () => {
    setUrl("");
    onClose();
  };
  return (
    <Modal open={open} onClose={close} title="Adicionar vídeo" description="Cole o link do YouTube (vale Shorts), do Vimeo ou de um arquivo .mp4 já hospedado.">
      <div className="stack">
        <label className="f">Link do vídeo<Input className="in" autoFocus placeholder="https://youtube.com/shorts/…" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
        {url.trim() && !v && <p className="err" style={{ margin: 0 }}>Não reconheci esse link. Use um link do YouTube, do Vimeo ou de um arquivo .mp4.</p>}
        {v && (
          <div className="vprev">
            {v.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.thumb} alt="" />
            ) : (
              <span className="muted">Sem miniatura · {v.provider === "vimeo" ? "Vimeo" : "arquivo de vídeo"}</span>
            )}
            <small>{v.provider === "youtube" ? (v.vertical ? "YouTube Shorts (vertical)" : "YouTube") : v.provider === "vimeo" ? "Vimeo" : "Arquivo de vídeo"}</small>
          </div>
        )}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Button variant="outline" onClick={close}>
            Cancelar
          </Button>
          <Button
            disabled={!v}
            onClick={() => {
              onAdd(url.trim());
              close();
            }}
          >
            Adicionar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Player do painel: o mesmo que a loja usa (YouTube sem cookies, Vimeo ou o arquivo). */
function Player({ v, url }: { v: VideoInfo | null; url: string }) {
  if (!v) return <p className="err">Link de vídeo não reconhecido: {url}</p>;
  return (
    <div className={`vplayer${v.vertical ? " tall" : ""}`}>
      {v.provider === "arquivo" ? (
        <video src={v.src} controls autoPlay playsInline />
      ) : (
        <iframe src={v.src} title="Vídeo do produto" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      )}
    </div>
  );
}
