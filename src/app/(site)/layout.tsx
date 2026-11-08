import "@/styles/site.css";
import { Footer, WhatsAppButton } from "@/components/site/Footer";
import { SmoothScroll } from "@/components/site/motion/SmoothScroll";
import { Nav } from "@/components/site/Nav";
import { getContent } from "@/server/content";

// Esconde o preloader antes da pintura quando já foi visto nesta sessão (ou com movimento reduzido).
const boot = `(function(){var d=document.documentElement;d.classList.remove('no-js');try{if(sessionStorage.getItem('bi-pre')||matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('pre-seen')}catch(e){}})()`;

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { settings, projects } = await getContent();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <div className="pre" aria-hidden="true">
        <div className="sym">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/bi-claro.svg" alt="" />
        </div>
        <span className="tag">Brasília Iluminação · {new Date().getFullYear()}</span>
        <span className="count">0</span>
      </div>
      <div className="cur cur-dot" aria-hidden="true" />
      <div className="cur cur-ring" aria-hidden="true" />
      <Nav instagram={settings.instagram} whatsapp={settings.whatsapp} />
      {children}
      <Footer settings={settings} projects={projects} />
      <WhatsAppButton settings={settings} />
      <SmoothScroll />
    </>
  );
}
