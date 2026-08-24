import { expect, test } from "@playwright/test";

const clientEmail = process.env.E2E_CLIENT_EMAIL;
const clientPassword = process.env.E2E_CLIENT_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test("client can enter the portal but not administration", async ({ page }) => {
  test.skip(!clientEmail || !clientPassword, "E2E client credentials are required.");
  await page.goto("/login"); await page.getByLabel("Email").fill(clientEmail!); await page.getByLabel("Password").fill(clientPassword!); await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/portal/); await page.goto("/admin"); await expect(page).toHaveURL(/\/portal/);
});

test("admin can process bookings and is denied owner-only staff creation", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "E2E admin credentials are required.");
  await page.goto("/login"); await page.getByLabel("Email").fill(adminEmail!); await page.getByLabel("Password").fill(adminPassword!); await page.getByRole("button", { name: "Sign in securely" }).click();
  await page.goto("/admin/bookings"); await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible();
  await page.goto("/admin/members"); await expect(page.getByRole("option", { name: "Staff administrator" })).toHaveCount(0);
});
