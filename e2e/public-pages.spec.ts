import { test, expect } from "@playwright/test";

test.describe("Paginas publicas — cargan sin autenticacion", () => {
  test("Landing / carga correctamente", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Login /login muestra formulario", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h1")).toContainText("CONTENDO");
    // El formulario email esta oculto por defecto, el boton de Google es visible
    await expect(page.locator("body")).toContainText("Acceso con email");
  });

  test("Login — formulario email se despliega al hacer click", async ({ page }) => {
    await page.goto("/login");
    await page.click("text=Acceso con email");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("Privacidad /privacidad carga", async ({ page }) => {
    const res = await page.goto("/privacidad");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Terminos /terminos carga", async ({ page }) => {
    const res = await page.goto("/terminos");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Aviso legal /aviso-legal carga", async ({ page }) => {
    const res = await page.goto("/aviso-legal");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Verificar CSV /verificar/test-code carga sin error 500", async ({ page }) => {
    const res = await page.goto("/verificar/test-code");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Cumplimiento legal /cumplimiento-legal carga", async ({ page }) => {
    const res = await page.goto("/cumplimiento-legal");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
