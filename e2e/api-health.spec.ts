import { test, expect } from "@playwright/test";
import { getAdminToken, getEmpleadoToken, getApiUrl } from "./helpers/auth";

const API_URL = getApiUrl();

test.describe("API Health — endpoints responden correctamente", () => {
  // ── Tests sin autenticacion ──

  test("GET / responde 200 (root)", async ({ request }) => {
    const res = await request.get(`${API_URL}/`);
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("API APP180");
  });

  test("POST /auth/login con credenciales invalidas responde 400", async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/login`, {
      data: { email: "noexiste@fake.com", password: "wrong", device_hash: "test", user_agent: "test" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET /employees sin token responde 401", async ({ request }) => {
    const res = await request.get(`${API_URL}/employees`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/admin/empleados sin token responde 401 (ruta no existe, middleware intercepta)", async ({ request }) => {
    const res = await request.get(`${API_URL}/api/admin/empleados`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/admin/empleados con token — ruta NO existe (404)", async ({ request }) => {
    const adminToken = getAdminToken();
    const res = await request.get(`${API_URL}/api/admin/empleados`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status()).toBe(404);
  });

  // ── Tests con autenticacion admin ──

  test.describe("Con token admin", () => {
    let adminToken: string;

    test.beforeAll(async () => {
      adminToken = getAdminToken();
    });

    test("GET /employees con token admin responde 200", async ({ request }) => {
      const res = await request.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status()).toBe(200);
    });

    test("GET /fichajes con token admin responde 200", async ({ request }) => {
      const res = await request.get(`${API_URL}/fichajes`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status()).toBe(200);
    });

    test("GET /api/admin/nominas con token admin responde 200", async ({ request }) => {
      const res = await request.get(`${API_URL}/api/admin/nominas?year=2026&month=1`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status()).toBe(200);
    });

    test("GET /api/kiosk/devices con token admin responde 200", async ({ request }) => {
      const res = await request.get(`${API_URL}/api/kiosk/devices`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status()).toBe(200);
    });
  });

  // ── Tests con autenticacion empleado ──

  test.describe("Con token empleado", () => {
    let empleadoToken: string;

    test.beforeAll(async () => {
      empleadoToken = getEmpleadoToken();
    });

    test("GET /empleado/nominas con token empleado responde 200", async ({ request }) => {
      const res = await request.get(`${API_URL}/empleado/nominas`, {
        headers: { Authorization: `Bearer ${empleadoToken}` },
      });
      expect(res.status()).toBe(200);
    });

    test("GET /admin/notificaciones con token admin responde 200", async ({ request }) => {
      // Notificaciones uses admin token since empleado notif route has roleRequired
      const adminToken = getAdminToken();
      const res = await request.get(`${API_URL}/admin/notificaciones`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status()).toBe(200);
    });
  });
});
