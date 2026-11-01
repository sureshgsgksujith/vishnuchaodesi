import { useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") as ProviderTab | null;
  const activeTab: ProviderTab = tabs.some((tab) => tab.id === requestedTab) ? requestedTab! : "profile";
  return (
    <div className="provider-workspace">
      <div className="provider-workspace-body">
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
