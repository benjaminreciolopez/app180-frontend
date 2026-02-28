import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { monitorApiCalls } from "./helpers/api-monitor";

test.describe("Admin pages — cargan con sesion activa", () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  const adminPages: { name: string; path: string; selector: string }[] = [
    { name: "Dashboard", path: "/admin/dashboard", selector: "body" },
    { name: "Empleados", path: "/admin/empleados", selector: "body" },
    { name: "Clientes", path: "/admin/clientes", selector: "body" },
    { name: "Fichajes", path: "/admin/fichajes", selector: "body" },
    { name: "Facturacion", path: "/admin/facturacion", selector: "body" },
    { name: "Gastos", path: "/admin/gastos", selector: "body" },
    { name: "Nominas", path: "/admin/nominas", selector: "body" },
    { name: "Entregas nominas", path: "/admin/nominas/entregas", selector: "body" },
    { name: "Jornadas", path: "/admin/jornadas", selector: "body" },
    { name: "Turnos", path: "/admin/turnos", selector: "body" },
    { name: "Kioscos", path: "/admin/kioscos", selector: "body" },
    { name: "Centros trabajo", path: "/admin/centros-trabajo", selector: "body" },
    { name: "Calendario", path: "/admin/calendario", selector: "body" },
    { name: "Configuracion", path: "/admin/configuracion", selector: "body" },
    { name: "Partes dia", path: "/admin/partes-dia", selector: "body" },
    { name: "Contabilidad asientos", path: "/admin/contabilidad/asientos", selector: "body" },
    { name: "Contabilidad balance", path: "/admin/contabilidad/balance", selector: "body" },
    { name: "Contabilidad PyG", path: "/admin/contabilidad/pyg", selector: "body" },
    { name: "Contabilidad mayor", path: "/admin/contabilidad/mayor", selector: "body" },
    { name: "Contabilidad cuentas", path: "/admin/contabilidad/cuentas", selector: "body" },
    { name: "Auditoria", path: "/admin/auditoria", selector: "body" },
    { name: "Cobros/Pagos", path: "/admin/cobros-pagos", selector: "body" },
    { name: "Fiscal", path: "/admin/fiscal", selector: "body" },
    { name: "Sugerencias", path: "/admin/sugerencias", selector: "body" },
    { name: "Mi asesoria", path: "/admin/mi-asesoria", selector: "body" },
  ];

  for (const { name, path, selector } of adminPages) {
    test(`${name} (${path}) carga sin errores 404`, async ({ page }) => {
      const monitor = monitorApiCalls(page);

      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);

      // Page loaded (not redirected to login)
      expect(page.url()).not.toContain("/login");

      // Content rendered
      await expect(page.locator(selector)).not.toBeEmpty();

      // No 404 API errors (allow 401 which may happen on first load before auth propagates)
      const apiErrors = monitor.getUnexpectedErrors([401]);
      const errors404 = apiErrors.filter((e) => e.status === 404);
      if (errors404.length > 0) {
        console.error(`404 errors on ${path}:`, errors404);
      }
      expect(errors404).toHaveLength(0);
    });
  }
});
