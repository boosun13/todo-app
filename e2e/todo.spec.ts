import { expect, test } from "@playwright/test";

// 実行ごとに一意なタイトルにして、既存データと干渉しないようにする
const title = `E2E-${Date.now()}`;

test("作成 → 完了 → 検索 → 編集 → 削除", async ({ page }) => {
  await page.goto("/");

  // 検証エラー(空タイトル)
  await page.getByRole("button", { name: "新規作成" }).click();
  await page.getByRole("button", { name: "追加", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("タイトルを入力してください");

  // 作成(優先度: 高 / 期限あり)
  await page.getByLabel("タイトル").fill(title);
  await page.getByLabel("優先度", { exact: true }).click();
  await page.getByRole("option", { name: "高" }).click();
  await page.getByLabel("期限").fill("2020-01-01");
  await page.getByRole("button", { name: "追加", exact: true }).click();

  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row).toBeVisible();
  await expect(row).toContainText("優先度 高");
  await expect(row).toContainText("期限切れ");

  // 完了にして、リロード後も保持される
  // 保存(Server Action の応答)完了を待ってからリロードする
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await row.getByRole("checkbox").click();
  await expect(row.getByRole("checkbox")).toBeChecked();
  await saved;
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: title }).getByRole("checkbox")).toBeChecked();

  // 検索は URL に反映される
  await page.getByRole("searchbox", { name: "検索" }).fill(title);
  await expect(page).toHaveURL(new RegExp(`q=${title}`));
  await expect(page.getByRole("listitem")).toHaveCount(1);

  // 編集
  await page.getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(/\/todos\/.+/);
  await page.getByLabel("タイトル").fill(`${title}-edited`);
  const updated = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await page.getByRole("button", { name: "保存" }).click();
  await updated;
  await expect(page.getByText("更新")).toBeVisible();
  await expect(page.getByRole("button", { name: "保存" })).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel("タイトル")).toHaveValue(`${title}-edited`);

  // 削除(確認ダイアログ)
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "削除する" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(0);
});

test("統計ページが表示できる", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "統計" }).click();
  await expect(page.getByRole("heading", { name: "統計" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "達成率" })).toBeVisible();
});

test("存在しない TODO は Not Found 画面", async ({ page }) => {
  await page.goto("/todos/does-not-exist");
  await expect(page.getByRole("heading", { name: "ページが見つかりません" })).toBeVisible();
});

test("完了済みの一括片付けは確認ダイアログを経る", async ({ page }) => {
  const done = `E2E-done-${Date.now()}`;
  await page.goto("/");
  await page.getByRole("button", { name: "新規作成" }).click();
  await page.getByLabel("タイトル").fill(done);
  await page.getByRole("button", { name: "追加", exact: true }).click();
  const row = page.getByRole("listitem").filter({ hasText: done });
  await expect(row).toBeVisible();
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await row.getByRole("checkbox").click();
  await expect(row.getByRole("checkbox")).toBeChecked();
  await saved;

  // キャンセルでは何も消えない
  await page.getByRole("button", { name: "完了済みを片付ける" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("統計の完了実績には残ります");
  await dialog.getByRole("button", { name: "キャンセル" }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();

  // 確定で完了済みが一覧から消え、フォーカスは body に落ちない
  await page.getByRole("button", { name: "完了済みを片付ける" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "片付ける", exact: true }).click();
  await expect(page.getByRole("listitem").filter({ hasText: done })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "新規作成" })).toBeFocused();
});
