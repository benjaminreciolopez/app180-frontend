import { test, expect } from "@playwright/test";
import { loginAsEmpleado } from "./helpers/auth";
import { monitorApiCalls } from "./helpers/api-monitor";

test.describe("Empleado pages — cargan con sesion activa", () => {

  test.beforeEach(async ({ page }) => {
    await loginAsEmpleado(page);
  });

  const empleadoPages: { name: string; path: string }[] = [
    { name: "Dashboard", path: "/empleado/dashboard" },
    { name: "Calendario", path: "/empleado/calendario" },
    { name: "Nominas", path: "/empleado/nominas" },
    { name: "Notificaciones", path: "/empleado/notificaciones" },
    { name: "Trabajos", path: "/empleado/trabajos" },
    { name: "Diagnostico", path: "/empleado/diagnostico" },
  ];

  for (const { name, path } of empleadoPages) {
    test(`${name} (${path}) carga sin errores 404`, async ({ page }) => {
      const monitor = monitorApiCalls(page);

      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Not redirected to login
      expect(page.url()).not.toContain("/login");

      // Content rendered
      await expect(page.locator("body")).not.toBeEmpty();

      // No 404 errors
      const apiErrors = monitor.getUnexpectedErrors([401]);
      const errors404 = apiErrors.filter((e) => e.status === 404);
      if (errors404.length > 0) {
        console.error(`404 errors on ${path}:`, errors404);
      }
      expect(errors404).toHaveLength(0);
    });
  }
});
