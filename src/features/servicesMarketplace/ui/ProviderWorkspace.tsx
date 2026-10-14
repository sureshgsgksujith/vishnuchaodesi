import { useState } from "react";
import ProviderOnboarding from "./ProviderOnboarding";
import { ProviderVerificationPanel } from "./ProviderVerificationPanel";
import { ProviderQualificationsPanel } from "./ProviderQualificationsPanel";
import { ProviderAvailabilityPanel } from "./ProviderAvailabilityPanel";
import ProviderJobOffers from "./ProviderJobOffers";
import ProviderJobWorkspace from "./ProviderJobWorkspace";
import "./providerWorkspace.css";

type ProviderTab = "profile" | "verification" | "services" | "availability" | "offers" | "jobs";

const tabs: Array<{ id: ProviderTab; label: string; icon: string }> = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "verification", label: "Verification", icon: "verified_user" },
  { id: "services", label: "My services", icon: "home_repair_service" },
  { id: "availability", label: "Availability", icon: "date_range" },
  { id: "offers", label: "Job offers", icon: "notifications_active" },
  { id: "jobs", label: "Active jobs", icon: "work" },
];

export default function ProviderWorkspace() {
  const [activeTab, setActiveTab] = useState<ProviderTab>("profile");
  return (
    <div className="provider-workspace">
      <header className="provider-workspace-title">
        <div><span>URBAN SERVICES</span><h1>Provider workspace</h1><p>Manage your profile, schedule and service jobs.</p></div>
      </header>
      <div className="provider-workspace-body">
        <nav className="provider-workspace-tabs" aria-label="Provider workspace sections">
          <small>WORKSPACE MENU</small>
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? "is-active" : ""} onClick={() => setActiveTab(tab.id)}>
              <span className="material-icons" aria-hidden="true">{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <section className="provider-workspace-content">
          {activeTab === "profile" ? <ProviderOnboarding /> : null}
          {activeTab === "verification" ? <ProviderVerificationPanel /> : null}
          {activeTab === "services" ? <ProviderQualificationsPanel /> : null}
          {activeTab === "availability" ? <ProviderAvailabilityPanel /> : null}
          {activeTab === "offers" ? <ProviderJobOffers /> : null}
          {activeTab === "jobs" ? <ProviderJobWorkspace /> : null}
        </section>
      </div>
    </div>
  );
}
