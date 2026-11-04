/** @type {import('next').NextConfig} */
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
	? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
	: null;
const connectSources = ["'self'", "https://*.supabase.co"];
if (supabaseOrigin) connectSources.push(supabaseOrigin);
const contentSecurityPolicy = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"frame-ancestors 'none'",
	"form-action 'self'",
	"script-src 'self' 'unsafe-inline'",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' https://fonts.gstatic.com data:",
	`connect-src ${connectSources.join(" ")}`,
	"img-src 'self' data: blob: https:",
	"frame-src 'self'",
].join("; ");

module.exports = {
	reactStrictMode: true,
	distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
	async headers() {
		return [{
			source: "/:path*",
			headers: [
				{ key: "X-Content-Type-Options", value: "nosniff" },
				{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
				{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
				{ key: "X-Frame-Options", value: "DENY" },
				{ key: process.env.NODE_ENV === "production" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
				...(process.env.SITE_URL?.startsWith("https://") ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
			],
		}, {
			source: "/images/products/enhanced/:path*",
			headers: [
				{ key: "Access-Control-Allow-Origin", value: "*" },
			],
		}];
	},
};
