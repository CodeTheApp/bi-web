"use client";
import { useMemo } from "react";
import LightboxGrid from "@/shared/ui/kokonutui/lightbox-grid";
import "./project-gallery.css";

/** One complete gallery, without a second strip repeating the same photography. */
export function ProjectGallery({ photos, title }: { photos: Array<{ url: string; alt: string }>; title: string }) {
  const images = useMemo(() => [...new Map(photos.filter((photo) => photo.url).map((photo) => [photo.url, photo])).values()].map((photo) => ({ src: photo.url, alt: photo.alt || title, width: 1600, height: 1100, caption: photo.alt || title })), [photos, title]);
  if (!images.length) return null;
  return <section className="project-photo-gallery" aria-labelledby="project-gallery-title"><div className="wrap"><div className="project-gallery-head"><div><span className="label">Galeria do projeto</span><h2 className="h-m" id="project-gallery-title">Luz em cada detalhe.</h2></div><p>Selecione uma imagem para ver inteira. Use as setas para navegar.</p></div><LightboxGrid className="project-gallery-grid" images={images} /></div></section>;
}
