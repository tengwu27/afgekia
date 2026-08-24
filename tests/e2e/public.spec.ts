import { expect, test } from "@playwright/test";

test("public visitor can navigate the core story", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /less scramble/i })).toBeVisible();
  await page.getByRole("link", { name: "See recent work" }).click();
  await expect(page).toHaveURL(/\/work$/);
  await page.getByRole("link", { name: /calmer client onboarding/i }).click();
  await expect(page.getByRole("heading", { name: "A calmer client onboarding system" })).toBeVisible();
});

test("booking form exposes accessible fields and blocks an incomplete request", async ({ page }) => {
  await page.goto("/book");
  await expect(page.getByRole("heading", { name: "Tell me what needs moving." })).toBeVisible();
  await expect(page.getByLabel("What would you like help with?")).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeVisible();
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(page.getByText("Request not sent")).toBeVisible();
});

test("private routes do not expose content anonymously", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?next=/);
});
