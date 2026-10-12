# TODO (Next.js フルスタック)

Next.js 16 (App Router) + Prisma + PostgreSQL + Zod + shadcn/ui + Tailwind CSS 4。パッケージマネージャは pnpm。

## 機能
- TODO の作成・編集・削除・完了切り替え(`useOptimistic` による楽観的更新)
- 優先度(低/中/高)、期限(期限切れ表示)、メモ
- 検索・状態/優先度での絞り込み・並び替え(すべて URL クエリが状態)
- 統計ページ(件数・達成率・優先度内訳・直近7日の完了数)
- ダークモード、トースト通知、REST API(`/api/todos`)

## 起動
```bash
pnpm install
cp .env.example .env
pnpm db:up           # docker compose で PostgreSQL を起動
pnpm exec prisma migrate dev
pnpm dev
```

| コマンド | 内容 |
|---|---|
| `pnpm test` | ユニットテスト(Vitest。DB 不要) |
| `TEST_DATABASE_URL=... pnpm test` | 上記に加え Repository 契約テストを実 DB(専用・全削除される)でも実行 |
| `pnpm e2e` | E2E(Playwright。要 `pnpm build` と DB) |
| `pnpm verify` | lint + typecheck + test + build |

## 構成と依存方向
```
src/app (ページ / Server Actions / Route Handlers / UI)
  └→ src/server/todo/service        ユースケース・入力検証・完了日時などのルール
        └→ src/domain               型・Zodスキーマ・Repository interface・エラー
src/server/todo/prisma-repository ─→ domain   (interface を実装。service は Prisma を知らない)
src/server/todo/index.ts          Composition root(ここだけで具象を注入)
```
- 検証スキーマ(Zod)は domain に 1 つだけ置き、フォーム(react-hook-form)とサーバーで共有
- service は時計(clock)と repository を注入でき、in-memory repository で DB なしにユニットテスト
- 「今」に依存する画面は `connection()` でリクエスト時に描画(Cache Components 対応)

詳しい設計と技術選定の理由は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照。

## Codespaces など転送ホストで開発する場合
`DEV_ALLOWED_HOSTS` に正確なホスト名(例: `my-codespace-3000.app.github.dev`、カンマ区切り)を設定します。Codespaces では `CODESPACE_NAME` から自動導出されます。開発サーバー時のみ有効です。

## デプロイ(Vercel など)
1. Neon / Supabase 等の PostgreSQL を用意し、`DATABASE_URL` を環境変数に設定
2. ビルドコマンド: `pnpm exec prisma migrate deploy && pnpm build`
3. `next.config.ts` の開発用許可ホスト(`allowedOrigins` / `allowedDevOrigins`)は開発サーバー時のみ有効で、本番ビルドでは追加されません(設定不要。本番ドメインがホストと一致していれば Server Actions は通ります)
