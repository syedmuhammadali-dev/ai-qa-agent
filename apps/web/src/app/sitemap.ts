import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Only the public, unauthenticated routes — everything under the dashboard
 * is behind auth and per-user, so it's not something a crawler should index. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: appUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${appUrl}/login`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${appUrl}/signup`, changeFrequency: "yearly", priority: 0.8 },
  ];
}
