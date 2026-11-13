import { brandOf, companyOf } from "../model/settings";
import type { Settings } from "../model/schema";

/** Shared site defaults; product and project pages retain their own social artwork. */
export function siteMetadata(settings: Settings) {
  const company = companyOf(settings);
  const brand = brandOf(settings);
  return {
    title: {
      default: settings.seoTitle,
      template: `%s — ${company.commercialName}`,
    },
    description: settings.seoDescription || undefined,
    openGraph: {
      title: settings.seoTitle,
      description: settings.seoDescription || undefined,
      type: "website" as const,
      locale: "pt_BR",
      siteName: company.commercialName,
      images: [brand.ogImage],
    },
    icons: { icon: brand.favicon },
  };
}
