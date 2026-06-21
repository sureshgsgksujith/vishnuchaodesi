import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  clearCustomerSession,
  getCustomerToken,
  isCustomerAuthenticated,
} from "../../auth/utils/customerSession";
import HomeHeader from "./HomeHeader";

const UserHomeHeader = lazy(() => import("./UserHomeHeader"));

export default function CustomerHeader() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(isCustomerAuthenticated);

  useEffect(() => {
    const syncAuthState = () => {
      const authenticated = isCustomerAuthenticated();

      if (!authenticated && getCustomerToken()) {
        clearCustomerSession();
      }

      setIsAuthenticated(authenticated);
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
    };
  }, [location.pathname, location.search]);

  return isAuthenticated ? (
    <Suspense fallback={<div style={{ minHeight: 72 }} />}>
      <UserHomeHeader />
    </Suspense>
  ) : (
    <HomeHeader />
  );
}
