import type { NextConfig } from "next";

// Security headers applied to every route
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block the page from being embedded in iframes on other origins
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Tell browsers to use HTTPS for all future requests (1 year)
  // Only meaningful when actually served over HTTPS
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Restrict what information is sent in the Referer header
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny access to sensitive browser features that this app doesn't need
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;
