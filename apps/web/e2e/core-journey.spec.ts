import { expect, test, type Page } from "@playwright/test";

const email = process.env.FLOWMONEY_E2E_EMAIL;
const password = process.env.FLOWMONEY_E2E_PASSWORD;
const signupEmail = process.env.FLOWMONEY_E2E_SIGNUP_EMAIL;
const signupPassword = process.env.FLOWMONEY_E2E_SIGNUP_PASSWORD;
const signupCode = process.env.FLOWMONEY_E2E_SIGNUP_CODE;
const authEmail = signupEmail ?? email;
const authPassword = signupPassword ?? password;

async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel(/email address/i).fill(authEmail!);
  const continueButton = page.getByRole("button", { name: /continue/i });
  if (await continueButton.isVisible().catch(() => false)) await continueButton.click();
  await page.getByLabel(/password/i).fill(authPassword!);
  await page.getByRole("button", { name: /continue|sign in/i }).click();
  await expect(page).not.toHaveURL(/sign-in/);
}

async function signUp(page: Page) {
  await page.goto("/sign-up");
  await page.getByLabel(/email address/i).fill(signupEmail!);
  await page.getByLabel(/password/i).fill(signupPassword!);
  await page.getByRole("button", { name: /continue/i }).click();
  if (signupCode) {
    await page.getByLabel(/verification code/i).fill(signupCode);
    await page.getByRole("button", { name: /continue|verify/i }).click();
  }
  await expect(page).not.toHaveURL(/sign-up/);
  await expect(page.getByRole("heading", { name: /see your money clearly/i })).toBeVisible();
}

test("Clerk sign-up route is available", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, "Set Clerk web keys to run auth UI checks.");
  await page.goto("/sign-up");
  await expect(page.getByLabel(/email address/i)).toBeVisible();
});

test("onboarding, money planning, scenarios, settings, deletion, and restart", async ({ page }) => {
  test.skip(!(signupEmail && signupPassword) && !(email && password), "Set signup credentials or FLOWMONEY_E2E_EMAIL and FLOWMONEY_E2E_PASSWORD to a dedicated disposable Clerk user.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.removeItem("flowmoney:onboarding-step-v2");
    localStorage.setItem("flowmoney:analytics-consent", "granted");
  });
  if (signupEmail && signupPassword) await signUp(page);
  else await signIn(page);
  await page.goto("/onboarding");

  // The dedicated E2E identity is expected to be new or already reset by this test.
  await expect(page.getByRole("heading", { name: /see your money clearly/i })).toBeVisible();
  await page.getByRole("button", { name: /start my setup/i }).click();
  await page.getByLabel("Primary currency").selectOption("USD");
  await page.getByRole("button", { name: /confirm currency/i }).click();

  await page.getByLabel(/amount \(USD\)/i).fill("400000");
  await page.getByRole("button", { name: /save & continue/i }).click();

  await page.getByPlaceholder("Client website project").fill("E2E consulting income");
  await page.getByPlaceholder("250000").fill("250000");
  await page.getByRole("button", { name: /save & continue/i }).click();

  await page.getByPlaceholder("Rent").fill("E2E rent");
  await page.getByPlaceholder("120000").fill("120000");
  await page.getByRole("button", { name: /save & review/i }).click();
  await expect(page.getByRole("heading", { name: /a clearer cash view is ready/i })).toBeVisible();
  await page.getByRole("button", { name: /go to my dashboard/i }).click();

  await expect(page.getByRole("heading", { name: /your money, in perspective/i })).toBeVisible();
  await expect(page.getByText("$400,000")).toBeVisible();

  await page.goto("/scenarios");
  await expect(page.getByRole("heading", { name: "Scenario result" })).toBeVisible();
  await page.getByLabel(/add a one-off expense \(USD\)/i).fill("1000");
  await expect(page.getByText("$239,000")).toBeVisible({ timeout: 10_000 });

  await page.goto("/settings");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Settings" })).toBeVisible();
  await page.getByLabel("Currency").selectOption("GBP");
  await page.getByRole("button", { name: "Save currency" }).click();
  await expect(page.getByRole("status").filter({ hasText: /currency has been updated/i })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("£400,000")).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel(/type DELETE to confirm/i).fill("DELETE");
  await page.getByRole("button", { name: /delete my FlowMoney data/i }).click();
  await expect(page).toHaveURL(/\/$/);

  await signIn(page);
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: /see your money clearly/i })).toBeVisible();
});