import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/signup"],
      // Behind auth and per-user — nothing here is meaningful to a crawler,
      // and most of it 302s to /login for an unauthenticated visitor anyway.
      disallow: ["/dashboard", "/projects", "/api"],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
