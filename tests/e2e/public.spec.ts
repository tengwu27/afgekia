import { expect, test } from "@playwright/test";

test("public visitor can navigate the real-estate intake story", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /a clearer path/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The next step stays visible." })).toBeVisible();
  await page.getByRole("link", { name: "Register as a client" }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("heading", { name: "Start with a secure account." })).toBeVisible();
});

test("booking stays separate and routes by owner and appointment type", async ({ page }) => {
  await page.goto("/book");
  await expect(page.getByRole("heading", { name: "Request time with an owner." })).toBeVisible();
  const ownerSelect = page.getByLabel("Who would you like to meet?");
  await ownerSelect.selectOption({ index: 1 });
  await expect(page.getByLabel("Appointment type")).toBeEnabled();
  await expect(page.getByLabel("Your name")).toBeVisible();
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(page.getByText("Request not sent")).toBeVisible();
});

test("removed publishing and catalog routes return normal not-found pages", async ({ page }) => {
  for (const path of ["/work", "/insights", "/services"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "That page has moved on." })).toBeVisible();
  }
});

test("private routes do not expose content anonymously", async ({ page }) => {
  for (const path of ["/request", "/portal", "/owner", "/admin"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});
