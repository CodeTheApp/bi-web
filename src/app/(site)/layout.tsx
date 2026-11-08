import "@/styles/site.css";
import { Footer, WhatsAppButton } from "@/components/site/Footer";
import { SmoothScroll } from "@/components/site/motion/SmoothScroll";
import { Nav } from "@/components/site/Nav";
import { getContent } from "@/server/content";

// Marca, antes da pintura, que há JavaScript e se a pessoa pediu menos movimento.
const boot = `(function(){var d=document.documentElement;d.classList.remove('no-js');try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('reduced')}catch(e){}})()`;

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { settings, projects } = await getContent();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <Nav instagram={settings.instagram} whatsapp={settings.whatsapp} />
      {children}
      <Footer settings={settings} projects={projects} />
      <WhatsAppButton settings={settings} />
      <SmoothScroll />
    </>
  );
}
