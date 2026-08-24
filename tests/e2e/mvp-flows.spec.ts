import { expect, test } from "@playwright/test";

const ownerEmail = process.env.E2E_OWNER_EMAIL;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in securely" }).click();
}

async function signOut(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function replaceTemporaryPassword(page: import("@playwright/test").Page, temporaryPassword: string, password: string) {
  await expect(page).toHaveURL(/\/account\/security/);
  await page.getByLabel("Current or temporary password").fill(temporaryPassword);
  await page.getByLabel("New password", { exact: true }).fill(password);
  await page.getByLabel("Confirm new password").fill(password);
  await page.getByRole("button", { name: "Change password" }).click();
}

test("booking submission returns a reference and an admin can confirm it", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium" || !ownerEmail || !ownerPassword, "Owner credentials and a configured test database are required.");
  const suffix = Date.now();
  const requestEmail = `booking-${suffix}@example.test`;
  const preferred = new Date(Date.now() + 172_800_000);
  const localValue = new Date(preferred.getTime() - preferred.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  await page.goto("/book");
  await page.getByLabel("What would you like help with?").selectOption({ index: 1 });
  await page.getByLabel("Your name").fill("Booking Journey");
  await page.getByLabel("Email").fill(requestEmail);
  await page.getByLabel("Preferred time").fill(localValue);
  await page.getByLabel("What is happening, and what would help?").fill("We need a clearer delivery plan and a calmer way to communicate progress.");
  await page.getByLabel(/I agree that Afgekia/).check();
  await page.waitForTimeout(3_100);
  await page.getByRole("button", { name: "Send booking request" }).click();
  await expect(page.getByText("Request received")).toBeVisible();
  await expect(page.getByText(/AF-[A-HJ-NP-Z2-9]{8}/)).toBeVisible();

  await signIn(page, ownerEmail!, ownerPassword!);
  await page.goto("/admin/bookings");
  const booking = page.locator("article", { hasText: requestEmail });
  await booking.getByLabel("Status").selectOption("confirmed");
  await booking.getByRole("button", { name: "Save" }).click();
  await expect(booking.getByText("Confirmed")).toBeVisible();
});

test("client onboarding forces a password change and project rows stay isolated", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium" || !ownerEmail || !ownerPassword, "Owner credentials and a configured test database are required.");
  const suffix = Date.now();
  const clientA = `client-a-${suffix}@example.test`;
  const clientB = `client-b-${suffix}@example.test`;
  const passwordA = `ClientA!${suffix}xY`;
  const passwordB = `ClientB!${suffix}xY`;
  const projectTitle = `Isolation project ${suffix}`;

  await signIn(page, ownerEmail!, ownerPassword!);
  await page.goto("/admin/members");
  const creator = page.locator("aside");
  await creator.getByLabel("Full name").fill("Client Alpha");
  await creator.getByLabel("Email").fill(clientA);
  await creator.getByRole("button", { name: "Create account" }).click();
  const temporaryA = (await creator.locator("code").textContent())!;
  await creator.getByLabel("Full name").fill("Client Beta");
  await creator.getByLabel("Email").fill(clientB);
  await creator.getByRole("button", { name: "Create account" }).click();
  const temporaryB = (await creator.locator("code").textContent())!;

  await page.goto("/admin/projects/new");
  await page.getByLabel("Project title").fill(projectTitle);
  await page.getByLabel("Client-facing summary").fill("A private project used to prove database-enforced cross-client isolation.");
  await page.getByLabel("Assign client").selectOption({ label: `Client Alpha · ${clientA}` });
  await page.getByRole("button", { name: "Create project" }).click();
  await page.getByLabel("Title", { exact: true }).fill("First client update");
  await page.getByLabel("Update copy").fill("This update must be visible to Alpha and invisible to Beta.");
  await page.getByRole("button", { name: "Add dated update" }).click();
  await signOut(page);

  await signIn(page, clientA, temporaryA);
  await replaceTemporaryPassword(page, temporaryA, passwordA);
  await expect(page.getByText(projectTitle)).toBeVisible();
  await page.getByText(projectTitle).click();
  await expect(page.getByText("First client update")).toBeVisible();
  await signOut(page);

  await signIn(page, clientB, temporaryB);
  await replaceTemporaryPassword(page, temporaryB, passwordB);
  await expect(page.getByText(projectTitle)).toHaveCount(0);
  await signOut(page);

  await signIn(page, ownerEmail!, ownerPassword!);
  await page.goto("/admin/members");
  const betaCard = page.locator("article", { hasText: clientB });
  await betaCard.getByRole("button", { name: "Suspend access" }).click();
  await signOut(page);
  await signIn(page, clientB, passwordB);
  await expect(page.getByText(/account is suspended/i)).toBeVisible();
});

test("public publishing is independent and staff cannot grant staff access", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium" || !ownerEmail || !ownerPassword, "Owner credentials and a configured test database are required.");
  const suffix = Date.now();
  const storyTitle = `Public-safe story ${suffix}`;
  const adminEmail = `staff-${suffix}@example.test`;
  const adminPassword = `Staff!${suffix}xY`;

  await signIn(page, ownerEmail!, ownerPassword!);
  await page.goto("/admin/portfolio");
  const storyForm = page.locator("section", { has: page.getByRole("heading", { name: "Create public-safe story" }) });
  await storyForm.getByLabel("Slug").fill(`public-safe-story-${suffix}`);
  await storyForm.getByLabel("Eyebrow").fill("Verification · Publishing");
  await storyForm.getByLabel("Title").fill(storyTitle);
  await storyForm.getByLabel("Public summary").fill("Approved copy created separately from every private project field and internal note.");
  await storyForm.getByLabel("Public-safe story copy").fill("Only this reviewed copy should appear on the public website.");
  await storyForm.getByRole("button", { name: "Create story" }).click();
  const storyCard = page.locator("article", { hasText: storyTitle });
  await storyCard.getByRole("button", { name: "Publish" }).click();
  await expect(storyCard.getByText("Published")).toBeVisible();
  await storyCard.getByRole("button", { name: "Unpublish" }).click();
  await expect(storyCard.getByText("Draft")).toBeVisible();

  await page.goto("/admin/members");
  const creator = page.locator("aside");
  await creator.getByLabel("Full name").fill("Staff Verifier");
  await creator.getByLabel("Email").fill(adminEmail);
  await creator.getByLabel("Role").selectOption("admin");
  await creator.getByRole("button", { name: "Create account" }).click();
  const temporaryAdmin = (await creator.locator("code").textContent())!;
  await signOut(page);
  await signIn(page, adminEmail, temporaryAdmin);
  await replaceTemporaryPassword(page, temporaryAdmin, adminPassword);
  await page.goto("/admin/members");
  await expect(page.getByRole("option", { name: "Staff administrator" })).toHaveCount(0);
});
