const siteUrl = process.env.SITE_URL || "http://localhost:3000";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/checkout", "/account", "/login", "/reset-password"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
