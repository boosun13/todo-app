import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      // Codespaces のポート転送では x-forwarded-host が *.app.github.dev になる一方、
      // ブラウザの Origin は localhost:3000 や *.app.github.dev になり得る。
      // CSRF チェックで弾かれないよう両方を許可する
      allowedOrigins: ["localhost:3000", "*.app.github.dev"],
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
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
