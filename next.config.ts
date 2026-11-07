import type { NextConfig } from "next";

// Imagens do S3/CloudFront (ex.: https://dxxxx.cloudfront.net)
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  ? new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Modelo de cache "clássico" (unstable_cache + revalidateTag), mais previsível no AWS Amplify.
  // Para migrar para Cache Components no futuro: node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md
  cacheComponents: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: mediaHost ? [{ protocol: "https", hostname: mediaHost }] : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
