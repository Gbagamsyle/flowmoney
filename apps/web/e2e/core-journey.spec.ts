import { expect, test, type Page, type TestInfo } from "@playwright/test";

test.use({ trace: "off" });

const disposable = process.env.FLOWMONEY_E2E_DISPOSABLE === "true";

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
  if (await continueButton.isVisible().catch(() => false))
    await continueButton.click();
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
  await expect(
    page.getByRole("heading", { name: /see your money clearly/i }),
  ).toBeVisible();
}

test("Clerk sign-up route is available", async ({ page }) => {
  test.skip(
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    "Set Clerk web keys to run auth UI checks.",
  );
  await page.goto("/sign-up");
  await expect(page.getByLabel(/email address/i)).toBeVisible();
});

test("onboarding, statements, both planning modes, responsive pages, settings, deletion, and restart", async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
  test.skip(
    !disposable,
    "Set FLOWMONEY_E2E_DISPOSABLE=true only for a dedicated QA identity and test database.",
  );
  expect(
    Boolean(authEmail && authPassword),
    "Dedicated QA credentials are required",
  ).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.removeItem("flowmoney:onboarding-step-v2");
    localStorage.setItem("flowmoney:analytics-consent", "granted");
  });
  if (signupEmail && signupPassword) await signUp(page);
  else await signIn(page);
  await page.goto("/onboarding");

  // The dedicated E2E identity is expected to be new or already reset by this test.
  await expect(
    page.getByRole("heading", { name: /see your money clearly/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /start my setup/i }).click();
  await page.getByLabel("Primary currency").selectOption("USD");
  await page.getByRole("button", { name: /confirm currency/i }).click();

  await page.getByLabel(/amount \(USD\)/i).fill("400000");
  await page.getByRole("button", { name: /save & continue/i }).click();

  await page
    .getByPlaceholder("Client website project")
    .fill("E2E consulting income");
  await page.getByPlaceholder("250000").fill("250000");
  await page.getByRole("button", { name: /save & continue/i }).click();

  await page.getByPlaceholder("Rent").fill("E2E rent");
  await page.getByPlaceholder("120000").fill("120000");
  await page.getByRole("button", { name: /save & review/i }).click();
  await expect(
    page.getByRole("heading", { name: /a clearer cash view is ready/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /go to my dashboard/i }).click();

  await expect(
    page.getByText("Your money, in perspective", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("$400,000")).toBeVisible();

  await statementAndPlanning(page);
  await responsivePages(page, testInfo);

  await page.goto("/scenarios");
  await expect(
    page.getByRole("heading", { name: "Scenario result" }),
  ).toBeVisible();
  await page.getByLabel(/add a one-off expense \(USD\)/i).fill("1000");
  await expect(page.getByText("$239,000")).toBeVisible({ timeout: 10_000 });

  await page.goto("/settings");
  await expect(
    page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Settings" }),
  ).toBeVisible();
  await page.getByLabel("Currency").selectOption("GBP");
  await page
    .getByRole("button", { name: "Review change", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "I understand that saved amounts will not be converted.",
    })
    .check();
  await page
    .getByRole("button", { name: "Confirm currency change", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: /currency has been updated/i }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("£400,000")).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel(/type DELETE to confirm/i).fill("DELETE");
  await page.getByRole("button", { name: /delete my FlowMoney data/i }).click();
  await expect(page).toHaveURL(/\/$/);

  await signIn(page);
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: /see your money clearly/i }),
  ).toBeVisible();
});

async function statementAndPlanning(page: Page) {
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const date = `${month}-01`;
  await page.goto("/statements");
  await page.getByLabel("Statement currency").selectOption("USD");
  await page.getByLabel("Statement file").setInputFiles({
    name: "synthetic-release-qa.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `Date,Description,Amount\n${date},POS QA merchant,-12.50\n${date},Transfer from QA contributor,100.00\n${date},POS QA excluded,-4.00\n`,
    ),
  });
  const analyzed = page.waitForResponse(
    (response) =>
      /\/statements$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Analyze statement", exact: true })
    .click();
  const analysis = await analyzed;
  expect(analysis.ok()).toBe(true);
  const parsed = await analysis.json();
  expect(parsed.status).toBe("REVIEW");
  expect(parsed.transactions).toHaveLength(3);
  expect(
    parsed.transactions.every((row: { approved: boolean }) => !row.approved),
  ).toBe(true);
  await page
    .getByRole("button", { name: /View or edit individual transactions/ })
    .click();
  const excludedRow = page
    .getByRole("article")
    .filter({ hasText: "POS QA excluded" });
  await excludedRow.getByRole("checkbox").first().uncheck();
  await expect(
    page.getByRole("button", {
      name: "Import 2 selected transaction(s)",
      exact: true,
    }),
  ).toBeVisible();
  const approved = page.waitForResponse(
    (response) =>
      /\/statements\/[^/]+\/approve$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", {
      name: "Import 2 selected transaction(s)",
      exact: true,
    })
    .click();
  const imported = await approved;
  expect(imported.ok()).toBe(true);
  const history = await imported.json();
  expect(history.status).toBe("IMPORTED");
  expect(
    history.transactions.filter((row: { approved: boolean }) => row.approved),
  ).toHaveLength(2);

  await page.goto("/dashboard");
  await expect(page.getByText("$400,000", { exact: true })).toBeVisible();

  await page.goto("/planning");
  await page.getByLabel("Plan month").fill(month);
  const linkedCreated = page.waitForResponse(
    (response) =>
      /\/planning$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Create linked plan", exact: true })
    .click();
  const linkedResponse = await linkedCreated;
  expect(linkedResponse.ok()).toBe(true);
  const linkedPlan = await linkedResponse.json();
  expect(linkedPlan.fundsMinor).toBe(40000000);
  expect(linkedPlan.transactions).toHaveLength(2);
  expect(
    linkedPlan.transactions.some(
      (row: { description: string }) => row.description === "POS QA excluded",
    ),
  ).toBe(false);
  await expect(
    page.getByRole("button", { name: "Edit plan", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit plan", exact: true }).click();
  await page.getByLabel("Safety buffer", { exact: true }).fill("100");
  const saved = page.waitForResponse(
    (response) =>
      /\/planning\/[^/?]+$/.test(response.url()) &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Edit plan", exact: true }).click();
  await expect(page.getByLabel("Safety buffer", { exact: true })).toHaveValue(
    "100.00",
  );
  await page
    .getByRole("button", { name: "Cancel editing", exact: true })
    .click();

  await page.getByLabel("Plan source").selectOption("STANDALONE");
  await page.getByLabel("Standalone starting amount").fill("500");
  const created = page.waitForResponse(
    (response) =>
      /\/planning$/.test(response.url()) &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Create standalone plan", exact: true })
    .click();
  const standalone = await created;
  expect(standalone.ok()).toBe(true);
  const plan = await standalone.json();
  expect(plan.mode).toBe("STANDALONE");
  expect(plan.fundsMinor).toBe(50000);
  expect(plan.transactions).toEqual([]);
  expect(plan.obligations).toEqual([]);
  await expect(
    page.getByText("Independent from your accounts", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByLabel("Plan source").selectOption("STANDALONE");
  await expect(
    page.getByText("Independent from your accounts", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit plan", exact: true }).click();
  await expect(page.getByLabel("Standalone starting amount")).toHaveValue(
    "500.00",
  );
  await page
    .getByRole("button", { name: "Cancel editing", exact: true })
    .click();
}

async function responsivePages(page: Page, testInfo: TestInfo) {
  const views = [
    { name: "mobile", width: 390, height: 844 },
    { name: "tablet", width: 820, height: 1180 },
    { name: "desktop", width: 1440, height: 900 },
  ];
  const routes = [
    "dashboard",
    "planning",
    "statements",
    "accounts",
    "income",
    "obligations",
    "scenarios",
    "calculator",
    "settings",
  ];
  for (const viewport of views) {
    await page.setViewportSize(viewport);
    for (const theme of ["light", "dark"]) {
      await page.goto("/settings");
      await page
        .getByRole("radio", {
          name: theme === "light" ? "Light" : "Dark",
          exact: true,
        })
        .check();
      for (const route of routes) {
        await page.goto(`/${route}`);
        if (route === "statements") {
          await page
            .getByRole("button", { name: /CSV.*USD.*Saved to history/ })
            .click();
          await expect(
            page.getByText("Category totals", { exact: false }).first(),
          ).toBeVisible();
        }
        await expect(page.locator("main")).toBeVisible();
        await expect(
          page.locator("main").getByRole("heading").first(),
        ).toBeVisible();
        await expect
          .poll(
            () =>
              page.evaluate(
                () =>
                  document.documentElement.scrollWidth <= window.innerWidth + 1,
              ),
            { message: `${route} overflows at ${viewport.name}/${theme}` },
          )
          .toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`${route}-${viewport.name}-${theme}.png`),
          fullPage: true,
        });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
}
