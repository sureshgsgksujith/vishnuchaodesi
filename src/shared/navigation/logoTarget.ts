import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const logoTargetStorageKey = "chaodesi_logo_navigation_target";
const homeTarget = "/home";
const dashboardTarget = "/dashboard";

export function getStoredLogoNavigationTarget() {
  if (typeof window === "undefined") {
    return homeTarget;
  }

  return window.sessionStorage.getItem(logoTargetStorageKey) === dashboardTarget
    ? dashboardTarget
    : homeTarget;
}

export function rememberLogoNavigationContext(pathname: string) {
  if (typeof window === "undefined") {
    return getStoredLogoNavigationTarget();
  }

  const nextTarget =
    pathname === "/" || pathname === homeTarget
      ? homeTarget
      : pathname.startsWith(dashboardTarget)
        ? dashboardTarget
        : getStoredLogoNavigationTarget();

  window.sessionStorage.setItem(logoTargetStorageKey, nextTarget);
  return nextTarget;
}

export function useLogoNavigationTarget() {
  const location = useLocation();
  const [logoTarget, setLogoTarget] = useState(getStoredLogoNavigationTarget);

  useEffect(() => {
    setLogoTarget(rememberLogoNavigationContext(location.pathname));
  }, [location.pathname]);

  return logoTarget;
}
