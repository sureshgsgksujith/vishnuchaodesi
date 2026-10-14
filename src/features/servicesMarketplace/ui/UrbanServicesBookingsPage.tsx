import DashboardLayout from "../../dashboard/components/DashboardLayout";
import { MyBookings } from "./ServicesMarketplacePlaceholderPage";
import "./servicesDiscovery.css";

export default function UrbanServicesBookingsPage() {
  return (
    <DashboardLayout mainContentClassName="ud-no-rhs">
      <div className="services-marketplace-page services-bookings-dashboard-page">
        <MyBookings />
      </div>
    </DashboardLayout>
  );
}
