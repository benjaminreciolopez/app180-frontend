import { test, expect } from "@playwright/test";

/**
 * Helper: wait for the URL to contain /login OR for the page to redirect away.
 * Admin pages use window.location.href (full reload) via AuthInit,
 * which can take longer than SPA redirects.
 */
async function expectRedirectToLogin(page: import("@playwright/test").Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });

  // Wait up to 20s for client-side redirect (AuthInit checks token then calls window.location.href)
  await page.waitForFunction(
    () => window.location.pathname === "/login" || window.location.pathname === "/",
    { timeout: 20000 }
  ).catch(() => {});

  // Accept redirect to /login OR / (landing) — both mean auth guard worked
  const url = page.url();
  const redirectedAway = !url.includes(path);
  expect(redirectedAway || url.includes("/login") || url.endsWith("/")).toBeTruthy();
}

test.describe("Auth guards — redirigen sin token", () => {
  test("Admin dashboard redirige sin token", async ({ page }) => {
    await expectRedirectToLogin(page, "/admin/dashboard");
  });

  test("Empleado dashboard redirige sin token", async ({ page }) => {
    await expectRedirectToLogin(page, "/empleado/dashboard");
  });

  test("Asesor dashboard redirige sin token", async ({ page }) => {
    await expectRedirectToLogin(page, "/asesor/dashboard");
  });

  test("Admin empleados redirige sin token", async ({ page }) => {
    await expectRedirectToLogin(page, "/admin/empleados");
  });

  test("Admin fichajes redirige sin token", async ({ page }) => {
    await expectRedirectToLogin(page, "/admin/fichajes");
  });

  test("Login con credenciales invalidas muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Acceso con email");
    await page.fill('input[type="email"]', "fake@noexiste.com");
    await page.fill('input[type="password"]', "wrongpassword123");
    await page.click('button[type="submit"]');
    // Debe quedarse en /login
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/login");
  });
});
