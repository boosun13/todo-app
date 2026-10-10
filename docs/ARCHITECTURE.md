# アーキテクチャと技術選定

ここに書いてあるのは「何を選んだか」ではなく「何と比べて、なぜそれにしたか」。
`next` / `react` / `tailwindcss` / `eslint` / `typescript` は `create-next-app` の既定をそのまま採用しており、比較検討はしていない。

## 1. パッケージの選定理由

### データ層
| 領域 | 選択肢 | 採用 | 判断 |
|---|---|---|---|
| ORM | **Prisma** / Drizzle / Kysely / 生SQL | Prisma | スキーマ1ファイルから型とマイグレーションが出て学習コストが低く、採用実績も多い。Drizzle は軽くて速いが、この規模では差が出ない。 |
| DB | SQLite / **PostgreSQL** / MySQL | PostgreSQL | Vercel のサーバーレスではファイル DB に保存できない。Neon・Supabase などホスティングが豊富。 |
| Prisma のバージョン | 6 / 7 | **6** | 7 は Driver Adapter が必須になり構成が変わる。実績のある 6 を選んだ。 |

### バリデーション・フォーム
| 領域 | 選択肢 | 採用 | 判断 |
|---|---|---|---|
| スキーマ検証 | **Zod** / Valibot / ArkType | Zod | 事実上の標準で周辺ライブラリが揃う。Valibot はバンドルが小さいが、主戦場がサーバー側なので効果が薄い。 |
| Zod のバージョン | 3 / 4 | **3.25** | `@hookform/resolvers` との組み合わせが安定。4 への移行は後でも可能。 |
| フォーム | **react-hook-form** / `useActionState` のみ / TanStack Form | react-hook-form + `@hookform/resolvers` | クライアント検証とサーバーが返すフィールドエラー表示を両立でき、domain の Zod スキーマをそのまま再利用できる。 |

### UI
| 領域 | 選択肢 | 採用 | 判断 |
|---|---|---|---|
| コンポーネント | **shadcn/ui** / MUI / Chakra / Mantine | shadcn/ui | コードをリポジトリに取り込む方式で、ライブラリ更新に縛られない。Tailwind と相性が良く現在の主流。 |
| プリミティブ | Radix / **Base UI** | `@base-ui/react` | 現在の shadcn の既定。アクセシビリティ対応済み。 |
| アイコン | **lucide-react** / heroicons | lucide-react | shadcn の既定。ツリーシェイクされる。 |
| トースト | **sonner** / react-hot-toast | sonner | shadcn 公式がラップしている。 |
| ダークモード | **next-themes** / 自前実装 | next-themes | ちらつき(FOUC)対策を自前でやると面倒。 |
| クラス結合 | — | `clsx` + `tailwind-merge` | shadcn 標準の `cn` の中身。 |
| 日付 | **date-fns** / dayjs / Temporal | date-fns | ツリーシェイクでき `ja` ロケールがある。 |

### テスト・品質・ツール
| 領域 | 選択肢 | 採用 | 判断 |
|---|---|---|---|
| ユニットテスト | **Vitest** / Jest | Vitest | TS・ESM が設定なしで動き速い。 |
| E2E | **Playwright** / Cypress | Playwright | 複数ブラウザ、並列、CI での扱いやすさ。 |
| CI | GitHub Actions | 採用 | リポジトリが GitHub 上にあるため。 |
| パッケージ管理 | npm / yarn / **pnpm** | pnpm | 高速、厳格な依存解決(幽霊依存の防止)、依存のビルドスクリプトを既定で止める。 |

### 補助
- `server-only`: サーバー専用コードがクライアントに混ざるとビルドエラーにする。
- `tw-animate-css` / `class-variance-authority` / `shadcn`: shadcn が要求する依存。選定したというより付随するもの。

### あえて入れなかったもの
- **TanStack Query / tRPC**: RSC と Server Actions があるため、クライアント側のキャッシュ層・RPC 層は不要。
- **認証(Auth.js など)**: 範囲外として見送り。
- **グラフライブラリ**: 統計は棒グラフ程度なので CSS のみで描画。依存を増やさない。

### 注意した点
- shadcn のコードが、素性の不明な npm パッケージ `cn` を import していたため、依存から外して `clsx` + `tailwind-merge` の自前 `cn` に置き換えた。
- pnpm のビルドスクリプトは `allowBuilds` で必要な 4 つ(`@prisma/client` / `@prisma/engines` / `prisma` / `unrs-resolver`)だけ許可している。

## 2. ディレクトリ構成

```
src/
├─ domain/            中心。何にも依存しない
├─ server/todo/       ユースケースと永続化
├─ app/               画面・入口(Next.js のルーティング)
├─ components/        汎用UI(shadcn + 共通部品)
└─ lib/               小さな汎用関数
prisma/  e2e/  .github/  compose.yaml  docs/
```

### 依存の向き(一方向)
```
app → server/service → domain
server/prisma-repository → domain
```
逆向きの import は作らない。

### 各ディレクトリの役割
- `domain/`: 型、Zod スキーマ、`TodoRepository` interface、エラー、純粋関数(`isOverdue` / `bucketByDay`)。DB も Next.js も知らない。
- `server/todo/`
  - `service.ts`: 入力検証と、完了日時の記録などのルール。
  - `prisma-repository.ts`: interface の Prisma 実装。
  - `in-memory-repository.ts`: テスト用実装。
  - `index.ts`: 具象を service に注入する唯一の場所(Composition root)。
- `app/`: Next.js の規約に従う部分。
  - `page.tsx` / `layout.tsx` / `route.ts` / `error.tsx` / `not-found.tsx`: 特殊ファイル。
  - `_actions/`: Server Actions。service を呼び、結果を `ActionResult` に変換する。
  - `_components/`: このアプリ専用の UI(`_` 付きはルーティング対象外)。
  - `api/`: REST。Server Actions と同じ service を共有する。
  - `todos/[id]/`, `stats/`: ページ。
- `components/`: `ui/` は shadcn 生成物(手を入れない前提)。それ以外は特定機能に属さない共通部品。
- `lib/`: UI 側のフォーマットや URL クエリ変換。ドメイン知識は持たせない。
- テストの置き場所: ユニットは対象の隣(`*.test.ts`)、E2E は `e2e/`。

### 取り決め
1. 検証スキーマ(Zod)は domain に 1 つだけ置き、フォームとサーバーで共有する(二重定義によるずれを防ぐ)。
2. Prisma を import してよいのは `prisma-repository.ts` と `db.ts` のみ。
3. service は入力を `unknown` で受ける(Action / API の境界の型を信用しない)。
4. 検索・絞り込み・並び替えの状態は URL に持つ(single source of truth)。
5. 「今」に依存する画面は `connection()` でリクエスト時に描画する(Cache Components 対応)。

### 割り切り
- 機能が 1 つなのでレイヤー単位で分けている。機能が増えたら `features/<機能>/{domain,server,components}` の機能単位へ組み替える。
- `server/` は将来の機能追加を見込んだ名前だが、現状は `todo/` のみ。
- 存在しない TODO(`/todos/<不正なid>`)は Not Found 画面を表示するが、ストリーミング描画の仕様で HTTP ステータスは 200。
