import { test, expect, type Page } from "@playwright/test";

async function loadSample(page: Page) {
  await page.getByRole("button", { name: "載入樣本", exact: true }).click();
  await page.getByRole("banner").getByRole("button", { name: /台大資工 · 前段學業/ }).click();
}
async function review(page: Page) {
  await page.getByRole("button", { name: "下一步：選擇委員", exact: true }).click();
  await expect(page.getByRole("heading", { name: "選擇審查人格" })).toBeVisible();
  await page.getByRole("button", { name: "送交審查", exact: true }).click();
  await expect(page.getByRole("heading", { name: "個別審查", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "召開招生委員會" }).click();
  await expect(page.getByRole("heading", { name: "招生委員會" })).toBeVisible();
  await expect(page.getByText("模擬裁決", { exact: true })).toBeVisible();
}
test("four-step review, sensitivity, session restoration and privacy reset", async ({ page }, info) => {
  const errors: string[]=[];page.on("pageerror", e=>errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText(/未經院校校準/)).toBeVisible();
  await loadSample(page);
  await page.reload();
  await expect(page.getByPlaceholder("請填虛構暱稱")).toHaveValue("林子安");
  await review(page);
  await page.getByRole("button", { name: "學業敏感度", exact: true }).click();
  await expect(page.getByText(/GPA/).first()).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("review.png"), fullPage: true });
  await page.getByRole("button", { name: "清除本案資料" }).click();
  await expect(page.getByPlaceholder("請填虛構暱稱")).toHaveValue("");
  await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem("grad-board-session-v3"))).toBeNull();
  await page.reload();await expect(page.getByPlaceholder("請填虛構暱稱")).toHaveValue("");
  expect(errors).toEqual([]);
});
test("quota failures allow the full review and disclose that the draft is unsaved", async ({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(()=>{Object.defineProperty(Storage.prototype,"setItem",{value(){throw new DOMException("quota", "QuotaExceededError");}});});
  await page.goto("/");await loadSample(page);
  await expect(page.getByRole("status").filter({hasText:"瀏覽器無法儲存"})).toBeVisible();
  await review(page);expect(errors).toEqual([]);
});
test("legacy local data is retired and corrupted session JSON cannot crash hydration", async ({page})=>{
  await page.addInitScript(()=>{localStorage.setItem("grad-board-case-v2",JSON.stringify({state:{profile:{name:"old fictional case"}}}));sessionStorage.setItem("grad-board-session-v3","{broken");});
  await page.goto("/");await expect(page.getByPlaceholder("請填虛構暱稱")).toHaveValue("");
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem("grad-board-case-v2"))).toBeNull();
  await page.getByRole("button", { name: "載入樣本", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("banner").getByRole("button", { name: /台大資工 · 前段學業/ })).toBeVisible();
});
