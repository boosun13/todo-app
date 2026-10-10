# TODO (Next.js フルスタック)

Next.js (App Router) + Prisma(SQLite) + Zod + Vitest。

## 起動
```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```
`npm test` / `npm run typecheck` / `npm run lint` / `npm run build`

## 構成と依存方向
```
app (UI / Server Actions / Route Handlers)
  └→ server/todo/service      ユースケース・入力検証
        └→ domain             型・Zodスキーマ・Repository interface・エラー
server/todo/prisma-repository ─→ domain  (interface を実装。service は Prisma を知らない)
server/todo/index.ts          Composition root(ここだけで具象を注入)
```
- UI は Server Actions(フォームのみで動作=プログレッシブエンハンスメント)、外部連携用に REST API も同じ service を共有
- フィルタは URL(`?filter=`) が状態の single source of truth
- service は in-memory repository でユニットテスト(DB 不要)
