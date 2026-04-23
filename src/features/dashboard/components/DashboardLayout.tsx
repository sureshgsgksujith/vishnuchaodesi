import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import UserHomeHeader from "../../home/ui/UserHomeHeader";
import DashboardFooter from "./DashboardFooter";
import DashboardSidebar from "./DashboardSidebar";
import DashboardSupportWidget from "./DashboardSupportWidget";
import {
  clearStoredProfileSnapshot,
  getStoredDashboardIdentity,
  PROFILE_UPDATED_EVENT,
} from "../utils/profileStorage";

type DashboardLayoutProps = {
  children: ReactNode;
  rightRail?: ReactNode;
  mainContentClassName?: string;
  showBottomCta?: boolean;
};

export default function DashboardLayout({
  children,
  rightRail,
  mainContentClassName = "",
  showBottomCta = true,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(getStoredDashboardIdentity());
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  useEffect(() => {
    const syncIdentity = () => setIdentity(getStoredDashboardIdentity());

    window.addEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, syncIdentity);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("customer_token");
    localStorage.removeItem("userId");
    localStorage.removeItem("customerCode");
    localStorage.removeItem("fullName");
    localStorage.removeItem("userType");
    clearStoredProfileSnapshot();
    navigate("/login");
    window.location.reload();
  };

  const handleSupportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSupportOpen(false);
  };

  const openMobileMenu = () => {
    window.dispatchEvent(new Event("chaodesi:open-mobile-menu"));
  };

  return (
    <>
      <UserHomeHeader />

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

      <DashboardSupportWidget
        isOpen={isSupportOpen}
        onOpen={() => setIsSupportOpen(true)}
        onClose={() => setIsSupportOpen(false)}
        onSubmit={handleSupportSubmit}
      />

      {showBottomCta ? (
        <section>
          <div className="full-bot-book">
            <div className="container">
              <div className="row">
                <div className="bot-book">
                  <div className="col-md-12 bb-text">
                    <h4>List your business for FREE</h4>
                    <p>
                      There are many variations of passages of Lorem Ipsum
                      available, but the majority have suffered alteration in
                      some form, by injected humour.
                    </p>
                    <Link to="/pricing-details">
                      Add my business
                      <i className="material-icons">arrow_forward</i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <DashboardFooter
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenMobileMenu={openMobileMenu}
      />
    </>
  );
}
