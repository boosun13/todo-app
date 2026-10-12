import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

/**
 * 開発時のみ許可する正確なホスト名(カンマ区切り)。
 * 例: DEV_ALLOWED_HOSTS=my-codespace-3000.app.github.dev
 * Codespaces では CODESPACE_NAME と転送ドメインから自動導出する(ワイルドカードは使わない)。
 */
const devHosts = (): string[] => {
  const explicit = (process.env.DEV_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const { CODESPACE_NAME, GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN } = process.env;
  const codespace =
    CODESPACE_NAME && GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
      ? [`${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`]
      : [];
  return [...new Set([...explicit, ...codespace])];
};

const config = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  const hosts = isDev ? devHosts() : [];
  return {
    // Server Actions の CSRF チェック(Origin と x-forwarded-host の照合)用。本番では何も追加しない
    experimental: {
      serverActions: { allowedOrigins: isDev ? ["localhost:3000", ...hosts] : [] },
    },
    // dev サーバーへのクロスオリジン要求の許可(ホスト名のみ)
    ...(isDev && hosts.length > 0 && { allowedDevOrigins: hosts }),
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
};

export default config;
