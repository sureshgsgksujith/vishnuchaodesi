import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import DashboardRightRail from "../components/DashboardRightRail";
import { dashboardNotifications } from "../mock/dashboardMockData";

export default function NotificationsPage() {
  return (
    <DashboardLayout rightRail={<DashboardRightRail />}>
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Notifications</span>
        <div className="ud-cen-s2">
          <h2>All Notifications</h2>
          <div className="db-noti">
            <ul>
              {dashboardNotifications.map((item) => (
                <li key={item.id}>
                  <div>
                    {item.profileHref ? (
                      <>
                        <Link to={item.profileHref} target="_blank"></Link>{" "}
                        {item.message}
                      </>
                    ) : (
                      item.message
                    )}
                  </div>
                  {item.time ? <span>{item.time}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
