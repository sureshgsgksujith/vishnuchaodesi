import { Link, useLocation } from "react-router-dom";
import {
  dashboardPrimaryNavItem,
  dashboardNavSections,
  type DashboardNavItem,
  type DashboardNavSection,
} from "../config/dashboardData";

type DashboardSidebarProps = {
  fullName: string;
  profileImageUrl?: string;
  joinDate?: string;
  onLogout: () => void;
};

export default function DashboardSidebar({
  fullName,
  profileImageUrl = "/template-17/images/user/1.jpg",
  joinDate = "Join on 17, Apr 2026",
  onLogout,
}: DashboardSidebarProps) {
  const location = useLocation();

  return (
    <div className="ud-lhs">
      <div className="ud-lhs-s1">
        <img
          src={profileImageUrl}
          alt={fullName}
          loading="lazy"
        />
        <div className="ud-lhs-pro-bio">
          <h4>{fullName}</h4>
          <b>{joinDate}</b>
          <Link className="ud-lhs-view-pro" to="/profile" target="_blank">
            My Profile
          </Link>
        </div>
      </div>

      <div className="ud-lhs-s2 row">
        <ul>
          {dashboardNavSections.map((section) => (
            <SidebarSection
              key={section.title || section.items[0]?.label}
              section={section}
              currentPath={location.pathname}
              onLogout={onLogout}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function SidebarSection({
  section,
  currentPath,
  onLogout,
}: {
  section: DashboardNavSection;
  currentPath: string;
  onLogout: () => void;
}) {
  return (
    <>
      {section.items.map((item, index) => {
        const isActive = item.href === currentPath;

        return (
          <li key={item.label}>
            {section.title && index === 0 ? <h4>{section.title}</h4> : null}

            {item.isLogout ? (
              <a
                href="#!"
                onClick={(event) => {
                  event.preventDefault();
                  onLogout();
                }}
              >
                <SidebarIcon item={item} />
                {item.label}
              </a>
            ) : (
              <Link
                to={item.href || "#"}
                target={item.target || "_self"}
                className={isActive ? "db-lact" : undefined}
              >
                <SidebarIcon item={item} />
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </>
  );
}

function SidebarIcon({ item }: { item: DashboardNavItem }) {
  return (
    <img
      src={item.icon}
      alt={item.label}
      loading="eager"
      width={28}
      height={28}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
      }}
      onError={(event) => {
        const image = event.currentTarget;

        if (image.dataset.fallbackApplied === "true") {
          return;
        }

        image.dataset.fallbackApplied = "true";
        image.src = dashboardPrimaryNavItem.icon;
      }}
    />
  );
}
