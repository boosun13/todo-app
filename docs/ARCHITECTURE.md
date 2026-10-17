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

## 3. 暦日とアーカイブの境界
- `server/config.ts` で `APP_TIME_ZONE`（既定 `Asia/Tokyo`）を読み取り、IANA 名を検証する。Composition root が service の `options.timeZone` として渡す。domain は環境変数を読まない。
- 期限は DB の `DATE` / UTC 0 時の Date のまま。瞬間から暦日への変換は `calendarDayIn(instant, timeZone)`、日付キーへの変換は `dateKeyIn(instant, timeZone)` が `Intl.DateTimeFormat` で行う。
- service の `today()` は clock と timeZone から暦日を返す。画面では `isOverdue(todo, todoService.today())` として使う。Repository の `statsSnapshot(today, since)` も同じ暦日の境界で `dueDate < today` を数える。
- 統計は 7 日分の暦日キーを作り、完了した瞬間をアプリ TZ の日付キーへ変換して振り分ける。DB の取得下限は `today - 7日` の瞬間とし、正の UTC オフセットでも初日の現地 0 時を含む余裕を持たせ、範囲外は domain で除外する。
- 一括クリアは `archiveCompleted(clock())` に委譲する。`completed = true AND archivedAt IS NULL` の行だけを更新し、二重アーカイブしない。単件削除は物理削除のまま。
- Repository の一覧・詳細・更新・削除はすべて `archivedAt IS NULL` を条件にする。Prisma の更新・削除は条件付きで実行し、`P2025` を null / false に変換する。
- 統計は RepeatableRead の同一トランザクションで取得する。通常の件数は未アーカイブだけを対象にし、`counts.archived` はアーカイブ済み完了数を返す。日別完了数はアーカイブ済みも含め、達成率は `(completed + archived) / (total + archived)`（分母 0 は 0）。
- `archivedAt, completed, createdAt` の複合インデックスは未アーカイブの状態別取得に、`completedAt` のインデックスは期間内の完了実績取得に使う。
