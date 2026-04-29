import { clearStoredProfileSnapshot } from "../../dashboard/utils/profileStorage";

const CUSTOMER_AUTH_KEYS = [
  "token",
  "customer_token",
  "userId",
  "customerCode",
  "fullName",
  "customer_name",
  "userType",
];

export function getCustomerToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("token") || localStorage.getItem("customer_token");
}

export function isCustomerTokenExpired(token: string | null) {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  const expiresAt = payload?.exp;

  if (typeof expiresAt !== "number") {
    return false;
  }

  return expiresAt * 1000 <= Date.now();
}

export function isCustomerAuthenticated() {
  return !isCustomerTokenExpired(getCustomerToken());
}

export function clearCustomerSession() {
  if (typeof window === "undefined") {
    return;
  }

  CUSTOMER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  clearStoredProfileSnapshot();
}

let isSessionPopupOpen = false;

export function redirectToCustomerHomeAfterSessionPopup() {
  if (typeof window === "undefined") {
    return;
  }

  clearCustomerSession();

  if (isSessionPopupOpen) {
    return;
  }

  isSessionPopupOpen = true;
  window.alert("Your session has expired. Please sign in again to continue.");

  if (window.location.pathname !== "/home" && window.location.pathname !== "/") {
    window.location.replace("/home");
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "="));
    const parsedPayload = JSON.parse(decodedPayload);
    return isRecord(parsedPayload) ? parsedPayload : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
