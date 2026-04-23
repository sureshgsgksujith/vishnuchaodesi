export type DashboardTabItem = {
  id: string;
  label: string;
};

type DashboardTabsProps = {
  tabs: DashboardTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
};

export default function DashboardTabs({
  tabs,
  activeTab,
  onChange,
}: DashboardTabsProps) {
  return (
    <ul className="nav nav-tabs">
      {tabs.map((tab) => (
        <li key={tab.id} className="nav-item">
          <a
            href={`#${tab.id}`}
            className={`nav-link ${activeTab === tab.id ? "active" : ""}`.trim()}
            onClick={(event) => {
              event.preventDefault();
              onChange(tab.id);
            }}
          >
            {tab.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
