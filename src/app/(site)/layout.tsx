import "@/styles/site.css";
import "@/styles/shop.css";
import { Footer, WhatsAppButton } from "@/widgets/site-footer";
import { SmoothScroll } from "@/shared/ui/motion/SmoothScroll";
import { Nav } from "@/widgets/site-header";
import { ShopLayers, ShopProvider } from "@/features/shopping";
import { SiteAnalyticsTracker } from "@/features/site-analytics/ui/SiteAnalyticsTracker";
import { getContent } from "@/server/content";

// Marca, antes da pintura, que há JavaScript e se a pessoa pediu menos movimento.
const boot = `(function(){var d=document.documentElement;d.classList.remove('no-js');try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('reduced')}catch(e){}})()`;

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const { settings, projects } = await getContent();
  return (
    <ShopProvider storePreferences={settings.store}>
      <script dangerouslySetInnerHTML={{ __html: boot }} />
      <Nav settings={settings} />
      {children}
      <Footer settings={settings} projects={projects} />
      <WhatsAppButton settings={settings} />
      <ShopLayers />
      <SmoothScroll />
      <SiteAnalyticsTracker />
    </ShopProvider>
  );
}
