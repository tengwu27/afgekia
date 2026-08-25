import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;
const ownerDisplayName = process.env.E2E_OWNER_DISPLAY_NAME;
const secondOwnerEmail = process.env.E2E_SECOND_OWNER_EMAIL;
const secondOwnerPassword = process.env.E2E_SECOND_OWNER_PASSWORD;
const clientEmail = process.env.E2E_CLIENT_EMAIL;
const clientPassword = process.env.E2E_CLIENT_PASSWORD;

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in securely" }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function registerClient(page: Page, name: string, email: string, password: string) {
  await page.goto("/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByLabel(/I agree that Afgekia/).check();
  await page.waitForTimeout(3_100);
  await page.getByRole("button", { name: "Request an account" }).click();
  await expect(page.getByText("Registration received")).toBeVisible();
}

test("registration, activation, request approval, isolation, and exact-email membership", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium" || !adminEmail || !adminPassword || !ownerEmail || !ownerPassword || !ownerDisplayName,
    "Admin, owner, and owner display-name test variables are required.",
  );
  const suffix = Date.now();
  const clientA = `requester-${suffix}@example.test`;
  const clientB = `other-${suffix}@example.test`;
  const passwordA = `ClientA!${suffix}xY`;
  const passwordB = `ClientB!${suffix}xY`;
  const address = `${suffix} Cedar Ave`;
  const nickname = "The Alpha Sellers";
  const projectTitle = `${address} · ${nickname}`;

  await registerClient(page, "Requesting Client", clientA, passwordA);
  await registerClient(page, "Other Client", clientB, passwordB);

  await signIn(page, adminEmail!, adminPassword!);
  await page.goto("/admin/registrations");
  for (const email of [clientA, clientB]) {
    const registration = page.locator("article", { hasText: email });
    await registration.getByRole("button", { name: "Activate client" }).click();
    await expect(registration.getByText("active", { exact: true })).toBeVisible();
  }
  await signOut(page);

  await signIn(page, clientA, passwordA);
  await page.goto("/request");
  await page.getByLabel("Project owner").selectOption({ label: ownerDisplayName! });
  await page.getByLabel("Short property address").fill(address);
  await page.getByLabel("Seller nickname").fill(nickname);
  await page.getByLabel("What support do you need?").fill("Prepare this property for market and keep both sellers aligned on the approved listing plan.");
  await page.getByLabel(/I agree that Afgekia/).check();
  await page.waitForTimeout(3_100);
  await page.getByRole("button", { name: "Send listing request" }).click();
  await expect(page.getByText("Request sent")).toBeVisible();
  await signOut(page);

  await signIn(page, ownerEmail!, ownerPassword!);
  await page.goto("/owner/requests");
  const request = page.locator("article", { hasText: address });
  await request.getByRole("button", { name: "Approve and create project" }).click();
  await page.goto("/owner/projects");
  await expect(page.getByRole("heading", { name: "Portfolio timeline" })).toBeVisible();
  await page.getByRole("tab", { name: "Kanban" }).click();
  await expect(page.getByRole("heading", { name: "Not started" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible();
  await page.getByRole("tab", { name: "Timeline" }).click();
  await page.getByRole("button", { name: /Initial assessment/ }).click();
  await page.getByLabel("Planned start").fill("2026-09-01");
  await page.getByLabel("Planned end").fill("2026-09-03");
  await page.getByRole("button", { name: "Save stage" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Initial assessment.*Sep 1, 2026 through Sep 3, 2026/ })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(address) }).click();
  await expect(page.getByRole("heading", { name: projectTitle })).toBeVisible();
  await signOut(page);

  await signIn(page, clientB, passwordB);
  await expect(page.getByText(projectTitle)).toHaveCount(0);
  await signOut(page);

  await signIn(page, ownerEmail!, ownerPassword!);
  await page.goto("/owner/projects");
  await page.getByRole("link", { name: new RegExp(address) }).click();
  await page.getByLabel("Add a registered client by email").fill(clientB);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText("Client assigned.")).toBeVisible();
  await signOut(page);

  await signIn(page, clientB, passwordB);
  await expect(page.getByText(projectTitle)).toBeVisible();
});

test("public booking is routed to the selected owner for processing", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium" || !ownerEmail || !ownerPassword || !ownerDisplayName, "Owner test variables are required.");
  const suffix = Date.now();
  const requestEmail = `booking-${suffix}@example.test`;
  const preferred = new Date(Date.now() + 172_800_000);
  const localValue = new Date(preferred.getTime() - preferred.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  await page.goto("/book");
  await page.getByLabel("Who would you like to meet?").selectOption({ label: ownerDisplayName! });
  await page.getByLabel("Appointment type").selectOption({ index: 1 });
  await page.getByLabel("Your name").fill("Booking Journey");
  await page.getByLabel("Email").fill(requestEmail);
  await page.getByLabel("Preferred time").fill(localValue);
  await page.getByLabel("What is happening, and what would help?").fill("We need an initial conversation about preparing a real-estate listing for market.");
  await page.getByLabel(/I agree that Afgekia/).check();
  await page.waitForTimeout(3_100);
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(page.getByText("Request received")).toBeVisible();

  await signIn(page, ownerEmail!, ownerPassword!);
  await page.goto("/owner/bookings");
  const booking = page.locator("article", { hasText: requestEmail });
  await booking.getByLabel("Status").selectOption("confirmed");
  await booking.getByRole("button", { name: "Save" }).click();
  await expect(booking.getByText("Confirmed")).toBeVisible();
});

test("a second owner cannot see another owner's request", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium" || !clientEmail || !clientPassword || !ownerDisplayName || !secondOwnerEmail || !secondOwnerPassword,
    "Client, selected-owner, and second-owner credentials are required.",
  );
  const marker = `${Date.now()} Isolation Way`;
  await signIn(page, clientEmail!, clientPassword!);
  await page.goto("/request");
  await page.getByLabel("Project owner").selectOption({ label: ownerDisplayName! });
  await page.getByLabel("Short property address").fill(marker);
  await page.getByLabel("Seller nickname").fill("Isolation Seller");
  await page.getByLabel("What support do you need?").fill("This request verifies that an owner cannot read a listing request assigned to another owner.");
  await page.getByLabel(/I agree that Afgekia/).check();
  await page.waitForTimeout(3_100);
  await page.getByRole("button", { name: "Send listing request" }).click();
  await expect(page.getByText("Request sent")).toBeVisible();
  await signOut(page);
  await signIn(page, secondOwnerEmail!, secondOwnerPassword!);
  await page.goto("/owner/requests");
  await expect(page.getByText(marker)).toHaveCount(0);
});
