import { useEffect } from "react";
import {
  buildCustomerPortalUrl,
  clearCustomerSession,
  getCustomerRouteFromWindow,
  getCustomerLastActivityAt,
  getCustomerToken,
  isCustomerAuthenticated,
  isCustomerSessionIdleExpired,
  markCustomerSessionActivity,
  redirectToCustomerHomeAfterSessionPopup,
} from "../utils/customerSession";

const activityEvents = [
  "click",
  "keydown",
  "mousedown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

const idleCheckIntervalMs = 15 * 1000;
const activityWriteThrottleMs = 1000;

export function useCustomerIdleTimeout() {
  useEffect(() => {
    let lastActivityWriteAt = 0;
    let isIdlePopupOpen = false;

    const expireIdleSession = () => {
      if (isIdlePopupOpen) {
        return;
      }

      isIdlePopupOpen = true;
      clearCustomerSession();
      window.alert("Your session has expired after 30 minutes of inactivity. Please sign in again.");

      const currentPath = getCustomerRouteFromWindow().split(/[?#]/, 1)[0];

      if (currentPath === "/home" || currentPath === "/") {
        window.location.reload();
      } else {
        window.location.replace(buildCustomerPortalUrl("/home"));
      }
    };

    const checkSession = () => {
      if (!getCustomerToken()) {
        return;
      }

      if (!isCustomerAuthenticated()) {
        redirectToCustomerHomeAfterSessionPopup();
        return;
      }

      if (isCustomerSessionIdleExpired()) {
        expireIdleSession();
      }
    };

    const handleActivity = () => {
      if (!getCustomerToken()) {
        return;
      }

      if (!isCustomerAuthenticated() || isCustomerSessionIdleExpired()) {
        checkSession();
        return;
      }

      const now = Date.now();

      if (now - lastActivityWriteAt >= activityWriteThrottleMs) {
        lastActivityWriteAt = now;
        markCustomerSessionActivity();
      }
    };

    if (isCustomerAuthenticated() && !getCustomerLastActivityAt()) {
      markCustomerSessionActivity();
    }

    checkSession();

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    window.addEventListener("focus", handleActivity);
    window.addEventListener("storage", checkSession);

    const intervalId = window.setInterval(checkSession, idleCheckIntervalMs);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener("focus", handleActivity);
      window.removeEventListener("storage", checkSession);
      window.clearInterval(intervalId);
    };
  }, []);
}
