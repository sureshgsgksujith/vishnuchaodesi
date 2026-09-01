import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "./DashboardFooter";
import DashboardSidebar from "./DashboardSidebar";
import {
  getStoredDashboardIdentity,
  PROFILE_UPDATED_EVENT,
} from "../utils/profileStorage";
import { clearCustomerSession } from "../../auth/utils/customerSession";

type DashboardLayoutProps = {
  children: ReactNode;
  rightRail?: ReactNode;
  mainContentClassName?: string;
  showHeader?: boolean;
  showBottomCta?: boolean;
};

export default function DashboardLayout({
  children,
  rightRail,
  mainContentClassName = "",
  showHeader = true,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(getStoredDashboardIdentity());

  useEffect(() => {
    const syncIdentity = () => setIdentity(getStoredDashboardIdentity());

    window.addEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
  }, []);

  const handleLogout = () => {
    clearCustomerSession();
    navigate("/login");
    window.location.reload();
  };

  const openMobileMenu = () => {
    window.dispatchEvent(new Event("chaodesi:open-mobile-menu"));
  };

  return (
    <>
      {showHeader ? <UserHomeHeader /> : null}

      <section className="ud">
        <div className="ud-inn">
          <DashboardSidebar
            fullName={identity.fullName}
            profileImageUrl={identity.profileImageUrl}
            joinDate={identity.joinDate}
            onLogout={handleLogout}
          />

          <div className="ud-main">
            <div className={`ud-main-inn ${mainContentClassName}`.trim()}>
              {children}
              {rightRail}
            </div>
          </div>
        </div>
      </section>

      <DashboardFooter
        onOpenMobileMenu={openMobileMenu}
      />
    </>
  );
}
