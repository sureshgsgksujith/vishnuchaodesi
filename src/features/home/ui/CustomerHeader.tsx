import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { isCustomerAuthenticated } from "../../auth/utils/customerSession";
import HomeHeader from "./HomeHeader";

const UserHomeHeader = lazy(() => import("./UserHomeHeader"));

export default function CustomerHeader() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(isCustomerAuthenticated);

  useEffect(() => {
    const syncAuthState = () => setIsAuthenticated(isCustomerAuthenticated());

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
