const logoTargetStorageKey = "chaodesi_logo_navigation_target";
const homeTarget = "/home";

export function getStoredLogoNavigationTarget() {
  return homeTarget;
}

export function rememberLogoNavigationContext(pathname: string) {
  if (typeof window === "undefined") {
    return homeTarget;
  }

  void pathname;
  window.sessionStorage.setItem(logoTargetStorageKey, homeTarget);
  return homeTarget;
}

export function useLogoNavigationTarget() {
  return homeTarget;
}
