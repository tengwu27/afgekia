import { expect, test, type Page } from "@playwright/test";

const clientEmail = process.env.E2E_CLIENT_EMAIL;
const clientPassword = process.env.E2E_CLIENT_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in securely" }).click();
}

test("client dashboard and sign-out controls persist outside the portal", async ({ page }) => {
  test.skip(!clientEmail || !clientPassword, "E2E client credentials are required.");
  await signIn(page, clientEmail!, clientPassword!);
  await expect(page).toHaveURL(/\/portal/);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/portal");
  await expect(page.getByRole("link", { name: "Client login" })).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("administrator sees accounts only and cannot enter operational workspaces", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "E2E admin credentials are required.");
  await signIn(page, adminEmail!, adminPassword!);
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin");
  await page.goto("/owner");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("link", { name: "Registrations" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Owners" })).toBeVisible();
});

test("owner receives the operational dashboard and AI assistance", async ({ page }) => {
  test.skip(!ownerEmail || !ownerPassword, "E2E owner credentials are required.");
  await signIn(page, ownerEmail!, ownerPassword!);
  await expect(page).toHaveURL(/\/owner/);
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/owner");
  await expect(page.getByRole("link", { name: "Requests" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Projects" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open project assistant" })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/owner$/);
});
