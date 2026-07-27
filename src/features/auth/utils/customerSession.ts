import { clearStoredProfileSnapshot, readStoredProfileSnapshot } from "../../dashboard/utils/profileStorage";
import { clearHomeSelectedLocation } from "../../home/hooks/useHomeSelectedLocation";

const CUSTOMER_AUTH_KEYS = [
  "token",
  "customer_token",
  "userId",
  "customerCode",
  "fullName",
  "email",
  "mobileNumber",
  "customer_name",
  "userType",
];

const CUSTOMER_LAST_ACTIVITY_KEY = "chaodesi.customer.lastActivityAt";

export const CUSTOMER_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function getCustomerRouteFromWindow() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function buildCustomerPortalUrl(route = "/home") {
  if (typeof window === "undefined") {
    return route;
  }

  const safeRoute = route.startsWith("/") && !route.startsWith("//") ? route : "/home";
  return `${window.location.origin}${safeRoute}`;
}

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

export function markCustomerSessionActivity() {
  if (typeof window === "undefined" || !getCustomerToken()) {
    return;
  }

  localStorage.setItem(CUSTOMER_LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getCustomerLastActivityAt() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = Number(localStorage.getItem(CUSTOMER_LAST_ACTIVITY_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function isCustomerSessionIdleExpired() {
  if (!getCustomerToken()) {
    return false;
  }

  const lastActivityAt = getCustomerLastActivityAt();

  if (!lastActivityAt) {
    markCustomerSessionActivity();
    return false;
  }

  return Date.now() - lastActivityAt >= CUSTOMER_IDLE_TIMEOUT_MS;
}

export function getCurrentCustomerUserId() {
  if (typeof window === "undefined") {
    return null;
  }

  const userId = Number(localStorage.getItem("userId"));
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

export function getCustomerContactDefaults() {
  if (typeof window === "undefined") {
    return { fullName: "", email: "", mobileNumber: "" };
  }

  const snapshot = readStoredProfileSnapshot();

  return {
    fullName:
      snapshot?.fullName ||
      localStorage.getItem("fullName") ||
      localStorage.getItem("customer_name") ||
      "",
    email: snapshot?.email || localStorage.getItem("email") || "",
    mobileNumber: snapshot?.mobileNumber || localStorage.getItem("mobileNumber") || "",
  };
}

export function clearCustomerSession() {
  if (typeof window === "undefined") {
    return;
  }

  CUSTOMER_AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(CUSTOMER_LAST_ACTIVITY_KEY);
  clearStoredProfileSnapshot();
  clearHomeSelectedLocation();
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

  const currentPath = getCustomerRouteFromWindow().split(/[?#]/, 1)[0];

  if (currentPath !== "/home" && currentPath !== "/") {
    window.location.replace(buildCustomerPortalUrl("/home"));
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
