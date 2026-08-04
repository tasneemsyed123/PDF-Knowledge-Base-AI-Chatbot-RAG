const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api').origin;
  } catch {
    return 'http://localhost:4000';
  }
})();

// CSP is only applied in production builds - Next.js dev mode (Fast Refresh/HMR)
// relies on inline/eval'd scripts that a strict CSP would break, and dev
// builds aren't a real attack surface anyway.
const isProd = process.env.NODE_ENV === 'production';

const productionCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // Tailwind's compiled CSS is external, but Next.js injects a few inline style tags
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' ${API_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(isProd ? [{ key: 'Content-Security-Policy', value: productionCsp }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
