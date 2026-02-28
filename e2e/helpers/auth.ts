import { Page } from "@playwright/test";
import jwt from "jsonwebtoken";

// JWT secret from backend .env (same as production)
const JWT_SECRET = "app180_production_secret_key_2026";
const API_URL = process.env.E2E_API_URL || "https://api.contendo.es";

// Real user data from database
const ADMIN_USER = {
  id: "9243cfc9-27ae-400f-b79b-4ab20141d0d2",
  email: "susanaybenjamin@gmail.com",
  role: "admin" as const,
  nombre: "Benjamin Recio",
  empresa_id: "8ea0cef5-795c-4c98-bc5e-63d546a452f8",
  empleado_id: "a1f970bc-af4a-4e09-b013-54be0a60beab",
  avatar_url: null,
  modulos: {
    pagos: true, fiscal: true, clientes: true, fichajes: true,
    worklogs: true, empleados: true, calendario: true, facturacion: true,
    calendario_import: false,
  },
  password_forced: false,
};

/**
 * Generate a valid JWT token signed with the production secret.
 * No API call needed — works even if the user has no password (Google OAuth only).
 */
function generateAdminToken(): string {
  return jwt.sign(
    {
      id: ADMIN_USER.id,
      email: ADMIN_USER.email,
      role: ADMIN_USER.role,
      nombre: ADMIN_USER.nombre,
      empresa_id: ADMIN_USER.empresa_id,
      empleado_id: ADMIN_USER.empleado_id,
      avatar_url: ADMIN_USER.avatar_url,
      modulos: ADMIN_USER.modulos,
      device_hash: "e2e-playwright",
      password_forced: false,
    },
    JWT_SECRET,
    { expiresIn: "10h" }
  );
}

/**
 * Generate a JWT with role=empleado for the same user (they are also an employee).
 */
function generateEmpleadoToken(): string {
  return jwt.sign(
    {
      id: ADMIN_USER.id,
      email: ADMIN_USER.email,
      role: "empleado",
      nombre: ADMIN_USER.nombre,
      empresa_id: ADMIN_USER.empresa_id,
      empleado_id: ADMIN_USER.empleado_id,
      avatar_url: ADMIN_USER.avatar_url,
      device_hash: "e2e-playwright",
      password_forced: false,
    },
    JWT_SECRET,
    { expiresIn: "10h" }
  );
}

/**
 * Inject auth token + user into browser sessionStorage and navigate to dashboard.
 */
async function injectAuth(page: Page, token: string, user: Record<string, unknown>, dashboardUrl: string) {
  // Navigate to app origin first so we can set sessionStorage
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await page.evaluate(
    ({ token, user }) => {
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("user", JSON.stringify(user));
    },
    { token, user }
  );

  // Navigate to dashboard — AuthInit will find the token
  await page.goto(dashboardUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
}

export async function loginAsAdmin(page: Page) {
  const token = generateAdminToken();
  const user = { ...ADMIN_USER };
  await injectAuth(page, token, user, "/admin/dashboard");
  return { token, user };
}

export async function loginAsEmpleado(page: Page) {
  const token = generateEmpleadoToken();
  const user = { ...ADMIN_USER, role: "empleado" };
  await injectAuth(page, token, user, "/empleado/dashboard");
  return { token, user };
}

export function getApiUrl(): string {
  return API_URL;
}

export function getAdminToken(): string {
  return generateAdminToken();
}

export function getEmpleadoToken(): string {
  return generateEmpleadoToken();
}
