import { Page } from "@playwright/test";

interface ApiError {
  url: string;
  status: number;
  method: string;
}

/**
 * Monitors API calls made by the page to the BACKEND and collects errors (4xx, 5xx).
 * Only captures calls to api.contendo.es / app180-backend / localhost:10000.
 * Does NOT capture frontend page navigation (contendo.es/admin/...).
 */
export function monitorApiCalls(page: Page) {
  const errors: ApiError[] = [];
  const jsErrors: string[] = [];

  page.on("response", (res) => {
    const url = res.url();

    // Only track calls to the API backend (not frontend navigation)
    const isApiCall =
      url.includes("api.contendo.es") ||
      url.includes("app180-backend") ||
      url.includes("localhost:10000") ||
      url.includes("localhost:5000");

    if (isApiCall && res.status() >= 400) {
      errors.push({
        url: url.replace(/https?:\/\/[^/]+/, ""),
        status: res.status(),
        method: res.request().method(),
      });
    }
  });

  page.on("pageerror", (error) => {
    jsErrors.push(error.message);
  });

  return {
    getErrors: () => errors,
    getJsErrors: () => jsErrors,
    hasErrors: () => errors.length > 0,
    getUnexpectedErrors: (allowedStatuses: number[] = []) =>
      errors.filter((e) => !allowedStatuses.includes(e.status)),
  };
}
